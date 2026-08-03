/**
 * Evidence processors — fusion only, no interpretation.
 *
 * Each processor combines complementary features into one standardized value.
 * Adding a new evidence type means adding a processor here; the pipeline does
 * not change.
 */
import type { FeatureType, PhysiologicalFeature } from "@/lib/features/model";

import type { EvidenceProcessor, EvidenceWindow } from "./model";

function samples(window: EvidenceWindow, type: FeatureType): PhysiologicalFeature[] {
  return window.byType[type] ?? [];
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function collect(
  window: EvidenceWindow,
  types: FeatureType[],
): { features: PhysiologicalFeature[]; components: Partial<Record<FeatureType, number>> } {
  const features: PhysiologicalFeature[] = [];
  const components: Partial<Record<FeatureType, number>> = {};
  for (const type of types) {
    const list = samples(window, type);
    if (!list.length) continue;
    features.push(...list);
    components[type] = round(mean(list.map((feature) => feature.value)));
  }
  return { features, components };
}

/** Heart rate + HRV → cardiovascular evidence. */
const cardiovascular: EvidenceProcessor = {
  evidenceType: "cardiovascular",
  unit: "bpm",
  requiredFeatures: ["heart_rate"],
  optionalFeatures: ["heart_rate_variability"],
  idealFeatures: 4,
  fuse: (window) => {
    const { features, components } = collect(window, ["heart_rate", "heart_rate_variability"]);
    if (components.heart_rate === undefined) return null;
    return { value: components.heart_rate, components, features };
  },
};

/** Temperature + signal stability → thermal evidence, with its own quality. */
const thermal: EvidenceProcessor = {
  evidenceType: "thermal",
  unit: "celsius",
  requiredFeatures: ["skin_temperature"],
  optionalFeatures: ["signal_stability"],
  idealFeatures: 4,
  fuse: (window) => {
    const { features, components } = collect(window, ["skin_temperature", "signal_stability"]);
    if (components.skin_temperature === undefined) return null;
    return { value: components.skin_temperature, components, features };
  },
};

/** Motion intensity over the window. */
const motion: EvidenceProcessor = {
  evidenceType: "motion",
  unit: "index",
  requiredFeatures: ["motion_intensity"],
  idealFeatures: 4,
  fuse: (window) => {
    const { features, components } = collect(window, ["motion_intensity"]);
    if (components.motion_intensity === undefined) return null;
    return { value: components.motion_intensity, components, features };
  },
};

/** Wear status + motion → how reliable observations in this window are. */
const wearQuality: EvidenceProcessor = {
  evidenceType: "wear_quality",
  unit: "ratio",
  requiredFeatures: ["wear_status"],
  optionalFeatures: ["motion_intensity"],
  idealFeatures: 4,
  fuse: (window) => {
    const { features, components } = collect(window, ["wear_status", "motion_intensity"]);
    if (components.wear_status === undefined) return null;
    const worn = Math.min(1, Math.max(0, components.wear_status));
    const disturbance = Math.min(1, Math.max(0, components.motion_intensity ?? 0));
    const reliability =
      components.motion_intensity === undefined ? worn : worn * (1 - disturbance * 0.5);
    return { value: round(reliability), components, features };
  },
};

/** Signal stability, tempered by wear, as an overall signal-quality reading. */
const signalQuality: EvidenceProcessor = {
  evidenceType: "signal_quality",
  unit: "ratio",
  requiredFeatures: ["signal_stability"],
  optionalFeatures: ["wear_status"],
  idealFeatures: 4,
  fuse: (window) => {
    const { features, components } = collect(window, ["signal_stability", "wear_status"]);
    if (components.signal_stability === undefined) return null;
    const stability = Math.min(1, Math.max(0, components.signal_stability));
    const worn = components.wear_status;
    const value = worn === undefined ? stability : stability * 0.7 + Math.min(1, worn) * 0.3;
    return { value: round(value), components, features };
  },
};

export const EVIDENCE_PROCESSORS: EvidenceProcessor[] = [
  cardiovascular,
  thermal,
  motion,
  wearQuality,
  signalQuality,
];
