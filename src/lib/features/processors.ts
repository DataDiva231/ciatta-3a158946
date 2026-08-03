/**
 * Stage: compute.
 *
 * One processor per feature. Each reads only the sensors it declares, so a new
 * feature is a new entry in this list — the pipeline itself never changes.
 */
import type { FeatureProcessor, FeatureWindow } from "./model";

type Sample = { id: string; timestamp: number; value: number; quality: number };

function samples(window: FeatureWindow, sensor: keyof FeatureWindow["bySensor"]): Sample[] {
  return window.bySensor[sensor] ?? [];
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Mean heart rate across the window. */
const heartRate: FeatureProcessor = {
  featureType: "heart_rate",
  unit: "bpm",
  requiredSensors: ["heart_rate"],
  idealObservations: 10,
  compute: (window) => {
    const found = samples(window, "heart_rate");
    if (!found.length) return null;
    return { value: round(mean(found.map((s) => s.value)), 1), sourceIds: found.map((s) => s.id) };
  },
};

/** RMSSD over consecutive beat-to-beat intervals — the standard short-window HRV. */
const heartRateVariability: FeatureProcessor = {
  featureType: "heart_rate_variability",
  unit: "ms",
  requiredSensors: ["heart_rate_interval"],
  idealObservations: 20,
  compute: (window) => {
    const found = samples(window, "heart_rate_interval");
    if (found.length < 2) return null;
    const differences: number[] = [];
    for (let index = 1; index < found.length; index += 1) {
      differences.push((found[index]!.value - found[index - 1]!.value) ** 2);
    }
    return {
      value: round(Math.sqrt(mean(differences)), 1),
      sourceIds: found.map((s) => s.id),
    };
  },
};

/** Mean skin temperature across the window. */
const skinTemperature: FeatureProcessor = {
  featureType: "skin_temperature",
  unit: "celsius",
  requiredSensors: ["skin_temperature"],
  idealObservations: 10,
  compute: (window) => {
    const found = samples(window, "skin_temperature");
    if (!found.length) return null;
    return { value: round(mean(found.map((s) => s.value)), 2), sourceIds: found.map((s) => s.id) };
  },
};

/**
 * Motion intensity, 0–1. Derived from the motion sub-score the observation
 * layer already assesses: sustained beat-to-beat instability reads as movement.
 */
const motionIntensity: FeatureProcessor = {
  featureType: "motion_intensity",
  unit: "index",
  requiredSensors: ["heart_rate"],
  idealObservations: 10,
  compute: (window) => {
    const found = samples(window, "heart_rate");
    if (found.length < 2) return null;
    const deltas: number[] = [];
    for (let index = 1; index < found.length; index += 1) {
      deltas.push(Math.abs(found[index]!.value - found[index - 1]!.value));
    }
    const intensity = Math.min(1, mean(deltas) / 20);
    return { value: round(intensity), sourceIds: found.map((s) => s.id) };
  },
};

/** Wear status, 0–1: skin-range temperature means the band is on the body. */
const wearStatus: FeatureProcessor = {
  featureType: "wear_status",
  unit: "ratio",
  requiredSensors: ["skin_temperature"],
  idealObservations: 6,
  compute: (window) => {
    const found = samples(window, "skin_temperature");
    if (!found.length) return null;
    const worn = found.filter((sample) => sample.value >= 30 && sample.value <= 38).length;
    return { value: round(worn / found.length), sourceIds: found.map((s) => s.id) };
  },
};

/** Signal stability, 0–1: mean signal quality of everything in the window. */
const signalStability: FeatureProcessor = {
  featureType: "signal_stability",
  unit: "ratio",
  requiredSensors: [],
  idealObservations: 20,
  compute: (window) => {
    const found = Object.values(window.bySensor).flatMap((list) => list ?? []);
    if (!found.length) return null;
    return { value: round(mean(found.map((s) => s.quality))), sourceIds: found.map((s) => s.id) };
  },
};

/** Add a processor here and the pipeline picks it up. Nothing else changes. */
export const FEATURE_PROCESSORS: FeatureProcessor[] = [
  heartRate,
  heartRateVariability,
  skinTemperature,
  motionIntensity,
  wearStatus,
  signalStability,
];
