/**
 * The narrow slice of Web Bluetooth we rely on.
 *
 * TypeScript's DOM library doesn't ship Web Bluetooth, so the shapes we touch
 * are declared here — deliberately minimal, so the manager stays honest about
 * what it actually uses.
 */

export type BleCharacteristic = {
  uuid: string;
  value?: DataView | null;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<BleCharacteristic>;
  stopNotifications(): Promise<BleCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
  removeEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
};

export type BleService = {
  uuid: string;
  getCharacteristic(uuid: string): Promise<BleCharacteristic>;
};

export type BleServer = {
  connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BleService>;
};

export type BleDevice = {
  id: string;
  name?: string | null;
  gatt?: BleServer;
  watchAdvertisements?: (options?: { signal?: AbortSignal }) => Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
};

export type BleRequestOptions = {
  filters?: Array<{ services?: string[]; namePrefix?: string; name?: string }>;
  optionalServices?: string[];
  acceptAllDevices?: boolean;
};

export type Bluetooth = {
  getAvailability?: () => Promise<boolean>;
  requestDevice(options: BleRequestOptions): Promise<BleDevice>;
  getDevices?: () => Promise<BleDevice[]>;
};

export function bluetooth(): Bluetooth | null {
  if (typeof navigator === "undefined") return null;
  const found = (navigator as unknown as { bluetooth?: Bluetooth }).bluetooth;
  return found ?? null;
}
