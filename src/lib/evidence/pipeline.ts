/**
 * The evidence pipeline.
 *
 * Stages, each independent and reusable:
 *   receive features → group related features → assess temporal context →
 *   fuse complementary features → calculate confidence → persist (store) →
 *   publish (service).
 *
 * This module owns grouping, temporal context, fusion and confidence. It knows
 * nothing about Bluetooth, observations' transport, or the Intelligence Engine.
 */
import type { PhysiologicalFeature } from "@/lib/features/model";

import {
  EVIDENCE_PROCESSING_VERSION,
  newEvidenceId,
  type BiologicalEvidence,
  type EvidenceProcessor,
  type EvidenceWindow,
} from "./model";
import { EVIDENCE_PROCESSORS } from "./processors";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Stage: group. One window per session, features bucketed by feature type. */
export function groupIntoEvidenceWindows(
  features: PhysiologicalFeature[],
  window: { from: number; to: number },
): EvidenceWindow[] {
  const bySession = new Map<string, EvidenceWindow>();
  for (const feature of features) {
    if (!feature.processingSuccess) continue;
    if (feature.timestamp < window.from || feature.timestamp > window.to) continue;
    let entry = bySession.get(feature.sessionId);
    if (!entry) {
      entry = { sessionId: feature.sessionId, from: window.from, to: window.to, byType: {} };
      bySession.set(feature.sessionId, entry);
    }
    const list = (entry.byType[feature.featureType] ??= []);
    list.push(feature);
  }
  for (const entry of bySession.values()) {
    for (const list of Object.values(entry.byType)) list?.sort((a, b) => a.timestamp - b.timestamp);
  }
  return [...bySession.values()];
}

/**
 * Stage: assess temporal context. How much of the window the supporting
 * features actually span, and how evenly.
 */
export function temporalContext(
  window: EvidenceWindow,
  features: PhysiologicalFeature[],
): { coverage: number; continuity: number; spanMs: number } {
  if (!features.length) return { coverage: 0, continuity: 0, spanMs: 0 };
  const stamps = features.map((feature) => feature.timestamp).sort((a, b) => a - b);
  const spanMs = stamps.at(-1)! - stamps[0]!;
  const width = Math.max(1, window.to - window.from);
  const coverage = clamp01(spanMs / width);

  if (stamps.length < 3) return { coverage, continuity: coverage, spanMs };
  const gaps: number[] = [];
  for (let index = 1; index < stamps.length; index += 1) gaps.push(stamps[index]! - stamps[index - 1]!);
  const average = mean(gaps);
  const spread = average
    ? Math.sqrt(mean(gaps.map((gap) => (gap - average) ** 2))) / average
    : 1;
  return { coverage, continuity: clamp01(1 - spread * 0.5), spanMs };
}

/**
 * Stage: calculate confidence.
 *
 * Deterministic and model-free: feature quality, feature confidence,
 * observation continuity, sensor agreement, time coverage and completeness.
 */
export function evidenceConfidence(
  processor: EvidenceProcessor,
  window: EvidenceWindow,
  features: PhysiologicalFeature[],
): BiologicalEvidence["confidenceBreakdown"] & { confidence: number } {
  const featureQuality = clamp01(mean(features.map((feature) => feature.quality)));
  const featureConfidence = clamp01(mean(features.map((feature) => feature.confidence)));
  const { coverage, continuity } = temporalContext(window, features);

  const expected = [...processor.requiredFeatures, ...(processor.optionalFeatures ?? [])];
  const present = expected.filter((type) => (window.byType[type]?.length ?? 0) > 0);
  const completeness = expected.length ? present.length / expected.length : 1;

  /** Sensor agreement: do the fused feature types corroborate each other? */
  const sensorAgreement =
    present.length < 2
      ? 0.5
      : clamp01(
          mean(
            present.map((type) => {
              const values = (window.byType[type] ?? []).map((feature) => feature.value);
              if (values.length < 2) return 0.6;
              const average = mean(values);
              if (!average) return 0.8;
              const deviation =
                Math.sqrt(mean(values.map((value) => (value - average) ** 2))) / Math.abs(average);
              return 1 - Math.min(1, deviation);
            }),
          ),
        );

  const supportPerType = clamp01(
    mean(
      processor.requiredFeatures.map((type) =>
        clamp01((window.byType[type]?.length ?? 0) / processor.idealFeatures),
      ),
    ),
  );

  const confidence = clamp01(
    featureQuality * 0.25 +
      featureConfidence * 0.25 +
      continuity * 0.15 +
      sensorAgreement * 0.1 +
      Math.max(coverage, supportPerType) * 0.15 +
      completeness * 0.1,
  );

  const to2 = (value: number) => Math.round(value * 100) / 100;
  return {
    featureQuality: to2(featureQuality),
    featureConfidence: to2(featureConfidence),
    observationContinuity: to2(continuity),
    sensorAgreement: to2(sensorAgreement),
    timeCoverage: to2(Math.max(coverage, supportPerType)),
    completeness: to2(completeness),
    confidence: to2(confidence),
  };
}

/** Stage: fuse + calculate confidence, across every registered processor. */
export function buildEvidence(
  window: EvidenceWindow,
  processors: EvidenceProcessor[] = EVIDENCE_PROCESSORS,
): BiologicalEvidence[] {
  const featureCount = Object.values(window.byType).reduce(
    (total, list) => total + (list?.length ?? 0),
    0,
  );

  const evidence: BiologicalEvidence[] = [];
  for (const processor of processors) {
    const hasRequired = processor.requiredFeatures.every(
      (type) => (window.byType[type]?.length ?? 0) > 0,
    );
    if (!hasRequired) continue;

    const fused = processor.fuse(window);
    if (!fused || !Number.isFinite(fused.value) || !fused.features.length) continue;

    const { confidence, ...breakdown } = evidenceConfidence(processor, window, fused.features);
    const observationIds = new Set<string>();
    for (const feature of fused.features) {
      for (const id of feature.sourceObservationIds) observationIds.add(id);
    }

    evidence.push({
      id: newEvidenceId(),
      timestamp: window.to,
      evidenceType: processor.evidenceType,
      value: fused.value,
      unit: processor.unit,
      components: fused.components,
      supportingFeatureIds: fused.features.map((feature) => feature.id),
      supportingObservationIds: [...observationIds],
      sessionId: window.sessionId,
      confidence,
      confidenceBreakdown: breakdown,
      timeWindow: { from: window.from, to: window.to, featureCount },
      processingVersion: EVIDENCE_PROCESSING_VERSION,
    });
  }
  return evidence;
}
