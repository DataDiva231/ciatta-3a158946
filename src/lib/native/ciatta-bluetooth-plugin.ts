/**
 * Registers the native CiattaBluetooth Capacitor plugin (ios/App/App/
 * CiattaBluetoothPlugin.swift) as `navigator.bluetooth` on native platforms.
 *
 * iOS's WKWebView has no Web Bluetooth implementation at all — `navigator
 * .bluetooth` simply doesn't exist there. Rather than teach `bluetooth-
 * manager.ts` two code paths, this builds a native-backed object that
 * satisfies the exact `Bluetooth`/`BleDevice`/`BleServer`/`BleCharacteristic`
 * shapes `src/lib/ble/web-bluetooth.ts` already declares, and assigns it
 * onto `navigator.bluetooth`. `bluetooth()`'s existing lookup picks it up
 * unmodified — the manager, the observation pipeline, sessions and
 * intelligence layers need no changes at all.
 *
 * Exported as a function and explicitly called from routes/__root.tsx,
 * rather than run as a bare side-effect import — see ciatta-health-plugin.ts
 * for why (package.json's "sideEffects": false tree-shakes side-effect-only
 * imports with no consumed export).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

import type { BleCharacteristic, BleDevice, BleRequestOptions, BleServer, BleService, Bluetooth } from "@/lib/ble/web-bluetooth";

interface CiattaBluetoothNativePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  getKnownDevices(): Promise<{ devices: { id: string; name: string }[] }>;
  requestDevice(options: {
    services: string[];
    namePrefixes: string[];
    acceptAll: boolean;
    timeoutMs?: number;
  }): Promise<{ id: string; name: string }>;
  connectKnown(options: { deviceId: string }): Promise<{ id: string; name: string }>;
  connect(options: { deviceId: string }): Promise<void>;
  disconnect(options: { deviceId: string }): Promise<void>;
  getCharacteristic(options: {
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
  }): Promise<void>;
  readValue(options: {
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
  }): Promise<{ valueBase64: string }>;
  startNotifications(options: {
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
  }): Promise<void>;
  stopNotifications(options: {
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
  }): Promise<void>;
  addListener(
    eventName: "disconnected",
    listener: (data: { deviceId: string }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: "rssi",
    listener: (data: { deviceId: string; rssi: number }) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: "characteristicValueChanged",
    listener: (data: {
      deviceId: string;
      serviceUuid: string;
      characteristicUuid: string;
      valueBase64: string;
    }) => void,
  ): Promise<{ remove: () => void }>;
}

function base64ToDataView(base64: string): DataView {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new DataView(bytes.buffer);
}

/** A Web-Bluetooth-style Error the manager's classify() can key off `.name`. */
function nativeError(rejectionMessage: string): Error {
  try {
    const parsed = JSON.parse(rejectionMessage) as { name?: string; message?: string };
    if (parsed.name) {
      const error = new Error(parsed.message ?? rejectionMessage);
      error.name = parsed.name;
      return error;
    }
  } catch {
    /* not a structured error — fall through */
  }
  return new Error(rejectionMessage);
}

function charKey(deviceId: string, serviceUuid: string, characteristicUuid: string): string {
  return `${deviceId}|${serviceUuid.toUpperCase()}|${characteristicUuid.toUpperCase()}`;
}

class NativeCharacteristic implements BleCharacteristic {
  uuid: string;
  value: DataView | null = null;
  private listeners = new Set<(event: Event) => void>();

  constructor(
    private deviceId: string,
    private serviceUuid: string,
    uuid: string,
    private native: CiattaBluetoothNativePlugin,
  ) {
    this.uuid = uuid;
  }

  async readValue(): Promise<DataView> {
    try {
      const { valueBase64 } = await this.native.readValue({
        deviceId: this.deviceId,
        serviceUuid: this.serviceUuid,
        characteristicUuid: this.uuid,
      });
      const view = base64ToDataView(valueBase64);
      this.value = view;
      return view;
    } catch (error) {
      throw nativeError(error instanceof Error ? error.message : String(error));
    }
  }

  async startNotifications(): Promise<BleCharacteristic> {
    await this.native.startNotifications({
      deviceId: this.deviceId,
      serviceUuid: this.serviceUuid,
      characteristicUuid: this.uuid,
    });
    return this;
  }

  async stopNotifications(): Promise<BleCharacteristic> {
    await this.native.stopNotifications({
      deviceId: this.deviceId,
      serviceUuid: this.serviceUuid,
      characteristicUuid: this.uuid,
    });
    return this;
  }

  addEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void {
    if (type === "characteristicvaluechanged") this.listeners.add(listener);
  }

  removeEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void {
    if (type === "characteristicvaluechanged") this.listeners.delete(listener);
  }

  /** Fed by the plugin's global `characteristicValueChanged` event. */
  dispatch(view: DataView): void {
    this.value = view;
    const event = { target: this } as unknown as Event;
    for (const listener of this.listeners) listener(event);
  }
}

class NativeService implements BleService {
  uuid: string;

  constructor(
    private deviceId: string,
    uuid: string,
    private native: CiattaBluetoothNativePlugin,
    private registry: Map<string, NativeCharacteristic>,
  ) {
    this.uuid = uuid;
  }

