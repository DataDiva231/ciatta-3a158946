/**
 * Evidence Service — the single source of biological evidence.
 *
 * It subscribes to the Feature Service, runs the evidence pipeline on a
 * trailing window, persists to the Evidence Store and publishes updates. The
 * Intelligence Engine consumes evidence from here and never touches features,
 * observations or Bluetooth.
 */
import { featureService } from "@/lib/features/service";
import type { PhysiologicalFeature } from "@/lib/features/model";

import {
  EVIDENCE_PROCESSING_VERSION,
  EVIDENCE_WINDOW_MS,
  FUSION_INTERVAL_MS,
  type BiologicalEvidence,
  type EvidenceType,
} from "./model";
import { buildEvidence, groupIntoEvidenceWindows } from "./pipeline";
import { evidenceStore } from "./store";

export type EvidenceSnapshot = {
  sessionId: string | null;
  /** Evidence objects stored during this run. */
  evidenceCount: number;
  /** Fusion passes completed. */
  passCount: number;
  /** Most recent evidence per type. */
  latest: Partial<Record<EvidenceType, BiologicalEvidence>>;
  lastFusedAt: number | null;
  /** Evidence per minute, over the current session. */
  fusionRate: number | null;
  lastLatencyMs: number | null;
  averageLatencyMs: number | null;
  /** Rolling mean confidence over the last 60 evidence objects. */
  averageConfidence: number | null;
  /** Supporting features / observations behind the latest pass. */
  lastSupport: { features: number; observations: number };
  processingVersion: string;
};

export const EMPTY_EVIDENCE_SNAPSHOT: EvidenceSnapshot = {
  sessionId: null,
  evidenceCount: 0,
  passCount: 0,
  latest: {},
  lastFusedAt: null,
  fusionRate: null,
  lastLatencyMs: null,
  averageLatencyMs: null,
  averageConfidence: null,
  lastSupport: { features: 0, observations: 0 },
  processingVersion: EVIDENCE_PROCESSING_VERSION,
};

function meanOf(values: number[], places = 2): number | null {
  if (!values.length) return null;
  const factor = 10 ** places;
  return (
    Math.round((values.reduce((total, value) => total + value, 0) / values.length) * factor) / factor
  );
}

class EvidenceService {
  private snapshot: EvidenceSnapshot = EMPTY_EVIDENCE_SNAPSHOT;
  private listeners = new Set<(snapshot: EvidenceSnapshot) => void>();
  private evidenceListeners = new Set<(evidence: BiologicalEvidence[]) => void>();
  private unsubscribe: (() => void) | null = null;
  private lastRunAt = 0;
  private startedAt: number | null = null;
  private latencies: number[] = [];
  private confidences: number[] = [];

  getSnapshot = (): EvidenceSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: EvidenceSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stage: publish. The Intelligence Engine subscribes here. */
  subscribeEvidence = (listener: (evidence: BiologicalEvidence[]) => void): (() => void) => {
    this.evidenceListeners.add(listener);
    return () => {
      this.evidenceListeners.delete(listener);
    };
  };

  /** Read interface for downstream consumers. */
  query = evidenceStore.query;
  latestByType = evidenceStore.latestByType;

  /** Starts listening to the Feature Service. Safe to call repeatedly. */
  start(): void {
    if (this.unsubscribe) return;
    featureService.start();
    this.unsubscribe = featureService.subscribeFeatures(this.onFeatures);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private patch(next: Partial<EvidenceSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Stage: receive. Throttled so one pass covers many features. */
  private onFeatures = (features: PhysiologicalFeature[]): void => {
    const sessionId = features.at(-1)?.sessionId ?? null;
    if (sessionId && sessionId !== this.snapshot.sessionId) {
      this.latencies = [];
      this.confidences = [];
      this.startedAt = Date.now();
      this.lastRunAt = 0;
      this.snapshot = { ...EMPTY_EVIDENCE_SNAPSHOT, sessionId };
    }
    const now = Date.now();
    if (now - this.lastRunAt < FUSION_INTERVAL_MS) return;
    this.lastRunAt = now;
    if (sessionId) this.runPass(sessionId, now);
  };

  /** One full pass: group → temporal context → fuse → confidence → persist → publish. */
  runPass(sessionId: string, now = Date.now()): BiologicalEvidence[] {
    const startedAt = typeof performance !== "undefined" ? performance.now() : now;
    const from = now - EVIDENCE_WINDOW_MS;
    const features = featureService.query({ sessionId, from, to: now });
    const windows = groupIntoEvidenceWindows(features, { from, to: now });
    const produced = windows.flatMap((window) => buildEvidence(window));
    const stored = produced.length ? evidenceStore.append(produced) : [];
    const latency = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;

    this.latencies = [...this.latencies, Math.round(latency * 100) / 100].slice(-20);
    this.confidences = [...this.confidences, ...stored.map((item) => item.confidence)].slice(-60);

    const latest = { ...this.snapshot.latest };
    for (const item of stored) latest[item.evidenceType] = item;

    const supportFeatures = new Set(stored.flatMap((item) => item.supportingFeatureIds));
    const supportObservations = new Set(stored.flatMap((item) => item.supportingObservationIds));

    this.startedAt ??= now;
    const elapsedMinutes = Math.max(1 / 60, (now - this.startedAt) / 60_000);
    const evidenceCount = this.snapshot.evidenceCount + stored.length;

    this.patch({
      sessionId,
      evidenceCount,
      passCount: this.snapshot.passCount + 1,
      latest,
      lastFusedAt: now,
      fusionRate: Math.round((evidenceCount / elapsedMinutes) * 10) / 10,
      lastLatencyMs: Math.round(latency * 100) / 100,
      averageLatencyMs: meanOf(this.latencies),
      averageConfidence: meanOf(this.confidences),
      lastSupport: stored.length
        ? { features: supportFeatures.size, observations: supportObservations.size }
        : this.snapshot.lastSupport,
    });

    if (stored.length) {
      for (const listener of this.evidenceListeners) listener(stored);
    }
    return stored;
  }

  reset(): void {
    evidenceStore.clear();
    this.latencies = [];
    this.confidences = [];
    this.startedAt = null;
    this.lastRunAt = 0;
    this.patch({ ...EMPTY_EVIDENCE_SNAPSHOT });
  }
}

/** One service for the whole app. */
export const evidenceService = new EvidenceService();
