/**
 * The biological session model.
 *
 * A session is one continuous period of wear: it references the observations,
 * features, evidence and intelligence produced during it, never copies them.
 * Every field is serialisable so a session can later be synced to the cloud
 * without a second representation.
 */
import type { SensorType } from "@/lib/observations/model";

export type SessionLifecycle = "active" | "paused" | "ended";

/** How the session finished, kept for later cloud reconciliation. */
export type SessionEndReason = "inactivity" | "disconnect" | "manual" | "superseded" | null;

export type SessionQuality = {
  /** 0–1 overall: signal quality weighted by data completeness. */
  score: number;
  /** Mean observation quality across the session. */
  signal: number;
  /** Share of accepted observations out of all validated attempts. */
  completeness: number;
  /** Mean intelligence confidence across the session. */
  confidence: number;
};

export type SessionCounts = {
  observations: number;
  features: number;
  evidence: number;
  intelligence: number;
};

export type BiologicalSession = {
  id: string;
  /** The observation session this biological session is built from. */
  observationSessionId: string;
  startedAt: number;
  endedAt: number | null;
  /** Milliseconds of wear, excluding nothing: end (or now) minus start. */
  durationMs: number;
  deviceId: string | null;
  deviceName: string | null;
  lifecycle: SessionLifecycle;
  /** When the current pause began, or null while active. */
  pausedAt: number | null;
  /** Total time spent paused, in milliseconds. */
  pausedMs: number;
  lastObservationAt: number | null;
  counts: SessionCounts;
  rejectedCount: number;
  sensorsActive: SensorType[];
  quality: SessionQuality;
  endReason: SessionEndReason;
  summary: SessionSummary | null;
  processingVersion: string;
};

/** Generated once, when a session ends. Stored, not yet shown to anyone. */
export type SessionSummary = {
  sessionId: string;
  generatedAt: number;
  durationMs: number;
  sensorsActive: SensorType[];
  quality: SessionQuality;
  counts: SessionCounts;
  /** The strongest intelligence produced, one entry per domain. */
  keyIntelligence: {
    intelligenceId: string;
    domain: string;
    status: string;
    title: string;
    summary: string;
    confidence: number;
  }[];
  /** Mean confidence of the key intelligence. */
  confidence: number;
  /** Milliseconds spent generating this summary. */
  processingMs: number;
  processingVersion: string;
};

export type SessionQuery = {
  /** Local calendar day, as an ISO date string (YYYY-MM-DD). */
  date?: string;
  from?: number;
  to?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  minQuality?: number;
  lifecycle?: SessionLifecycle[];
  limit?: number;
};

export const SESSION_PROCESSING_VERSION = "session-1.0.0";

/** No observations for this long and the session is considered paused. */
export const SESSION_PAUSE_AFTER_MS = 45_000;

/** No observations for this long and the session ends. */
export const SESSION_END_AFTER_MS = 180_000;

/** How often the lifecycle is re-evaluated while a session is open. */
export const SESSION_TICK_MS = 5_000;

export const SESSION_LIFECYCLE_LABELS: Record<SessionLifecycle, string> = {
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export function newSessionId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `bses_${Date.now().toString(36)}_${random}`;
}

export function isoDate(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
