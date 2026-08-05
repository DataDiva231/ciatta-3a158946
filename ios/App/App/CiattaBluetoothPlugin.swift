import Capacitor
import CoreBluetooth
import Foundation

/**
 * Native side of the Arc BLE bridge (see src/lib/native/
 * ciatta-bluetooth-plugin.ts). iOS's WKWebView has no Web Bluetooth API at
 * all, so `navigator.bluetooth` doesn't exist on-device — this plugin is
 * shimmed in as a drop-in replacement for it. Every method here is a plain,
 * UUID/deviceId-keyed GATT primitive; the JS side reassembles them into the
 * Device/Server/Service/Characteristic shape `src/lib/ble/web-bluetooth.ts`
 * already defines, so `bluetooth-manager.ts` and everything downstream
 * (observations, sessions, intelligence) needed zero changes.
 *
 * One CBCentralManager for the process; peripherals are tracked by their
 * CBUUID identifier string once discovered or reconnected.
 */
@objc(CiattaBluetoothPlugin)
public class CiattaBluetoothPlugin: CAPPlugin, CAPBridgedPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    public let identifier = "CiattaBluetoothPlugin"
    public let jsName = "CiattaBluetooth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getKnownDevices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectKnown", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCharacteristic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startNotifications", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopNotifications", returnType: CAPPluginReturnPromise),
    ]

    private var central: CBCentralManager!
    private let knownDevicesKey = "ciatta.ble.known-devices"

    /// Peripherals CoreBluetooth currently knows about, by UUID string.
    private var peripherals: [String: CBPeripheral] = [:]
    /// Cached characteristics, keyed "deviceId|serviceUuid|characteristicUuid".
    private var characteristics: [String: CBCharacteristic] = [:]
    private var rssiTimers: [String: Timer] = [:]

    private var scanTimeout: DispatchWorkItem?
    private var scanFilters: (services: [CBUUID], namePrefixes: [String], acceptAll: Bool)?
    private var pendingRequest: CAPPluginCall?
    private var pendingConnects: [String: CAPPluginCall] = [:]
    /// deviceId -> the serviceUuid its in-flight discoverServices() call was for.
    private var pendingServiceDiscovery: [String: String] = [:]

    override public func load() {
        central = CBCentralManager(delegate: self, queue: nil)
    }

    // MARK: - Availability / known devices

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": central.state == .poweredOn])
    }

    @objc func getKnownDevices(_ call: CAPPluginCall) {
        call.resolve(["devices": readKnownDevices().map { ["id": $0.id, "name": $0.name] }])
    }

    // MARK: - Scan / connect

    @objc func requestDevice(_ call: CAPPluginCall) {
        guard central.state == .poweredOn else {
            call.reject(encodeError(name: "NotFoundError", message: "Bluetooth is off or unavailable."))
            return
        }
        pendingRequest = call
        let services = (call.getArray("services", String.self) ?? []).map { CBUUID(string: $0) }
        let namePrefixes = call.getArray("namePrefixes", String.self) ?? []
        let acceptAll = call.getBool("acceptAll") ?? false
        scanFilters = (services, namePrefixes, acceptAll)

        let timeoutMs = call.getInt("timeoutMs") ?? 12_000
        central.scanForPeripherals(withServices: acceptAll ? nil : services, options: nil)

        let work = DispatchWorkItem { [weak self] in
            guard let self, let pending = self.pendingRequest else { return }
            self.central.stopScan()
            self.pendingRequest = nil
            self.scanFilters = nil
            pending.reject(self.encodeError(name: "NotFoundError", message: "No device was selected, or none were in range. Bring Arc close and try again."))
        }
        scanTimeout = work
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(timeoutMs), execute: work)
    }

    @objc func connectKnown(_ call: CAPPluginCall) {
        guard let id = call.getString("deviceId"), let uuid = UUID(uuidString: id) else {
            call.reject("Missing or invalid deviceId")
            return
        }
        guard central.state == .poweredOn else {
            call.reject(encodeError(name: "NotFoundError", message: "Bluetooth is off or unavailable."))
            return
        }
        let found = central.retrievePeripherals(withIdentifiers: [uuid])
        guard let peripheral = found.first else {
            call.reject(encodeError(name: "NotFoundError", message: "That device isn't reachable right now."))
            return
        }
        peripherals[id] = peripheral
        call.resolve(["id": id, "name": peripheral.name ?? "Unnamed device"])
    }

    @objc func connect(_ call: CAPPluginCall) {
        guard let id = call.getString("deviceId"), let peripheral = peripherals[id] else {
            call.reject("Unknown deviceId — call requestDevice or connectKnown first")
            return
        }
        peripheral.delegate = self
        pendingConnects[id] = call
        central.connect(peripheral, options: nil)
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        guard let id = call.getString("deviceId"), let peripheral = peripherals[id] else {
            call.resolve([:])
            return
        }
        stopRssiTimer(id)
        central.cancelPeripheralConnection(peripheral)
        call.resolve([:])
    }

    // MARK: - GATT

    @objc func getCharacteristic(_ call: CAPPluginCall) {
        guard
            let id = call.getString("deviceId"),
            let serviceUuid = call.getString("serviceUuid"),
            let characteristicUuid = call.getString("characteristicUuid"),
            let peripheral = peripherals[id]
        else {
            call.reject("Missing deviceId/serviceUuid/characteristicUuid, or device not connected")
            return
        }
        let key = characteristicKey(id, serviceUuid, characteristicUuid)
        if characteristics[key] != nil {
            call.resolve([:])
            return
        }
        pendingCharacteristicLookups[key] = call
        // `peripheral.services` accumulates every service ever discovered on
        // this peripheral across calls, not just the latest — so the
        // service this particular discoverServices() resolves has to be
        // looked up by UUID in didDiscoverServices, not assumed to be
        // whichever one landed first.
        pendingServiceDiscovery[id] = serviceUuid
        peripheral.discoverServices([CBUUID(string: serviceUuid)])
    }

    @objc func readValue(_ call: CAPPluginCall) {
        guard let characteristic = resolveCharacteristic(call) else {
            call.reject("Characteristic not found — call getCharacteristic first")
            return
        }
        guard let id = call.getString("deviceId"), let peripheral = peripherals[id] else {
            call.reject("Unknown deviceId")
            return
        }
        let key = characteristicKey(id, call.getString("serviceUuid") ?? "", call.getString("characteristicUuid") ?? "")
        pendingReads[key] = call
        peripheral.readValue(for: characteristic)
    }

    @objc func startNotifications(_ call: CAPPluginCall) {
        guard let characteristic = resolveCharacteristic(call) else {
            call.reject("Characteristic not found — call getCharacteristic first")
            return
        }
        guard let id = call.getString("deviceId"), let peripheral = peripherals[id] else {
            call.reject("Unknown deviceId")
            return
        }
        peripheral.setNotifyValue(true, for: characteristic)
        call.resolve([:])
    }

    @objc func stopNotifications(_ call: CAPPluginCall) {
        guard let characteristic = resolveCharacteristic(call) else {
            call.resolve([:])
            return
        }
        guard let id = call.getString("deviceId"), let peripheral = peripherals[id] else {
            call.resolve([:])
            return
        }
        peripheral.setNotifyValue(false, for: characteristic)
        call.resolve([:])
    }

    // MARK: - CBCentralManagerDelegate

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        // Nothing to do eagerly — isAvailable() reads `central.state` directly
        // whenever the JS side actually asks.
    }

    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        guard let filters = scanFilters, let pending = pendingRequest else { return }
        let name = peripheral.name ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
        if !filters.acceptAll {
            let matchesName = filters.namePrefixes.contains { prefix in
                guard let name else { return false }
                return name.hasPrefix(prefix)
            }
            // Service-UUID filtering already happened via scanForPeripherals's
            // `withServices:`; a name-prefix match is the only extra check
            // needed here for devices that didn't match on service.
            if !matchesName && filters.namePrefixes.isEmpty == false && filters.services.isEmpty {
                return
            }
        }
        scanTimeout?.cancel()
        central.stopScan()
        pendingRequest = nil
        scanFilters = nil
        let id = peripheral.identifier.uuidString
        peripherals[id] = peripheral
        rememberDevice(id: id, name: name ?? "Unnamed device")
        pending.resolve(["id": id, "name": name ?? "Unnamed device"])
    }

    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let id = peripheral.identifier.uuidString
        startRssiTimer(id, peripheral: peripheral)
        pendingConnects.removeValue(forKey: id)?.resolve([:])
    }

    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let id = peripheral.identifier.uuidString
        pendingConnects.removeValue(forKey: id)?.reject(
            encodeError(name: "NetworkError", message: error?.localizedDescription ?? "Couldn't connect to the device.")
        )
    }

    public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let id = peripheral.identifier.uuidString
        stopRssiTimer(id)
        notifyListeners("disconnected", data: ["deviceId": id])
    }

    // MARK: - CBPeripheralDelegate

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        let id = peripheral.identifier.uuidString
        guard let wantedUuid = pendingServiceDiscovery.removeValue(forKey: id) else { return }
        guard
            let service = peripheral.services?.first(where: {
                $0.uuid.uuidString.uppercased() == wantedUuid.uppercased()
            })
        else {
            // The specific service we asked for wasn't found on this device —
            // fail whichever characteristic lookup was waiting on it instead
            // of leaving its promise hanging forever.
            for (key, call) in pendingCharacteristicLookups where key.hasPrefix("\(id)|\(wantedUuid.uppercased())|") {
                call.reject("Service \(wantedUuid) not found on device")
                pendingCharacteristicLookups.removeValue(forKey: key)
            }
            return
        }
        peripheral.discoverCharacteristics(nil, for: service)
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        let id = peripheral.identifier.uuidString
        for characteristic in service.characteristics ?? [] {
            let key = characteristicKey(id, service.uuid.uuidString, characteristic.uuid.uuidString)
            characteristics[key] = characteristic
            if let call = pendingCharacteristicLookups.removeValue(forKey: key) {
                if let error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve([:])
                }
            }
        }
    }

    public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let service = characteristic.service else { return }
        let id = peripheral.identifier.uuidString
        let key = characteristicKey(id, service.uuid.uuidString, characteristic.uuid.uuidString)

        if let call = pendingReads.removeValue(forKey: key) {
            if let error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["valueBase64": characteristic.value?.base64EncodedString() ?? ""])
            }
            return
        }

        guard error == nil, let data = characteristic.value else { return }
        notifyListeners("characteristicValueChanged", data: [
            "deviceId": id,
            "serviceUuid": service.uuid.uuidString,
            "characteristicUuid": characteristic.uuid.uuidString,
            "valueBase64": data.base64EncodedString(),
        ])
    }

    public func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        guard error == nil else { return }
        notifyListeners("rssi", data: ["deviceId": peripheral.identifier.uuidString, "rssi": RSSI.intValue])
    }

    // MARK: - Helpers

    private var pendingCharacteristicLookups: [String: CAPPluginCall] = [:]
    private var pendingReads: [String: CAPPluginCall] = [:]

    private func characteristicKey(_ deviceId: String, _ serviceUuid: String, _ characteristicUuid: String) -> String {
        "\(deviceId)|\(serviceUuid.uppercased())|\(characteristicUuid.uppercased())"
    }

    private func resolveCharacteristic(_ call: CAPPluginCall) -> CBCharacteristic? {
        guard
            let id = call.getString("deviceId"),
            let serviceUuid = call.getString("serviceUuid"),
            let characteristicUuid = call.getString("characteristicUuid")
        else { return nil }
        return characteristics[characteristicKey(id, serviceUuid, characteristicUuid)]
    }

    private func startRssiTimer(_ id: String, peripheral: CBPeripheral) {
        stopRssiTimer(id)
        let timer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak peripheral] _ in
            peripheral?.readRSSI()
        }
        rssiTimers[id] = timer
    }

    private func stopRssiTimer(_ id: String) {
        rssiTimers[id]?.invalidate()
        rssiTimers.removeValue(forKey: id)
    }

    private struct KnownDevice: Codable { let id: String; let name: String }

    private func readKnownDevices() -> [KnownDevice] {
        guard let data = UserDefaults.standard.data(forKey: knownDevicesKey) else { return [] }
        return (try? JSONDecoder().decode([KnownDevice].self, from: data)) ?? []
    }

    private func rememberDevice(id: String, name: String) {
        var devices = readKnownDevices().filter { $0.id != id }
        devices.insert(KnownDevice(id: id, name: name), at: 0)
        devices = Array(devices.prefix(5))
        if let data = try? JSONEncoder().encode(devices) {
            UserDefaults.standard.set(data, forKey: knownDevicesKey)
        }
    }

    /// Encodes a Web-Bluetooth-style error name into the reject message so
    /// the JS adapter can reconstruct `Error.name` for bluetooth-manager's
    /// existing `classify()` switch — see ciatta-bluetooth-plugin.ts.
    private func encodeError(name: String, message: String) -> String {
        "{\"name\":\"\(name)\",\"message\":\"\(message.replacingOccurrences(of: "\"", with: "'"))\"}"
    }
}
