/**
 * Bluetooth, from the app's side.
 *
 * A thin subscription to the manager plus the actions a screen can take. No
 * device logic lives here — it belongs to the manager.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { bluetoothManager, type BleSnapshot } from "./bluetooth-manager";

const SERVER_SNAPSHOT: BleSnapshot = {
  state: "idle",
  device: null,
  rssi: null,
  batteryLevel: null,
  known: [],
  latest: null,
  packetCount: 0,
  invalidCount: 0,
  lastPacketAt: null,
  error: null,
};

export function useBluetooth(options?: { autoReconnect?: boolean }) {
  const snapshot = useSyncExternalStore(
    bluetoothManager.subscribe,
    bluetoothManager.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const auto = options?.autoReconnect ?? true;

  useEffect(() => {
    if (auto) void bluetoothManager.autoReconnect();
    else void bluetoothManager.refresh();
  }, [auto]);

  return {
    ...snapshot,
    supported: bluetoothManager.supported(),
    connect: useCallback(() => bluetoothManager.scanAndConnect(), []),
    connectAny: useCallback(() => bluetoothManager.scanAndConnect({ acceptAll: true }), []),
    connectKnown: useCallback((id: string) => bluetoothManager.connectKnown(id), []),
    disconnect: useCallback(() => bluetoothManager.disconnect(), []),
    resetCounters: useCallback(() => bluetoothManager.resetCounters(), []),
    forget: useCallback(() => bluetoothManager.forget(), []),
  };
}
