/**
 * The biological evidence model.
 *
 * Evidence is a fusion of complementary physiological features over a time
 * window. It is not a biological conclusion: nothing here interprets what a
 * value means for a person. It only states, with a confidence, what the body
 * measurably did.
 *
 * Every evidence object carries both the feature ids it fused and the
 * observation ids underneath them, so any value can be traced to signal.
 */
import type { FeatureType, PhysiologicalFeature } from "@/lib/features/model";

export type EvidenceType =
  | "cardiovascular"
  | "thermal"
  | "motion"
  | "wear_quality"
  | "signal_quality";

export type EvidenceUnit = "bpm" | "ms" | "celsius" | "index" | "ratio";

/** Bumped whenever fusion or confidence maths changes. */
export const EVIDENCE_PROCESSING_VERSION = "0e.1";

/** Trailing window each fusion pass considers. */
export const EVIDENCE_WINDOW_MS = 120_000;

/** Minimum spacing between fusion passes. */
export const FUSION_INTERVAL_MS = 5_000;

export type BiologicalEvidence = {
  id: string;
  /** Milliseconds since epoch — the end of the window this evidence describes. */
  timestamp: number;
  evidenceType: EvidenceType;
  /** Primary value; components carry the rest of the fused detail. */
  value: number;
  unit: EvidenceUnit;
  /** The fused feature values behind this evidence, by feature type. */
  components: Partial<Record<FeatureType, number>>;
  supportingFeatureIds: string[];
  supportingObservationIds: string[];
  sessionId: string;
  /** 0–1. Independent of any AI model. */
  confidence: number;
  /** The inputs to the confidence calculation, kept for inspection. */
  confidenceBreakdown: {
    featureQuality: number;
    featureConfidence: number;
    observationContinuity: number;
    sensorAgreement: number;
    timeCoverage: number;
    completeness: number;
  };
  timeWindow: { from: number; to: number; featureCount: number };
  processingVersion: string;
};

export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  cardiovascular: "Cardiovascular",
  thermal: "Thermal",
  motion: "Motion",
  wear_quality: "Wear quality",
  signal_quality: "Signal quality",
};

/** One window of features for one session, bucketed by feature type. */
export type EvidenceWindow = {
  sessionId: string;
  from: number;
  to: number;
  byType: Partial<Record<FeatureType, PhysiologicalFeature[]>>;
};

/**
 * A processor fuses one window into at most one evidence object. It declares
 * the features it needs; optional features widen the fusion when present.
 */
export type EvidenceProcessor = {
  evidenceType: EvidenceType;
  unit: EvidenceUnit;
  requiredFeatures: FeatureType[];
  optionalFeatures?: FeatureType[];
  /** Feature count per required type at which time coverage counts as full. */
  idealFeatures: number;
  fuse: (
    window: EvidenceWindow,
  ) => {
    value: number;
    components: Partial<Record<FeatureType, number>>;
    features: PhysiologicalFeature[];
  } | null;
};

export function newEvidenceId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `evid_${Date.now().toString(36)}_${random}`;
}
