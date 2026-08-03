/**
 * Session Service — owns the biological session lifecycle.
 *
 * It watches published observations (never Bluetooth packets) to know when wear
 * begins and continues, and watches the connection only to notice a manual
 * disconnect. Sessions start on the first reliable observation, pause after a
 * quiet stretch, resume when data returns, and end after prolonged inactivity.
 */
import { bluetoothManager, type BleSnapshot } from "@/lib/ble/bluetooth-manager";
import type { BiologicalObservation } from "@/lib/observations/model";
import { observationService } from "@/lib/observations/service";
import { intelligenceService } from "@/lib/intelligence/service";

import {
  isoDate,
  newSessionId,
  SESSION_END_AFTER_MS,
  SESSION_PAUSE_AFTER_MS,
  SESSION_PROCESSING_VERSION,
  SESSION_TICK_MS,
  type BiologicalSession,
  type SessionEndReason,
} from "./model";
import { sessionStore } from "./store";
import { buildSessionSummary, rollupSession } from "./summary";

export type SessionSnapshot = {
  /** The open session, active or paused. */
  active: BiologicalSession | null;
  /** The most recently completed session, with its summary. */
  lastCompleted: BiologicalSession | null;
  /** Sessions in the store, newest last. */
  history: BiologicalSession[];
  /** Sessions started and completed during this run. */
  startedCount: number;
  completedCount: number;
  processingVersion: string;
};

export const EMPTY_SESSION_SNAPSHOT: SessionSnapshot = {
  active: null,
  lastCompleted: null,
  history: [],
  startedCount: 0,
  completedCount: 0,
  processingVersion: SESSION_PROCESSING_VERSION,
};

class SessionService {
  private snapshot: SessionSnapshot = EMPTY_SESSION_SNAPSHOT;
  private listeners = new Set<(snapshot: SessionSnapshot) => void>();
  private unsubscribeObservations: (() => void) | null = null;
  private unsubscribeBle: (() => void) | null = null;
  private timer: number | null = null;

  getSnapshot = (): SessionSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: SessionSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stage: publish. Completed sessions, with their summaries. */
  subscribeCompleted = sessionStore.subscribeCompleted;

  /** Read interface: query by date, duration, quality, lifecycle. */
  query = sessionStore.query;
  byDate = sessionStore.byDate;
  read = sessionStore.read;

  /** Starts watching the layers below. Safe to call repeatedly. */
  start(): void {
    if (this.unsubscribeObservations) return;
    // Keep the chain alive so intelligence for a session exists by the time it ends.
    intelligenceService.start();
    observationService.start();
    this.unsubscribeObservations = observationService.subscribeObservations(this.onObservations);
    this.unsubscribeBle = bluetoothManager.subscribe(this.onConnection);
    this.snapshot = {
      ...this.snapshot,
      history: sessionStore.list(),
      lastCompleted: sessionStore.list().filter((s) => s.lifecycle === "ended").at(-1) ?? null,
    };
    if (typeof window !== "undefined") {
      this.timer = window.setInterval(() => this.tick(), SESSION_TICK_MS);
    }
  }

  stop(): void {
    this.unsubscribeObservations?.();
    this.unsubscribeObservations = null;
    this.unsubscribeBle?.();
    this.unsubscribeBle = null;
    if (this.timer !== null && typeof window !== "undefined") window.clearInterval(this.timer);
    this.timer = null;
  }

