/**
 * Arc BLE protocol — pure, UI-free, transport-free.
 *
 * Everything about what the device says lives here: which services and
 * characteristics to talk to, and how a raw packet becomes numbers. The
 * Bluetooth manager knows how to move bytes; this module knows what they mean.
 */

/** Arc prototype GATT layout. Provisional — safe to change in one place. */
export const ARC_SERVICE_UUID = "0000fe80-0000-1000-8000-00805f9b34fb";
export const ARC_SENSOR_CHARACTERISTIC_UUID = "0000fe81-0000-1000-8000-00805f9b34fb";

export const BATTERY_SERVICE_UUID = "battery_service";
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = "battery_level";

/** Name prefixes we offer in the chooser while prototypes are unbranded. */
export const ARC_NAME_PREFIXES = ["Arc", "ARC", "Ciatta"];

export type SensorSample = {
  /** Milliseconds since epoch, stamped on arrival. */
  at: number;
  /** Device-reported sequence number, when present. */
  sequence: number | null;
  /** Skin temperature in °C. */
  temperatureC: number | null;
  /** Heart rate in bpm. */
  heartRate: number | null;
  /** Inter-beat interval in ms. */
  ibiMs: number | null;
  /** Relative humidity, 0–100. */
  humidity: number | null;
  /** Raw bytes, hex-encoded, always kept for diagnostics. */
  hex: string;
};

export class InvalidPacketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPacketError";
  }
}

export function toHex(view: DataView): string {
  let out = "";
  for (let i = 0; i < view.byteLength; i += 1) {
    out += view.getUint8(i).toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Arc packet v1 (little-endian, 12 bytes):
 *   0      uint8   version (0x01)
 *   1–2    uint16  sequence
 *   3–4    int16   temperature ×100 (°C)
 *   5      uint8   heart rate (bpm), 0 = unknown
 *   6–7    uint16  inter-beat interval (ms), 0 = unknown
 *   8      uint8   humidity (%), 0xFF = unknown
 *   9–11   reserved
 *
 * Anything shorter, or with an unknown version byte, is rejected as invalid so
 * the diagnostics screen can count and show it rather than silently drift.
 */
export function parseSensorPacket(view: DataView, at = Date.now()): SensorSample {
  const hex = toHex(view);
  if (view.byteLength < 9) {
    throw new InvalidPacketError(`Packet too short (${view.byteLength} bytes)`);
  }
  const version = view.getUint8(0);
  if (version !== 0x01) {
    throw new InvalidPacketError(`Unsupported packet version 0x${version.toString(16)}`);
  }

  const sequence = view.getUint16(1, true);
  const rawTemp = view.getInt16(3, true);
  const heartRate = view.getUint8(5);
  const ibi = view.getUint16(6, true);
  const humidity = view.getUint8(8);

  return {
    at,
    sequence,
    temperatureC: rawTemp === -32768 ? null : Math.round((rawTemp / 100) * 100) / 100,
    heartRate: heartRate === 0 ? null : heartRate,
    ibiMs: ibi === 0 ? null : ibi,
    humidity: humidity === 0xff ? null : humidity,
    hex,
  };
}