  async getCharacteristic(uuid: string): Promise<BleCharacteristic> {
    const key = charKey(this.deviceId, this.uuid, uuid);
    let characteristic = this.registry.get(key);
    if (!characteristic) {
      try {
        await this.native.getCharacteristic({
          deviceId: this.deviceId,
          serviceUuid: this.uuid,
          characteristicUuid: uuid,
        });
      } catch (error) {
        throw nativeError(error instanceof Error ? error.message : String(error));
      }
      characteristic = new NativeCharacteristic(this.deviceId, this.uuid, uuid, this.native);
      this.registry.set(key, characteristic);
    }
    return characteristic;
  }
}

class NativeServer implements BleServer {
  connected = false;
  private services = new Map<string, NativeService>();

  constructor(
    private deviceId: string,
    private native: CiattaBluetoothNativePlugin,
    private registry: Map<string, NativeCharacteristic>,
  ) {}

  async connect(): Promise<BleServer> {
    try {
      // Populates the native side's peripheral cache when reconnecting to a
      // device that wasn't just found via requestDevice's scan (e.g. auto-
      // reconnect on launch). Harmless no-op if it's already cached.
      await this.native.connectKnown({ deviceId: this.deviceId });
    } catch {
      /* already resolvable from a prior requestDevice() scan result */
    }
    try {
      await this.native.connect({ deviceId: this.deviceId });
    } catch (error) {
      throw nativeError(error instanceof Error ? error.message : String(error));
    }
    this.connected = true;
    return this;
  }

  disconnect(): void {
    this.connected = false;
    void this.native.disconnect({ deviceId: this.deviceId });
  }

  async getPrimaryService(uuid: string): Promise<BleService> {
    let service = this.services.get(uuid);
    if (!service) {
      service = new NativeService(this.deviceId, uuid, this.native, this.registry);
      this.services.set(uuid, service);
    }
    return service;
  }
}

class NativeDevice implements BleDevice {
  id: string;
  name?: string | null;
  gatt: BleServer;
  private disconnectListeners = new Set<(event: Event) => void>();
  private advertisementListeners = new Set<(event: Event) => void>();

  constructor(id: string, name: string | null, native: CiattaBluetoothNativePlugin, registry: Map<string, NativeCharacteristic>) {
    this.id = id;
    this.name = name;
    this.gatt = new NativeServer(id, native, registry);
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (type === "gattserverdisconnected") this.disconnectListeners.add(listener);
    else if (type === "advertisementreceived") this.advertisementListeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    if (type === "gattserverdisconnected") this.disconnectListeners.delete(listener);
    else if (type === "advertisementreceived") this.advertisementListeners.delete(listener);
  }

  /** Always resolves — the plugin already streams RSSI while connected. */
  async watchAdvertisements(): Promise<void> {}

  dispatchDisconnected(): void {
    const event = {} as Event;
    for (const listener of this.disconnectListeners) listener(event);
  }

  dispatchAdvertisement(rssi: number): void {
    const event = { rssi } as unknown as Event;
    for (const listener of this.advertisementListeners) listener(event);
  }
}

class NativeBluetooth implements Bluetooth {
  private devices = new Map<string, NativeDevice>();
  /** Shared across every device/service so the global event listeners below can find any characteristic by key. */
  private characteristics = new Map<string, NativeCharacteristic>();

  constructor(private native: CiattaBluetoothNativePlugin) {
    void native.addListener("disconnected", ({ deviceId }) => {
      this.devices.get(deviceId)?.dispatchDisconnected();
    });
    void native.addListener("rssi", ({ deviceId, rssi }) => {
      this.devices.get(deviceId)?.dispatchAdvertisement(rssi);
    });
    void native.addListener("characteristicValueChanged", ({ deviceId, serviceUuid, characteristicUuid, valueBase64 }) => {
      const key = charKey(deviceId, serviceUuid, characteristicUuid);
      this.characteristics.get(key)?.dispatch(base64ToDataView(valueBase64));
    });
  }

  async getAvailability(): Promise<boolean> {
    return (await this.native.isAvailable()).available;
  }

  async getDevices(): Promise<BleDevice[]> {
    const { devices } = await this.native.getKnownDevices();
    return devices.map((device) => this.deviceFor(device.id, device.name));
  }

  async requestDevice(options: BleRequestOptions): Promise<BleDevice> {
    const services = new Set<string>(options.optionalServices ?? []);
    const namePrefixes: string[] = [];
    for (const filter of options.filters ?? []) {
      for (const service of filter.services ?? []) services.add(service);
      if (filter.namePrefix) namePrefixes.push(filter.namePrefix);
    }
    try {
      const result = await this.native.requestDevice({
        services: [...services],
        namePrefixes,
        acceptAll: Boolean(options.acceptAllDevices),
      });
      return this.deviceFor(result.id, result.name);
    } catch (error) {
      throw nativeError(error instanceof Error ? error.message : String(error));
    }
  }

  private deviceFor(id: string, name: string | null): NativeDevice {
    let device = this.devices.get(id);
    if (!device) {
      device = new NativeDevice(id, name, this.native, this.characteristics);
      this.devices.set(id, device);
    }
    return device;
  }
}

export function registerCiattaBluetoothPlugin(): void {
  if (!Capacitor.isNativePlatform()) return;
  // Chrome on Android does implement Web Bluetooth — only stand in for it
  // where it's genuinely missing, i.e. iOS's WKWebView.
  if (typeof navigator !== "undefined" && (navigator as unknown as { bluetooth?: unknown }).bluetooth) return;

  const native = registerPlugin<CiattaBluetoothNativePlugin>("CiattaBluetooth");
  (navigator as unknown as { bluetooth: Bluetooth }).bluetooth = new NativeBluetooth(native);
}
