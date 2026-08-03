/**
 * Observation Service — the single source of validated biological observations.
 *
 * Bluetooth feeds it raw packets; it validates, scores, stores and publishes.
 * The Intelligence Layer reads from here and never from Bluetooth directly.
 */
import { bluetoothManager, type BlePacket } from "@/lib/ble/bluetooth-manager";

import {
  newId,
  type BiologicalObservation,
  type ObservationSession,
  type RejectionReason,
  type SensorType,
} from "./model";
import { createPipelineState, processPacket, type PipelineState } from "./pipeline";
import { observationStore } from "./store";

export type ObservationSnapshot = {
  session: ObservationSession | null;
  /** Observations stored in the active session. */
  observationCount: number;
  /** Raw packets seen by the service. */
  packetsReceived: number;
  rejectedCount: number;
  latest: BiologicalObservation | null;
  lastRejection: { sensorType: SensorType | null; reason: RejectionReason; at: number } | null;
  /** Rolling mean quality over the last 60 observations, or null before any. */
  averageQuality: number | null;
};

const EMPTY: ObservationSnapshot = {
  session: null,
  observationCount: 0,
  packetsReceived: 0,
  rejectedCount: 0,
  latest: null,
  lastRejection: null,
  averageQuality: null,
};

class ObservationService {
  private snapshot: ObservationSnapshot = EMPTY;
  private listeners = new Set<(snapshot: ObservationSnapshot) => void>();
  private observationListeners = new Set<(observations: BiologicalObservation[]) => void>();
  private state: PipelineState | null = null;
  private unsubscribeBle: (() => void) | null = null;
  private recentQuality: number[] = [];

  getSnapshot = (): ObservationSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: ObservationSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Stage: publish. Every batch of newly stored observations is handed to
   * downstream consumers (the Feature Extraction Layer) exactly once.
   */
  subscribeObservations = (
    listener: (observations: BiologicalObservation[]) => void,
  ): (() => void) => {
    this.observationListeners.add(listener);
    return () => {
      this.observationListeners.delete(listener);
    };
  };

  private patch(next: Partial<ObservationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Starts listening to Bluetooth. Safe to call repeatedly. */
  start(): void {
    if (this.unsubscribeBle) return;
    this.unsubscribeBle = bluetoothManager.subscribePackets(this.ingest);
  }

  stop(): void {
    this.unsubscribeBle?.();
    this.unsubscribeBle = null;
  }

  /** Stage: publish. Every accepted observation lands here first. */
  private ingest = (packet: BlePacket): void => {
    const session = this.ensureSession(packet);
    const state = this.state!;
    const result = processPacket(packet, state);

    const stored = observationStore.append(result.observations);
    for (const observation of stored) {
      this.recentQuality.push(observation.quality.score);
    }
    if (this.recentQuality.length > 60) {
      this.recentQuality = this.recentQuality.slice(-60);
    }

    const last = result.rejections.at(-1);
    this.patch({
      session,
      packetsReceived: this.snapshot.packetsReceived + 1,
      observationCount: this.snapshot.observationCount + stored.length,
      rejectedCount: this.snapshot.rejectedCount + result.rejections.length,
      latest: stored.at(-1) ?? this.snapshot.latest,
      lastRejection: last ? { ...last, at: packet.receivedAt } : this.snapshot.lastRejection,
      averageQuality: this.recentQuality.length
        ? Math.round(
            (this.recentQuality.reduce((total, value) => total + value, 0) /
              this.recentQuality.length) *
              100,
          ) / 100
        : null,
    });

    if (stored.length) {
      for (const listener of this.observationListeners) listener(stored);
    }
  };

  /** A session is one continuous stream from one device. */
  private ensureSession(packet: BlePacket): ObservationSession {
    const current = this.snapshot.session;
    if (current && current.deviceId === packet.deviceId && this.state) return current;
    const session: ObservationSession = {
      id: newId("ses"),
      deviceId: packet.deviceId,
      deviceName: packet.deviceName,
      startedAt: packet.receivedAt,
      lastObservationAt: null,
    };
    observationStore.openSession(session);
    this.state = createPipelineState(session.id);
    this.recentQuality = [];
    this.snapshot = {
      ...EMPTY,
      packetsReceived: this.snapshot.packetsReceived,
      session,
    };
    return session;
  }

  /** Read interface for the Intelligence Layer and diagnostics. */
  query = observationStore.query;
  sessions = observationStore.listSessions;

  reset(): void {
    observationStore.clear();
    this.state = null;
    this.recentQuality = [];
    this.patch({ ...EMPTY });
  }
}

/** One service for the whole app. */
export const observationService = new ObservationService();
