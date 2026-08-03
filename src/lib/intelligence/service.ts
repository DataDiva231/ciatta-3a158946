/**
 * Intelligence Service — the single source of structured understanding.
 *
 * It subscribes to the evidence source through the adapter, runs the
 * intelligence pipeline on a trailing window, persists to the Intelligence
 * Store and publishes updates. It knows nothing about features, observations,
 * Bluetooth or the UI.
 */
import type { BiologicalEvidence } from "@/lib/evidence/model";

import { evidenceSource } from "./evidence-source";
import {
  INTELLIGENCE_INTERVAL_MS,
  INTELLIGENCE_PROCESSING_VERSION,
  INTELLIGENCE_WINDOW_MS,
  type DomainHistory,
  type Intelligence,
  type IntelligenceDomain,
  type IntelligenceStatus,
} from "./model";
import { buildIntelligence, groupIntoIntelligenceWindows } from "./pipeline";
import { intelligenceStore } from "./store";

export type IntelligenceSnapshot = {
  sessionId: string | null;
  /** Intelligence objects stored during this run. */
  intelligenceCount: number;
  /** Understanding passes completed. */
  passCount: number;
  /** Most recent intelligence per domain. */
  latest: Partial<Record<IntelligenceDomain, Intelligence>>;
  /** How many current objects sit in each learning state. */
  states: Record<IntelligenceStatus, number>;
  lastGeneratedAt: number | null;
  /** Intelligence per minute, over the current session. */
  generationRate: number | null;
  lastLatencyMs: number | null;
  averageLatencyMs: number | null;
  /** Rolling mean confidence over the last 60 intelligence objects. */
  averageConfidence: number | null;
  /** Supporting evidence / features / observations behind the latest pass. */
  lastSupport: { evidence: number; features: number; observations: number };
  processingVersion: string;
};

const EMPTY_STATES: Record<IntelligenceStatus, number> = {
  learning: 0,
  emerging: 0,
  established: 0,
  changing: 0,
};

export const EMPTY_INTELLIGENCE_SNAPSHOT: IntelligenceSnapshot = {
  sessionId: null,
  intelligenceCount: 0,
  passCount: 0,
  latest: {},
  states: EMPTY_STATES,
  lastGeneratedAt: null,
  generationRate: null,
  lastLatencyMs: null,
  averageLatencyMs: null,
  averageConfidence: null,
  lastSupport: { evidence: 0, features: 0, observations: 0 },
  processingVersion: INTELLIGENCE_PROCESSING_VERSION,
};

function meanOf(values: number[], places = 2): number | null {
  if (!values.length) return null;
  const factor = 10 ** places;
  return (
    Math.round((values.reduce((total, value) => total + value, 0) / values.length) * factor) / factor
  );
}

function countStates(
  latest: Partial<Record<IntelligenceDomain, Intelligence>>,
): Record<IntelligenceStatus, number> {
  const states = { ...EMPTY_STATES };
  for (const item of Object.values(latest)) if (item) states[item.status] += 1;
  return states;
}

class IntelligenceService {
  private snapshot: IntelligenceSnapshot = EMPTY_INTELLIGENCE_SNAPSHOT;
  private listeners = new Set<(snapshot: IntelligenceSnapshot) => void>();
  private intelligenceListeners = new Set<(intelligence: Intelligence[]) => void>();
  private unsubscribe: (() => void) | null = null;
  private lastRunAt = 0;
  private startedAt: number | null = null;
  private latencies: number[] = [];
  private confidences: number[] = [];
  private histories: Partial<Record<IntelligenceDomain, DomainHistory>> = {};

  getSnapshot = (): IntelligenceSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: IntelligenceSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stage: publish. Downstream layers subscribe here, never to evidence. */
  subscribeIntelligence = (listener: (intelligence: Intelligence[]) => void): (() => void) => {
    this.intelligenceListeners.add(listener);
    return () => {
      this.intelligenceListeners.delete(listener);
    };
  };

