/**
 * The intelligence pipeline.
 *
 * Stages: receive evidence → evaluate biological context → generate
 * understanding → calculate confidence → (persist and publish live in the
 * store and the service). Domain processors plug in; this file never changes
 * when a new domain arrives.
 */
import type { BiologicalEvidence, EvidenceType } from "@/lib/evidence/model";

import {
  INTELLIGENCE_PROCESSING_VERSION,
  newIntelligenceId,
  type DomainHistory,
  type Intelligence,
  type IntelligenceDomain,
  type IntelligenceProcessor,
  type IntelligenceStatus,
  type IntelligenceWindow,
} from "./model";
import { INTELLIGENCE_PROCESSORS } from "./processors";

/** Stage: evaluate biological context. Buckets evidence per session window. */
export function groupIntoIntelligenceWindows(
  evidence: BiologicalEvidence[],
  range: { from: number; to: number },
): IntelligenceWindow[] {
  const bySession = new Map<string, BiologicalEvidence[]>();
  for (const item of evidence) {
    if (item.timestamp < range.from || item.timestamp > range.to) continue;
    const list = bySession.get(item.sessionId);
    if (list) list.push(item);
    else bySession.set(item.sessionId, [item]);
  }

  return [...bySession.entries()].map(([sessionId, items]) => {
    const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
    const byType: Partial<Record<EvidenceType, BiologicalEvidence[]>> = {};
    for (const item of sorted) {
      const list = byType[item.evidenceType];
      if (list) list.push(item);
      else byType[item.evidenceType] = [item];
    }
    return { sessionId, from: range.from, to: range.to, byType, all: sorted };
  });
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Agreement: how tightly the supporting evidence values cluster. */
function agreementOf(evidence: BiologicalEvidence[]): number {
  if (evidence.length < 2) return 0.6;
  const values = evidence.map((item) => item.value);
  const average = mean(values);
  if (average === 0) return 0.8;
  const spread = Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
  return clamp01(1 - spread / Math.abs(average));
}

/** Stage: calculate intelligence confidence. */
function confidenceOf(
  processor: IntelligenceProcessor,
  window: IntelligenceWindow,
  evidence: BiologicalEvidence[],
): Intelligence["confidenceBreakdown"] {
  const evidenceConfidence = round(mean(evidence.map((item) => item.confidence)));
  const evidenceVolume = round(clamp01(evidence.length / (processor.idealEvidence * 1.5)));
  const evidenceAgreement = round(agreementOf(evidence));

  const perRequired = processor.requiredEvidence.map((type) =>
    clamp01((window.byType[type]?.length ?? 0) / processor.idealEvidence),
  );
  const timeCoverage = round(perRequired.length ? Math.min(...perRequired) : 0);

  const wanted = [...processor.requiredEvidence, ...(processor.optionalEvidence ?? [])];
  const present = wanted.filter((type) => (window.byType[type]?.length ?? 0) > 0).length;
  const domainCompleteness = round(wanted.length ? present / wanted.length : 0);

  return {
    evidenceConfidence,
    evidenceVolume,
    evidenceAgreement,
    timeCoverage,
    domainCompleteness,
  };
}

function scoreOf(breakdown: Intelligence["confidenceBreakdown"]): number {
  return round(
    clamp01(
      breakdown.evidenceConfidence * 0.35 +
        breakdown.evidenceVolume * 0.2 +
        breakdown.evidenceAgreement * 0.15 +
        breakdown.timeCoverage * 0.15 +
        breakdown.domainCompleteness * 0.15,
    ),
  );
}

/** Stage: learning state. Confidence and history decide, never the UI. */
function statusOf(
  processor: IntelligenceProcessor,
  confidence: number,
  value: number | null,
  history: DomainHistory,
): IntelligenceStatus {
  const previous = history.previous;
  if (
    previous &&
    value !== null &&
    previous.value !== null &&
    previous.value !== 0 &&
    previous.status !== "learning" &&
    Math.abs(value - previous.value) / Math.abs(previous.value) >= processor.changeThreshold
  )
    return "changing";
  if (confidence >= 0.75 && history.count >= 3) return "established";
  if (confidence >= 0.45) return "emerging";
  return "learning";
}

/** Stage: generate understanding. One window in, zero-or-more intelligence out. */
export function buildIntelligence(
  window: IntelligenceWindow,
  histories: Partial<Record<IntelligenceDomain, DomainHistory>>,
  processors: IntelligenceProcessor[] = INTELLIGENCE_PROCESSORS,
): Intelligence[] {
  const produced: Intelligence[] = [];
  const now = window.to;

  for (const processor of processors) {
    const covered = processor.requiredEvidence.every(
      (type) => (window.byType[type]?.length ?? 0) > 0,
    );
    if (!covered) continue;

    const history = histories[processor.domain] ?? { previous: null, count: 0 };
    const understanding = processor.understand(window, history);
    if (!understanding || !understanding.evidence.length) continue;

    const evidence = understanding.evidence;
    const breakdown = confidenceOf(processor, window, evidence);
    const confidence = scoreOf(breakdown);
    const status = statusOf(processor, confidence, understanding.value, history);

    produced.push({
      id: newIntelligenceId(),
      timestamp: now,
      domain: processor.domain,
      title: understanding.title,
      summary: understanding.summary,
      supportingEvidenceIds: evidence.map((item) => item.id),
      supportingFeatureIds: [...new Set(evidence.flatMap((item) => item.supportingFeatureIds))],
      supportingObservationIds: [
        ...new Set(evidence.flatMap((item) => item.supportingObservationIds)),
      ],
      confidence,
      status,
      sessionId: window.sessionId,
      reason: understanding.reason,
      confidenceBreakdown: breakdown,
      value: understanding.value,
      previousValue: history.previous?.value ?? null,
      timeWindow: { from: window.from, to: window.to, evidenceCount: evidence.length },
      processingVersion: INTELLIGENCE_PROCESSING_VERSION,
    });
  }

  return produced;
}
