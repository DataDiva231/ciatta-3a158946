/**
 * Bluetooth manager — the only place that talks to a device.
 *
 * It knows nothing about React or screens: it scans, connects, subscribes,
 * reconnects and reports. Anything that wants to watch it subscribes to
 * `subscribe()` and receives immutable snapshots.
 */
import {
  ARC_NAME_PREFIXES,
  ARC_SENSOR_CHARACTERISTIC_UUID,
  ARC_SERVICE_UUID,
  BATTERY_LEVEL_CHARACTERISTIC_UUID,
  BATTERY_SERVICE_UUID,
  InvalidPacketError,
  parseSensorPacket,
  type SensorSample,
} from "./protocol";
import {
  bluetooth,
  type BleCharacteristic,
  type BleDevice,
  type BleServer,
} from "./web-bluetooth";

export type ConnectionState =
  | "unsupported"
  | "unavailable"
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type BleErrorKind =
  | "unsupported"
  | "bluetooth_disabled"
  | "permission_denied"
  | "device_unavailable"
  | "timeout"
  | "unexpected_disconnect"
  | "invalid_packet"
  | "unknown";

export type BleError = { kind: BleErrorKind; message: string; at: number };

export type KnownDevice = { id: string; name: string };

/** A raw notification, exactly as it arrived. Consumers own interpretation. */
export type BlePacket = {
  /** Raw bytes, copied so nothing downstream can be surprised by reuse. */
  bytes: Uint8Array;
  receivedAt: number;
  deviceId: string | null;
  deviceName: string | null;
  rssi: number | null;
  batteryLevel: number | null;
  connected: boolean;
};

export type BleSnapshot = {
  state: ConnectionState;
  device: { id: string; name: string } | null;
  /** Only available where advertisement watching is supported. */
  rssi: number | null;
  batteryLevel: number | null;
  known: KnownDevice[];
  latest: SensorSample | null;
  packetCount: number;
  invalidCount: number;
  lastPacketAt: number | null;
  error: BleError | null;
};

const LAST_DEVICE_KEY = "ciatta.ble.last-device";
const CONNECT_TIMEOUT_MS = 12_000;

function labelOf(device: BleDevice): string {
  return device.name?.trim() || "Unnamed device";
}

