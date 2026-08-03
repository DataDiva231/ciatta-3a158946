/**
 * Feature Service — the single source of physiological features.
 *
 * It subscribes to the Observation Service, runs the feature pipeline on a
 * trailing window, persists to the Feature Store and publishes updates. The
 * layer above consumes features from here and never touches observations or
 * Bluetooth.
 */
import { observationService } from "@/lib/observations/service";
import type { BiologicalObservation } from "@/lib/observations/model";

import {
  EXTRACTION_INTERVAL_MS,
  FEATURE_WINDOW_MS,
  PROCESSING_VERSION,
  type FeatureType,
  type PhysiologicalFeature,
} from "./model";
import { extractFeatures, groupIntoWindows } from "./pipeline";
import { featureStore } from "./store";

export type FeatureSnapshot = {
  sessionId: string | null;
  /** Features stored during this run. */
  featureCount: number;
  /** Extraction passes completed. */
  passCount: number;
  /** Most recent value per feature type. */
  latest: Partial<Record<FeatureType, PhysiologicalFeature>>;
  lastExtractedAt: number | null;
  /** Features per minute, over the current session. */
  extractionRate: number | null;
  /** Milliseconds spent in the last extraction pass. */
  lastLatencyMs: number | null;
  /** Rolling mean latency over the last 20 passes. */
  averageLatencyMs: number | null;
  /** Rolling mean quality over the last 60 features. */
  averageQuality: number | null;
  /** Rolling mean confidence over the last 60 features. */
  averageConfidence: number | null;
  processingVersion: string;
};

const EMPTY: FeatureSnapshot = {
  sessionId: null,
  featureCount: 0,
  passCount: 0,
  latest: {},
  lastExtractedAt: null,
  extractionRate: null,
  lastLatencyMs: null,
  averageLatencyMs: null,
  averageQuality: null,
  averageConfidence: null,
  processingVersion: PROCESSING_VERSION,
};

function meanOf(values: number[], places = 2): number | null {
  if (!values.length) return null;
  const factor = 10 ** places;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * factor) / factor;
}

class FeatureService {
  private snapshot: FeatureSnapshot = EMPTY;
  private listeners = new Set<(snapshot: FeatureSnapshot) => void>();
  private featureListeners = new Set<(features: PhysiologicalFeature[]) => void>();
  private unsubscribe: (() => void) | null = null;
  private lastRunAt = 0;
  private startedAt: number | null = null;
  private latencies: number[] = [];
  private qualities: number[] = [];
  private confidences: number[] = [];

  getSnapshot = (): FeatureSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: FeatureSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stage: publish. Downstream layers subscribe here. */
  subscribeFeatures = (listener: (features: PhysiologicalFeature[]) => void): (() => void) => {
    this.featureListeners.add(listener);
    return () => {
      this.featureListeners.delete(listener);
    };
  };

  /** Read interface for downstream consumers. */
  query = featureStore.query;
  latestByType = featureStore.latestByType;

  /** Starts listening to the Observation Service. Safe to call repeatedly. */
  start(): void {
    if (this.unsubscribe) return;
    observationService.start();
    this.unsubscribe = observationService.subscribeObservations(this.onObservations);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private patch(next: Partial<FeatureSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Stage: receive. Throttled so one pass covers many packets. */
  private onObservations = (observations: BiologicalObservation[]): void => {
    const sessionId = observations.at(-1)?.sessionId ?? null;
    if (sessionId && sessionId !== this.snapshot.sessionId) {
      this.latencies = [];
      this.qualities = [];
      this.confidences = [];
      this.startedAt = Date.now();
      this.lastRunAt = 0;
      this.snapshot = { ...EMPTY, sessionId };
    }
    const now = Date.now();
    if (now - this.lastRunAt < EXTRACTION_INTERVAL_MS) return;
    this.lastRunAt = now;
    if (sessionId) this.runPass(sessionId, now);
  };

  /** One full pass: group → compute → validate → persist → publish. */
  runPass(sessionId: string, now = Date.now()): PhysiologicalFeature[] {
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : now;
    const from = now - FEATURE_WINDOW_MS;
    const observations = observationService.query({ sessionId, from, to: now });
    const windows = groupIntoWindows(observations, { from, to: now });
    const produced = windows.flatMap((window) => extractFeatures(window));
    const stored = produced.length ? featureStore.append(produced) : [];
    const latency =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;

    this.latencies = [...this.latencies, Math.round(latency * 100) / 100].slice(-20);
    this.qualities = [...this.qualities, ...stored.map((f) => f.quality)].slice(-60);
    this.confidences = [...this.confidences, ...stored.map((f) => f.confidence)].slice(-60);

    const latest = { ...this.snapshot.latest };
    for (const feature of stored) latest[feature.featureType] = feature;

    this.startedAt ??= now;
    const elapsedMinutes = Math.max(1 / 60, (now - this.startedAt) / 60_000);
    const featureCount = this.snapshot.featureCount + stored.length;

    this.patch({
      sessionId,
      featureCount,
      passCount: this.snapshot.passCount + 1,
      latest,
      lastExtractedAt: now,
      extractionRate: Math.round((featureCount / elapsedMinutes) * 10) / 10,
      lastLatencyMs: Math.round(latency * 100) / 100,
      averageLatencyMs: meanOf(this.latencies),
      averageQuality: meanOf(this.qualities),
      averageConfidence: meanOf(this.confidences),
    });

    if (stored.length) {
      for (const listener of this.featureListeners) listener(stored);
    }
    return stored;
  }

  reset(): void {
    featureStore.clear();
    this.latencies = [];
    this.qualities = [];
    this.confidences = [];
    this.startedAt = null;
    this.lastRunAt = 0;
    this.patch({ ...EMPTY });
  }
}

/** One service for the whole app. */
export const featureService = new FeatureService();
