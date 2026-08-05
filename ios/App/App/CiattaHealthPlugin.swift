import Capacitor
import Foundation
import HealthKit

/**
 * Native side of `window.ciattaHealth` (see src/lib/native/
 * ciatta-health-plugin.ts and src/lib/apple-health.ts). A browser can't read
 * HealthKit, so every read goes through here.
 */
@objc(CiattaHealthPlugin)
public class CiattaHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CiattaHealthPlugin"
    public let jsName = "CiattaHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSamples", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["value": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": []])
            return
        }
        let requested = call.getArray("metrics", String.self) ?? []
        let readable = requested.filter { CiattaHealthTypes.readType(for: $0) != nil }
        let types = Set(readable.compactMap { CiattaHealthTypes.readType(for: $0) })
        guard !types.isEmpty else {
            call.resolve(["granted": []])
            return
        }
        healthStore.requestAuthorization(toShare: nil, read: types) { success, error in
            if let error {
                call.reject("HealthKit authorization failed", nil, error)
                return
            }
            // HealthKit deliberately never reveals whether a person granted
            // or denied a specific read type — only that the prompt was
            // shown and answered. Treat a successful prompt as consent for
            // every metric that was actually requested; a later read simply
            // returns nothing for anything they declined.
            call.resolve(["granted": success ? readable : []])
        }
    }

    @objc func readSamples(_ call: CAPPluginCall) {
        let metrics = call.getArray("metrics", String.self) ?? []
        guard
            let sinceString = call.getString("since"),
            let since = ISO8601DateFormatter().date(from: sinceString)
        else {
            call.reject("Missing or invalid 'since'")
            return
        }
        guard !metrics.isEmpty else {
            call.resolve(["samples": []])
            return
        }

        let group = DispatchGroup()
        let lock = NSLock()
        var allSamples: [[String: Any]] = []

        for metric in metrics {
            group.enter()
            CiattaHealthTypes.readSamples(store: healthStore, metric: metric, since: since) { samples in
                lock.lock()
                allSamples.append(contentsOf: samples)
                lock.unlock()
                group.leave()
            }
        }

        group.notify(queue: .main) {
            call.resolve(["samples": allSamples])
        }
    }
}