  private patch(next: Partial<SessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Stage: receive. Reliable observations start, sustain or resume a session. */
  private onObservations = (observations: BiologicalObservation[]): void => {
    const valid = observations.filter((item) => item.validationStatus === "valid");
    if (!valid.length) return;
    const last = valid.at(-1)!;
    const active = this.snapshot.active;

    if (active && active.observationSessionId !== last.sessionId) {
      this.endSession("superseded", last.timestamp);
    }

    if (!this.snapshot.active) {
      this.startSession(last);
      return;
    }
    this.sustain(last.timestamp);
  };

  /** A manual disconnect ends the session immediately. */
  private onConnection = (ble: BleSnapshot): void => {
    if (!this.snapshot.active) return;
    if (ble.state === "idle" || ble.state === "unavailable" || ble.state === "error") {
      this.endSession("disconnect", Date.now());
    }
  };

  private startSession(observation: BiologicalObservation): BiologicalSession {
    const rollup = rollupSession(observation.sessionId);
    const session: BiologicalSession = {
      id: newSessionId(),
      observationSessionId: observation.sessionId,
      startedAt: observation.timestamp,
      endedAt: null,
      durationMs: 0,
      deviceId: observation.deviceId,
      deviceName: bluetoothManager.getSnapshot().device?.name ?? null,
      lifecycle: "active",
      pausedAt: null,
      pausedMs: 0,
      lastObservationAt: observation.timestamp,
      counts: rollup.counts,
      rejectedCount: rollup.rejectedCount,
      sensorsActive: rollup.sensorsActive,
      quality: rollup.quality,
      endReason: null,
      summary: null,
      processingVersion: SESSION_PROCESSING_VERSION,
    };
    sessionStore.upsert(session);
    this.patch({
      active: session,
      history: sessionStore.list(),
      startedCount: this.snapshot.startedCount + 1,
    });
    return session;
  }

  /** Session active, or resumed if it had paused. */
  private sustain(at: number): void {
    const active = this.snapshot.active;
    if (!active) return;
    const resumed = active.pausedAt !== null;
    const rollup = rollupSession(active.observationSessionId);
    const next: BiologicalSession = {
      ...active,
      lifecycle: "active",
      pausedAt: null,
      pausedMs: resumed ? active.pausedMs + Math.max(0, at - active.pausedAt!) : active.pausedMs,
      lastObservationAt: at,
      durationMs: Math.max(0, at - active.startedAt),
      counts: rollup.counts,
      rejectedCount: rollup.rejectedCount,
      sensorsActive: rollup.sensorsActive,
      quality: rollup.quality,
    };
    sessionStore.upsert(next);
    this.patch({ active: next, history: sessionStore.list() });
  }

  /** Quiet for a while: pause. Quiet for a long while: end. */
  private tick(now = Date.now()): void {
    const active = this.snapshot.active;
    if (!active) return;
    const since = now - (active.lastObservationAt ?? active.startedAt);
    if (since >= SESSION_END_AFTER_MS) {
      this.endSession("inactivity", now);
      return;
    }
    if (since >= SESSION_PAUSE_AFTER_MS && active.lifecycle !== "paused") {
      const next: BiologicalSession = {
        ...active,
        lifecycle: "paused",
        pausedAt: active.lastObservationAt ?? now,
        durationMs: Math.max(0, now - active.startedAt),
      };
      sessionStore.upsert(next);
      this.patch({ active: next, history: sessionStore.list() });
      return;
    }
    if (active.lifecycle === "active") {
      const next = { ...active, durationMs: Math.max(0, now - active.startedAt) };
      sessionStore.upsert(next);
      this.patch({ active: next, history: sessionStore.list() });
    }
  }

  /** Stage: end → summarise → persist → publish. */
  endSession(reason: SessionEndReason = "manual", now = Date.now()): BiologicalSession | null {
    const active = this.snapshot.active;
    if (!active) return null;
    const endedAt = active.lastObservationAt ?? now;
    const rollup = rollupSession(active.observationSessionId);
    const closed: BiologicalSession = {
      ...active,
      lifecycle: "ended",
      endedAt,
      durationMs: Math.max(0, endedAt - active.startedAt),
      pausedAt: null,
      pausedMs:
        active.pausedAt !== null
          ? active.pausedMs + Math.max(0, now - active.pausedAt)
          : active.pausedMs,
      counts: rollup.counts,
      rejectedCount: rollup.rejectedCount,
      sensorsActive: rollup.sensorsActive,
      quality: rollup.quality,
      endReason: reason,
      summary: null,
    };
    const withSummary: BiologicalSession = {
      ...closed,
      summary: buildSessionSummary(closed, rollup, now),
    };
    sessionStore.upsert(withSummary);
    sessionStore.publishCompleted(withSummary);
    this.patch({
      active: null,
      lastCompleted: withSummary,
      history: sessionStore.list(),
      completedCount: this.snapshot.completedCount + 1,
    });
    return withSummary;
  }

  /** Sessions grouped by local day, newest day first. */
  timeline(): { date: string; sessions: BiologicalSession[] }[] {
    const days = new Map<string, BiologicalSession[]>();
    for (const session of sessionStore.list()) {
      const date = isoDate(session.startedAt);
      days.set(date, [...(days.get(date) ?? []), session]);
    }
    return [...days.entries()]
      .map(([date, sessions]) => ({ date, sessions }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  reset(): void {
    sessionStore.clear();
    this.patch({ ...EMPTY_SESSION_SNAPSHOT });
  }
}

/** One session owner for the whole app. */
export const sessionService = new SessionService();
