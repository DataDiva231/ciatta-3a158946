/**
 * The physiological feature model.
 *
 * A feature is a derived, standardized reading computed from a window of
 * biological observations. Downstream layers (Evidence, Intelligence) consume
 * features — never raw observations, never Bluetooth.
 *
 * Every feature carries the ids of the observations it was computed from, so a
 * value can always be traced back to the signal that produced it.
 */
import type { SensorType } from "@/lib/observations/model";

export type FeatureType =
  | "heart_rate"
  | "heart_rate_variability"
  | "skin_temperature"
  | "motion_intensity"
  | "wear_status"
  | "signal_stability";

export type FeatureUnit = "bpm" | "ms" | "celsius" | "index" | "ratio";

/** Bumped whenever a processor's maths changes, so stored features stay readable. */
export const PROCESSING_VERSION = "0d.1";

/** Trailing window each extraction pass looks at. */
export const FEATURE_WINDOW_MS = 30_000;

/** Minimum spacing between extraction passes. */
export const EXTRACTION_INTERVAL_MS = 2_000;

export type PhysiologicalFeature = {
  id: string;
  /** Milliseconds since epoch — the end of the window this feature describes. */
  timestamp: number;
  featureType: FeatureType;
  value: number;
  unit: FeatureUnit;
  /** Observation ids this value was computed from. Full traceability. */
  sourceObservationIds: string[];
  sessionId: string;
  /** 0–1, inherited from the signal quality of the source observations. */
  quality: number;
  /** 0–1, how much supporting data stood behind the computation. */
  confidence: number;
  /** False when a processor ran but could not produce a usable value. */
  processingSuccess: boolean;
  processingVersion: string;
  /** Window this feature summarises. */
  window: { from: number; to: number; observationCount: number };
};

export const FEATURE_LABELS: Record<FeatureType, string> = {
  heart_rate: "Heart rate",
  heart_rate_variability: "Heart rate variability",
  skin_temperature: "Skin temperature",
  motion_intensity: "Motion intensity",
  wear_status: "Wear status",
  signal_stability: "Signal stability",
};

/** One window of observations, grouped by sensor type, for one session. */
export type FeatureWindow = {
  sessionId: string;
  from: number;
  to: number;
  bySensor: Partial<Record<SensorType, { id: string; timestamp: number; value: number; quality: number }[]>>;
};

/**
 * A processor turns one window into at most one feature. Sensor-agnostic by
 * construction: it declares what it needs and is handed only that.
 */
export type FeatureProcessor = {
  featureType: FeatureType;
  unit: FeatureUnit;
  requiredSensors: SensorType[];
  /** Below this many supporting observations the feature is low-confidence, not dropped. */
  idealObservations: number;
  compute: (window: FeatureWindow) => { value: number; sourceIds: string[] } | null;
};

export function newFeatureId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `feat_${Date.now().toString(36)}_${random}`;
}
