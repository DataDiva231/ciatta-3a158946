/**
 * Stage: assess quality.
 *
 * A 0–1 read on how much the signal can be trusted, broken into the reasons
 * behind it. Advisory only: nothing user-facing consumes this yet.
 */
import type { SensorType, SignalQuality } from "./model";

export type QualityContext = {
  rssi: number | null;
  connected: boolean;
  /** Reconnections observed during this session. */
  reconnects: number;
  /** Gap between this sequence number and the previous one (1 = continuous). */
  sequenceGap: number | null;
  /** Milliseconds since the previous packet. */
  sinceLastPacket: number | null;
  /** Latest skin temperature, used as a wear signal. */
  temperatureC: number | null;
  /** Absolute change in heart rate since the previous reading. */
  heartRateDelta: number | null;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Radio strength: -55 dBm or better is excellent, -95 is unusable. */
function signalIntegrityOf(rssi: number | null): number {
  if (rssi === null) return 0.7;
  return clamp01((rssi + 95) / 40);
}

/** Skin contact: worn skin sits around 30–37 °C; room temperature means off-body. */
function wearOf(temperatureC: number | null): number {
  if (temperatureC === null) return 0.6;
  if (temperatureC >= 30 && temperatureC <= 38) return 1;
  if (temperatureC >= 26) return 0.6;
  return 0.25;
}

/** Motion artifacts show up as implausible beat-to-beat jumps. */
function motionOf(heartRateDelta: number | null): number {
  if (heartRateDelta === null) return 0.85;
  return clamp01(1 - heartRateDelta / 40);
}

function stabilityOf(connected: boolean, reconnects: number): number {
  if (!connected) return 0;
  return clamp01(1 - reconnects * 0.2);
}

function continuityOf(sequenceGap: number | null, sinceLastPacket: number | null): number {
  if (sequenceGap === null) return sinceLastPacket === null ? 0.8 : 0.9;
  if (sequenceGap <= 1) return 1;
  return clamp01(1 - (sequenceGap - 1) * 0.15);
}

const WEIGHTS: Record<keyof Omit<SignalQuality, "score">, number> = {
  signalIntegrity: 0.25,
  wear: 0.25,
  motion: 0.15,
  connectionStability: 0.15,
  packetContinuity: 0.2,
};

export function assessQuality(sensorType: SensorType, context: QualityContext): SignalQuality {
  const parts = {
    signalIntegrity: signalIntegrityOf(context.rssi),
    wear: wearOf(context.temperatureC),
    motion:
      sensorType === "heart_rate" || sensorType === "heart_rate_interval"
        ? motionOf(context.heartRateDelta)
        : 0.95,
    connectionStability: stabilityOf(context.connected, context.reconnects),
    packetContinuity: continuityOf(context.sequenceGap, context.sinceLastPacket),
  };
  const score = Object.entries(WEIGHTS).reduce(
    (total, [key, weight]) => total + parts[key as keyof typeof parts] * weight,
    0,
  );
  return { ...parts, score: Math.round(clamp01(score) * 100) / 100 };
}
