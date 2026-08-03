/**
 * The biological observation model.
 *
 * One shape for every sensor, present and future: a measurement, its unit, the
 * device and session it came from, how much we trust the signal, and whether it
 * passed validation. Raw values are never rewritten once recorded.
 */

export type SensorType =
  | "skin_temperature"
  | "heart_rate"
  | "heart_rate_interval"
  | "relative_humidity";

export type Unit = "celsius" | "bpm" | "ms" | "percent";

export type ValidationStatus = "valid" | "rejected";

export type RejectionReason =
  | "missing_value"
  | "out_of_range"
  | "duplicate_packet"
  | "timestamp_inconsistent"
  | "device_disconnected"
  | "sensor_unavailable"
  | "malformed_packet";

/** Sub-scores are kept so downstream intelligence can reason about *why*. */
export type SignalQuality = {
  /** 0–1 overall. Advisory only in this sprint. */
  score: number;
  signalIntegrity: number;
  wear: number;
  motion: number;
  connectionStability: number;
  packetContinuity: number;
};

export type BiologicalObservation = {
  id: string;
  /** Milliseconds since epoch, assigned at ingestion. */
  timestamp: number;
  sensorType: SensorType;
  /** The measurement, exactly as parsed. */
  value: number;
  /** Every raw field carried by the source packet. */
  raw: {
    hex: string;
    sequence: number | null;
    fields: Partial<Record<SensorType, number | null>>;
  };
  unit: Unit;
  deviceId: string | null;
  sessionId: string;
  quality: SignalQuality;
  validationStatus: ValidationStatus;
  rejection: RejectionReason | null;
};

export type ObservationSession = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  startedAt: number;
  lastObservationAt: number | null;
};

/** Plausible physiological windows. Anything outside is rejected, not clamped. */
export const SENSOR_RANGES: Record<SensorType, { min: number; max: number; unit: Unit }> = {
  skin_temperature: { min: 20, max: 45, unit: "celsius" },
  heart_rate: { min: 30, max: 220, unit: "bpm" },
  heart_rate_interval: { min: 250, max: 2000, unit: "ms" },
  relative_humidity: { min: 0, max: 100, unit: "percent" },
};

export function unitFor(sensorType: SensorType): Unit {
  return SENSOR_RANGES[sensorType].unit;
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