function classify(error: unknown): BleError {
  const name = (error as { name?: string } | null)?.name ?? "";
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const at = Date.now();
  if (error instanceof InvalidPacketError) {
    return { kind: "invalid_packet", message: raw, at };
  }
  if (name === "NotFoundError") {
    return {
      kind: "device_unavailable",
      message: "No device was selected, or none were in range. Bring Arc close and try again.",
      at,
    };
  }
  if (name === "SecurityError" || name === "NotAllowedError") {
    return {
      kind: "permission_denied",
      message: "Bluetooth permission was denied. Allow Bluetooth for this site, then retry.",
      at,
    };
  }
  if (name === "InvalidStateError" || /bluetooth adapter|turned off|disabled/i.test(raw)) {
    return { kind: "bluetooth_disabled", message: "Bluetooth is off. Turn it on and retry.", at };
  }
  if (name === "NetworkError") {
    return {
      kind: "device_unavailable",
      message: "The device couldn't be reached. Make sure it's powered on and nearby.",
      at,
    };
  }
  if (name === "TimeoutError") {
    return { kind: "timeout", message: "Connecting took too long. Try again.", at };
  }
  return { kind: "unknown", message: raw || "Something went wrong with Bluetooth.", at };
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("Connection timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

class BluetoothManager {
  private snapshot: BleSnapshot = {
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

  private listeners = new Set<(snapshot: BleSnapshot) => void>();
  private packetListeners = new Set<(packet: BlePacket) => void>();
  private current: BleDevice | null = null;
  private sensor: BleCharacteristic | null = null;
  private advertisements: AbortController | null = null;
  private intentionalDisconnect = false;
  private reconnectAttempts = 0;

  getSnapshot = (): BleSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: BleSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Raw packet feed. The observation pipeline listens here; screens don't. */
  subscribePackets = (listener: (packet: BlePacket) => void): (() => void) => {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  };

  private emitPacket(view: DataView) {
    if (!this.packetListeners.size) return;
    const bytes = new Uint8Array(view.byteLength);
    for (let i = 0; i < view.byteLength; i += 1) bytes[i] = view.getUint8(i);
    const packet: BlePacket = {
      bytes,
      receivedAt: Date.now(),
      deviceId: this.snapshot.device?.id ?? null,
      deviceName: this.snapshot.device?.name ?? null,
      rssi: this.snapshot.rssi,
      batteryLevel: this.snapshot.batteryLevel,
      connected: this.snapshot.state === "connected",
    };
    for (const listener of this.packetListeners) listener(packet);
  }

  private patch(next: Partial<BleSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  supported(): boolean {
    return Boolean(bluetooth());
  }

  /** Reads adapter availability and the devices this browser already trusts. */
  async refresh(): Promise<void> {
    const ble = bluetooth();
    if (!ble) {
      this.patch({ state: "unsupported", error: {
        kind: "unsupported",
        message: "This browser can't use Bluetooth. Use Chrome on desktop or Android, over HTTPS.",
        at: Date.now(),
      } });
      return;
    }
    try {
      const available = (await ble.getAvailability?.()) ?? true;
      const known = ble.getDevices
        ? (await ble.getDevices()).map((d) => ({ id: d.id, name: labelOf(d) }))
        : [];
      this.patch({
        known,
        state:
          this.snapshot.state === "connected" || this.snapshot.state === "connecting"
            ? this.snapshot.state
            : available
              ? "idle"
              : "unavailable",
        error: available
          ? this.snapshot.error
          : { kind: "bluetooth_disabled", message: "Bluetooth is off or unavailable.", at: Date.now() },
      });
    } catch (error) {
      this.patch({ state: "error", error: classify(error) });
    }
  }

  /**
   * Opens the browser's device chooser, filtered to Arc prototypes. This is the
   * platform's scan UI — it lists discoverable devices without exposing them to
   * the page until one is picked.
   */
  async scanAndConnect(options?: { acceptAll?: boolean }): Promise<void> {
    const ble = bluetooth();
    if (!ble) {
      await this.refresh();
      return;
    }
    this.patch({ state: "scanning", error: null });
    try {
      const device = await ble.requestDevice(
        options?.acceptAll
          ? { acceptAllDevices: true, optionalServices: [ARC_SERVICE_UUID, BATTERY_SERVICE_UUID] }
          : {
              filters: [
                { services: [ARC_SERVICE_UUID] },
                ...ARC_NAME_PREFIXES.map((namePrefix) => ({ namePrefix })),
              ],
              optionalServices: [ARC_SERVICE_UUID, BATTERY_SERVICE_UUID],
            },
      );
      await this.attach(device);
    } catch (error) {
      this.patch({ state: "error", error: classify(error) });
    }
  }

  /** Reconnects to a device this browser already trusts, without any prompt. */
  async connectKnown(id?: string): Promise<boolean> {
    const ble = bluetooth();
    if (!ble?.getDevices) return false;
    const wanted = id ?? this.lastDeviceId();
    if (!wanted) return false;
    try {
      const devices = await ble.getDevices();
      const found = devices.find((d) => d.id === wanted);
      if (!found) return false;
      await this.attach(found);
      return true;
    } catch (error) {
      this.patch({ state: "error", error: classify(error) });
      return false;
    }
  }

  /** Connects on load when the last paired device is already trusted. */
  async autoReconnect(): Promise<void> {
    if (this.snapshot.state === "connected" || this.snapshot.state === "connecting") return;
    await this.refresh();
    if (!this.lastDeviceId()) return;
    await this.connectKnown();
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.advertisements?.abort();
    this.advertisements = null;
    try {
      if (this.sensor) await this.sensor.stopNotifications().catch(() => undefined);
      this.current?.gatt?.disconnect();
    } finally {
      this.sensor = null;
      this.patch({ state: "idle", rssi: null, error: null });
    }
  }

  /** Clears counters between test runs without touching the connection. */
  resetCounters(): void {
    this.patch({ packetCount: 0, invalidCount: 0, latest: null, lastPacketAt: null });
  }

  forget(): void {
    this.rememberDevice(null);
    this.patch({ device: null });
  }

  private lastDeviceId(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(LAST_DEVICE_KEY);
    } catch {
      return null;
    }
  }

  private rememberDevice(id: string | null) {
    if (typeof window === "undefined") return;
    try {
      if (id) window.localStorage.setItem(LAST_DEVICE_KEY, id);
      else window.localStorage.removeItem(LAST_DEVICE_KEY);
    } catch {
      /* private mode — reconnection is simply manual */
    }
  }

  private async attach(device: BleDevice): Promise<void> {
    this.current = device;
    this.intentionalDisconnect = false;
    this.patch({
      state: this.reconnectAttempts > 0 ? "reconnecting" : "connecting",
      device: { id: device.id, name: labelOf(device) },
      error: null,
    });

    device.removeEventListener("gattserverdisconnected", this.onDisconnected);
    device.addEventListener("gattserverdisconnected", this.onDisconnected);

    try {
      if (!device.gatt) throw new Error("This device has no GATT server");
      const server = await withTimeout(device.gatt.connect(), CONNECT_TIMEOUT_MS);
      await this.subscribeSensor(server);
      await this.readBattery(server);
      this.watchRssi(device);
      this.reconnectAttempts = 0;
      this.rememberDevice(device.id);
      this.patch({ state: "connected", error: null });
    } catch (error) {
      this.patch({ state: "error", error: classify(error) });
    }
  }

  private async subscribeSensor(server: BleServer): Promise<void> {
    const service = await server.getPrimaryService(ARC_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(ARC_SENSOR_CHARACTERISTIC_UUID);
    characteristic.removeEventListener("characteristicvaluechanged", this.onPacket);
    characteristic.addEventListener("characteristicvaluechanged", this.onPacket);
    await characteristic.startNotifications();
    this.sensor = characteristic;
  }

  private async readBattery(server: BleServer): Promise<void> {
    try {
      const service = await server.getPrimaryService(BATTERY_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC_UUID);
      const value = await characteristic.readValue();
      this.patch({ batteryLevel: value.getUint8(0) });
      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const target = (event.target as { value?: DataView | null } | null)?.value;
        if (target) this.patch({ batteryLevel: target.getUint8(0) });
      });
      await characteristic.startNotifications().catch(() => undefined);
    } catch {
      this.patch({ batteryLevel: null });
    }
  }

  private watchRssi(device: BleDevice): void {
    if (!device.watchAdvertisements) return;
    this.advertisements?.abort();
    const controller = new AbortController();
    this.advertisements = controller;
    device.addEventListener("advertisementreceived", (event) => {
      const rssi = (event as unknown as { rssi?: number }).rssi;
      if (typeof rssi === "number") this.patch({ rssi });
    });
    void device.watchAdvertisements({ signal: controller.signal }).catch(() => undefined);
  }

  private onPacket = (event: Event) => {
    const value = (event.target as { value?: DataView | null } | null)?.value;
    if (!value) return;
    try {
      const sample = parseSensorPacket(value);
      this.patch({
        latest: sample,
        packetCount: this.snapshot.packetCount + 1,
        lastPacketAt: sample.at,
        error: this.snapshot.error?.kind === "invalid_packet" ? null : this.snapshot.error,
      });
    } catch (error) {
      this.patch({
        invalidCount: this.snapshot.invalidCount + 1,
        error: classify(error),
      });
    }
  };

  private onDisconnected = () => {
    this.sensor = null;
    this.advertisements?.abort();
    this.advertisements = null;
    if (this.intentionalDisconnect) {
      this.patch({ state: "idle", rssi: null });
      return;
    }
    this.patch({
      state: "reconnecting",
      rssi: null,
      error: {
        kind: "unexpected_disconnect",
        message: "The device disconnected. Trying to reconnect.",
        at: Date.now(),
      },
    });
    this.retry();
  };

  private retry(): void {
    const device = this.current;
    if (!device) return;
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > 5) {
      this.patch({
        state: "error",
        error: {
          kind: "unexpected_disconnect",
          message: "Lost the device and couldn't get it back. Reconnect when it's nearby.",
          at: Date.now(),
        },
      });
      this.reconnectAttempts = 0;
      return;
    }
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 8000);
    setTimeout(() => {
      if (this.intentionalDisconnect) return;
      void this.attach(device);
    }, delay);
  }
}

/** One manager for the whole app. */
export const bluetoothManager = new BluetoothManager();
