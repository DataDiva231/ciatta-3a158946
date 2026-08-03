/**
 * Stage: summarise.
 *
 * When a session ends we ask each layer what it produced during that window and
 * roll it up once. Nothing is recomputed and nothing is duplicated: the summary
 * holds counts, quality and references to the intelligence that already exists.
 */
import { evidenceStore } from "@/lib/evidence/store";
import { featureStore } from "@/lib/features/store";
import { intelligenceStore } from "@/lib/intelligence/store";
import type { Intelligence } from "@/lib/intelligence/model";
import { observationStore } from "@/lib/observations/store";
import type { SensorType } from "@/lib/observations/model";

import {
  SESSION_PROCESSING_VERSION,
  type BiologicalSession,
  type SessionCounts,
  type SessionQuality,
  type SessionSummary,
} from "./model";

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export type SessionRollup = {
  counts: SessionCounts;
  sensorsActive: SensorType[];
  quality: SessionQuality;
  rejectedCount: number;
  lastObservationAt: number | null;
  keyIntelligence: Intelligence[];
};

/** Reads each layer's store for one observation session and rolls it up. */
export function rollupSession(observationSessionId: string): SessionRollup {
  const observations = observationStore.query({ sessionId: observationSessionId });
  const features = featureStore.query({ sessionId: observationSessionId });
  const evidence = evidenceStore.query({ sessionId: observationSessionId });
  const intelligence = intelligenceStore.query({ sessionId: observationSessionId });

  const accepted = observations.filter((item) => item.validationStatus === "valid");
  const rejectedCount = observations.length - accepted.length;
  const sensorsActive = [...new Set(accepted.map((item) => item.sensorType))].sort();

  const signal = mean(accepted.map((item) => item.quality.score));
  const completeness = observations.length ? accepted.length / observations.length : 0;
  const confidence = mean(intelligence.map((item) => item.confidence));
  const score = accepted.length ? signal * 0.6 + completeness * 0.25 + confidence * 0.15 : 0;

  /** One entry per domain: the highest-confidence intelligence it produced. */
  const strongest = new Map<string, Intelligence>();
  for (const item of intelligence) {
    const current = strongest.get(item.domain);
    if (!current || item.confidence > current.confidence) strongest.set(item.domain, item);
  }

  return {
    counts: {
      observations: accepted.length,
      features: features.length,
      evidence: evidence.length,
      intelligence: intelligence.length,
    },
    sensorsActive,
    quality: {
      score: round(score),
      signal: round(signal),
      completeness: round(completeness),
      confidence: round(confidence),
    },
    rejectedCount,
    lastObservationAt: accepted.at(-1)?.timestamp ?? null,
    keyIntelligence: [...strongest.values()].sort((a, b) => b.confidence - a.confidence),
  };
}

/** Built once, at session end. Stored, never rendered in the product yet. */
export function buildSessionSummary(
  session: BiologicalSession,
  rollup: SessionRollup,
  now = Date.now(),
): SessionSummary {
  const startedAt = typeof performance !== "undefined" ? performance.now() : now;
  const keyIntelligence = rollup.keyIntelligence.map((item) => ({
    intelligenceId: item.id,
    domain: item.domain,
    status: item.status,
    title: item.title,
    summary: item.summary,
    confidence: item.confidence,
  }));
  const processingMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;

  return {
    sessionId: session.id,
    generatedAt: now,
    durationMs: session.durationMs,
    sensorsActive: rollup.sensorsActive,
    quality: rollup.quality,
    counts: rollup.counts,
    keyIntelligence,
    confidence: round(mean(keyIntelligence.map((item) => item.confidence))),
    processingMs: round(processingMs),
    processingVersion: SESSION_PROCESSING_VERSION,
  };
}