  /** Read interface for downstream consumers. */
  query = intelligenceStore.query;
  latestByDomain = intelligenceStore.latestByDomain;

  /** Starts listening to the evidence source. Safe to call repeatedly. */
  start(): void {
    if (this.unsubscribe) return;
    evidenceSource.start();
    this.unsubscribe = evidenceSource.subscribe(this.onEvidence);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private patch(next: Partial<IntelligenceSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Stage: receive. Throttled so one pass covers many evidence objects. */
  private onEvidence = (evidence: BiologicalEvidence[]): void => {
    const sessionId = evidence.at(-1)?.sessionId ?? null;
    if (sessionId && sessionId !== this.snapshot.sessionId) {
      this.latencies = [];
      this.confidences = [];
      this.histories = {};
      this.startedAt = Date.now();
      this.lastRunAt = 0;
      this.snapshot = { ...EMPTY_INTELLIGENCE_SNAPSHOT, sessionId };
    }
    const now = Date.now();
    if (now - this.lastRunAt < INTELLIGENCE_INTERVAL_MS) return;
    this.lastRunAt = now;
    if (sessionId) this.runPass(sessionId, now);
  };

  /**
   * One full pass: receive → evaluate context → generate understanding →
   * calculate confidence → persist → publish.
   */
  runPass(sessionId: string, now = Date.now()): Intelligence[] {
    const startedAt = typeof performance !== "undefined" ? performance.now() : now;
    const from = now - INTELLIGENCE_WINDOW_MS;
    const evidence = evidenceSource.read({ sessionId, from, to: now });
    const windows = groupIntoIntelligenceWindows(evidence, { from, to: now });
    const produced = windows.flatMap((window) => buildIntelligence(window, this.histories));
    const stored = produced.length ? intelligenceStore.append(produced) : [];
    const latency =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;

    for (const item of stored) {
      const history = this.histories[item.domain] ?? { previous: null, count: 0 };
      this.histories[item.domain] = { previous: item, count: history.count + 1 };
    }

    this.latencies = [...this.latencies, Math.round(latency * 100) / 100].slice(-20);
    this.confidences = [...this.confidences, ...stored.map((item) => item.confidence)].slice(-60);

    const latest = { ...this.snapshot.latest };
    for (const item of stored) latest[item.domain] = item;

    const supportEvidence = new Set(stored.flatMap((item) => item.supportingEvidenceIds));
    const supportFeatures = new Set(stored.flatMap((item) => item.supportingFeatureIds));
    const supportObservations = new Set(stored.flatMap((item) => item.supportingObservationIds));

    this.startedAt ??= now;
    const elapsedMinutes = Math.max(1 / 60, (now - this.startedAt) / 60_000);
    const intelligenceCount = this.snapshot.intelligenceCount + stored.length;

    this.patch({
      sessionId,
      intelligenceCount,
      passCount: this.snapshot.passCount + 1,
      latest,
      states: countStates(latest),
      lastGeneratedAt: now,
      generationRate: Math.round((intelligenceCount / elapsedMinutes) * 10) / 10,
      lastLatencyMs: Math.round(latency * 100) / 100,
      averageLatencyMs: meanOf(this.latencies),
      averageConfidence: meanOf(this.confidences),
      lastSupport: stored.length
        ? {
            evidence: supportEvidence.size,
            features: supportFeatures.size,
            observations: supportObservations.size,
          }
        : this.snapshot.lastSupport,
    });

    if (stored.length) {
      for (const listener of this.intelligenceListeners) listener(stored);
    }
    return stored;
  }

  reset(): void {
    intelligenceStore.clear();
    this.latencies = [];
    this.confidences = [];
    this.histories = {};
    this.startedAt = null;
    this.lastRunAt = 0;
    this.patch({ ...EMPTY_INTELLIGENCE_SNAPSHOT });
  }
}

/** One engine for the whole app. */
export const intelligenceService = new IntelligenceService();
