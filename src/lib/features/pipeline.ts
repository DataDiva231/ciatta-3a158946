/**
 * The feature pipeline.
 *
 * Stages, each independent and reusable:
 *   receive observations → group by sensor and session → compute → validate →
 *   persist (store) → publish (service).
 *
 * This module owns grouping, computing and validating. It knows nothing about
 * Bluetooth, and nothing about the Intelligence Engine.
 */
import type { BiologicalObservation } from "@/lib/observations/model";

import {
  newFeatureId,
  PROCESSING_VERSION,
  type FeatureProcessor,
  type FeatureWindow,
  type PhysiologicalFeature,
} from "./model";
import { FEATURE_PROCESSORS } from "./processors";

/** Stage: group. One window per session, observations bucketed by sensor type. */
export function groupIntoWindows(
  observations: BiologicalObservation[],
  window: { from: number; to: number },
): FeatureWindow[] {
  const bySession = new Map<string, FeatureWindow>();
  for (const observation of observations) {
    if (observation.validationStatus !== "valid") continue;
    if (observation.timestamp < window.from || observation.timestamp > window.to) continue;
    let entry = bySession.get(observation.sessionId);
    if (!entry) {
      entry = { sessionId: observation.sessionId, from: window.from, to: window.to, bySensor: {} };
      bySession.set(observation.sessionId, entry);
    }
    const list = (entry.bySensor[observation.sensorType] ??= []);
    list.push({
      id: observation.id,
      timestamp: observation.timestamp,
      value: observation.value,
      quality: observation.quality.score,
    });
  }
  for (const entry of bySession.values()) {
    for (const list of Object.values(entry.bySensor)) list?.sort((a, b) => a.timestamp - b.timestamp);
  }
  return [...bySession.values()];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Stage: validate. Quality is inherited from the source observations;
 * confidence reflects how much data stood behind the value. Thin support means
 * low confidence — never a discarded feature.
 */
export function scoreFeature(
  processor: FeatureProcessor,
  window: FeatureWindow,
  sourceIds: string[],
): { quality: number; confidence: number } {
  const all = Object.values(window.bySensor).flatMap((list) => list ?? []);
  const sources = new Set(sourceIds);
  const used = all.filter((sample) => sources.has(sample.id));
  const pool = used.length ? used : all;
  const quality = pool.length
    ? pool.reduce((total, sample) => total + sample.quality, 0) / pool.length
    : 0;
  const support = clamp01(sourceIds.length / processor.idealObservations);
  return {
    quality: Math.round(clamp01(quality) * 100) / 100,
    confidence: Math.round(clamp01(quality * 0.4 + support * 0.6) * 100) / 100,
  };
}

/** Stage: compute + validate, across every registered processor. */
export function extractFeatures(
  window: FeatureWindow,
  processors: FeatureProcessor[] = FEATURE_PROCESSORS,
): PhysiologicalFeature[] {
  const observationCount = Object.values(window.bySensor).reduce(
    (total, list) => total + (list?.length ?? 0),
    0,
  );

  const features: PhysiologicalFeature[] = [];
  for (const processor of processors) {
    const hasSensors = processor.requiredSensors.every(
      (sensor) => (window.bySensor[sensor]?.length ?? 0) > 0,
    );
    if (!hasSensors) continue;

    const computed = processor.compute(window);
    if (!computed || !Number.isFinite(computed.value)) continue;

    const { quality, confidence } = scoreFeature(processor, window, computed.sourceIds);
    features.push({
      id: newFeatureId(),
      timestamp: window.to,
      featureType: processor.featureType,
      value: computed.value,
      unit: processor.unit,
      sourceObservationIds: computed.sourceIds,
      sessionId: window.sessionId,
      quality,
      confidence,
      processingSuccess: true,
      processingVersion: PROCESSING_VERSION,
      window: { from: window.from, to: window.to, observationCount },
    });
  }
  return features;
}
