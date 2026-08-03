/**
 * Stage: validate.
 *
 * Pure checks over a candidate measurement and the stream it arrived on. A
 * failure produces a reason, never an exception — streaming must not stall.
 */
import { SENSOR_RANGES, type RejectionReason, type SensorType } from "./model";

export type StreamContext = {
  connected: boolean;
  /** Sequence numbers already seen this session. */
  seenSequences: Set<number>;
  lastTimestamp: number | null;
  /** Sensors the device has reported at least once this session. */
  availableSensors: Set<SensorType>;
};

export type Candidate = {
  sensorType: SensorType;
  value: number | null;
  sequence: number | null;
  timestamp: number;
};

/** Packet-wide checks, run once per notification. */
export function validatePacket(
  candidateSequence: number | null,
  timestamp: number,
  context: StreamContext,
): RejectionReason | null {
  if (!context.connected) return "device_disconnected";
  if (candidateSequence !== null && context.seenSequences.has(candidateSequence)) {
    return "duplicate_packet";
  }
  if (context.lastTimestamp !== null && timestamp < context.lastTimestamp - 2000) {
    return "timestamp_inconsistent";
  }
  if (timestamp > Date.now() + 60_000) return "timestamp_inconsistent";
  return null;
}

/** Per-measurement checks. */
export function validateCandidate(
  candidate: Candidate,
  context: StreamContext,
): RejectionReason | null {
  if (candidate.value === null || Number.isNaN(candidate.value)) {
    return context.availableSensors.has(candidate.sensorType)
      ? "missing_value"
      : "sensor_unavailable";
  }
  const range = SENSOR_RANGES[candidate.sensorType];
  if (candidate.value < range.min || candidate.value > range.max) return "out_of_range";
  return null;
}
