/**
 * Intelligence, shaped for a screen.
 *
 * The presentation seam of the Intelligence Engine. Screens read this module
 * (through `use-today-intelligence`) and nothing else: no evidence, no
 * features, no observations, no Bluetooth. Ranking and empty-state reasoning
 * live here so the pipeline stays free of any presentation concern.
 */
import {
  INTELLIGENCE_DOMAIN_LABELS,
  INTELLIGENCE_STATUS_LABELS,
  type Intelligence,
  type IntelligenceDomain,
  type IntelligenceStatus,
} from "./model";

/** Intelligence older than this is no longer speaking about "today". */
export const TODAY_FRESHNESS_MS = 900_000;

/** Below this, understanding is real but too tentative to lead the screen. */
export const TODAY_MIN_CONFIDENCE = 0.35;

/** What Today has to work with right now. */
export type TodayState =
  | "initializing"
  | "not_connected"
  | "learning"
  | "no_recent_observations"
  | "low_confidence"
  | "error"
  | "ready";

/** Where the subscription to the Intelligence Store currently stands. */
export type TodayPhase = "initializing" | "live" | "failed";

/** How strongly each domain deserves to lead the screen. */
const DOMAIN_PRIORITY: Record<IntelligenceDomain, number> = {
  recovery: 6,
  sleep: 5,
  cardiovascular: 4,
  thermal: 3,
  activity: 2,
  device_health: 1,
};

/** Settled understanding outranks a first impression. */
const STATUS_PRIORITY: Record<IntelligenceStatus, number> = {
  established: 4,
  changing: 3,
  emerging: 2,
  learning: 1,
};

/**
 * Ranking is lexicographic and quantised, never a blended score: the same set
 * of intelligence always produces the same primary, and a hair of drift in
 * confidence or a passing second can't reorder the screen.
 *
 * Order: confidence (5% bands) → learning state → recency (whole minutes) →
 * domain priority → id. The final id comparison makes the order total, so
 * there is no dependence on array order or sort stability.
 */
const CONFIDENCE_BAND = 0.05;
const RECENCY_BAND_MS = 60_000;

function confidenceBand(item: Intelligence): number {
  return Math.round(item.confidence / CONFIDENCE_BAND);
}

function recencyBand(item: Intelligence): number {
  return Math.floor(item.timestamp / RECENCY_BAND_MS);
}

/** Negative when `a` should lead the screen ahead of `b`. */
export function compareIntelligence(a: Intelligence, b: Intelligence): number {
  return (
    confidenceBand(b) - confidenceBand(a) ||
    STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status] ||
    recencyBand(b) - recencyBand(a) ||
    DOMAIN_PRIORITY[b.domain] - DOMAIN_PRIORITY[a.domain] ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** Highest priority first. Deterministic for any input order. */
export function rankIntelligence(items: Intelligence[]): Intelligence[] {
  return [...items].sort(compareIntelligence);
}

export type TodayIntelligence = {
  state: TodayState;
  /** The single highest-priority understanding, when there is one to show. */
  primary: Intelligence | null;
  /** Everything currently active, highest priority first. */
  ranked: Intelligence[];
  /** Editorial copy for the current state — never technical. */
  headline: string;
  summary: string;
  /** Human confidence state, e.g. "Emerging · 62% confident". */
  confidenceLabel: string;
  /** 0–1, for the Understanding orb. */
  confidence: number;
  /** "Updated 2 minutes ago", or null when nothing has been understood. */
  updatedLabel: string | null;
  updatedAt: number | null;
  /** Quiet supporting rows: one per other active domain. */
  noticing: { label: string; text: string }[];
  /** Identity of what is on screen — equal signatures mean nothing changed. */
  signature: string;
};


function relativeTime(timestamp: number, now: number): string {
  const minutes = Math.round((now - timestamp) / 60_000);
  if (minutes <= 0) return "Updated just now";
  if (minutes === 1) return "Updated a minute ago";
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "Updated an hour ago" : `Updated ${hours} hours ago`;
}

function confidenceLabel(item: Intelligence): string {
  return `${INTELLIGENCE_STATUS_LABELS[item.status]} · ${Math.round(item.confidence * 100)}% confident`;
}

const EMPTY_COPY: Record<
  Exclude<TodayState, "ready">,
  { headline: string; summary: string; confidenceLabel: string }
> = {
  initializing: {
    headline: "One moment.",
    summary: "I'm gathering what I already understand about you.",
    confidenceLabel: "Getting ready",
  },
  error: {
    headline: "I can't reach what I know right now.",
    summary:
      "Something got in the way of my understanding. Nothing you've taught me is lost — try again in a moment.",
    confidenceLabel: "Unavailable",
  },
  not_connected: {

    headline: "I haven't met your body yet.",
    summary:
      "Once your Arc is with you, I'll start listening quietly in the background and share what I begin to understand.",
    confidenceLabel: "Waiting to listen",
  },
  learning: {
    headline: "I'm listening.",
    summary:
      "I've started gathering signals from your body. It takes a little while before I'm willing to say anything about them.",
    confidenceLabel: "Learning",
  },
  no_recent_observations: {
    headline: "I've lost the thread for now.",
    summary:
      "Nothing new has reached me recently, so what I said earlier may already be out of date. I'll pick it back up as soon as I hear from your body again.",
    confidenceLabel: "Paused",
  },
  low_confidence: {
    headline: "Something's forming, but I'm not sure of it yet.",
    summary:
      "There's a pattern beginning to show. I'd rather wait until I trust it before I make anything of it.",
    confidenceLabel: "Still forming",
  },
};

/**
 * The one pure function Today depends on: active intelligence in, one
 * understanding and one state out.
 */
export function selectTodayIntelligence(
  active: Intelligence[],
  options: { hasSession: boolean; now?: number },
): TodayIntelligence {
  const now = options.now ?? Date.now();
  const ranked = rankIntelligence(active, now);
  const primary = ranked[0] ?? null;
  const newest = ranked.reduce<number | null>(
    (latest, item) => (latest === null || item.timestamp > latest ? item.timestamp : latest),
    null,
  );

  const state: TodayState = !options.hasSession
    ? "not_connected"
    : !primary
      ? "learning"
      : newest !== null && now - newest > TODAY_FRESHNESS_MS
        ? "no_recent_observations"
        : primary.confidence < TODAY_MIN_CONFIDENCE
          ? "low_confidence"
          : "ready";

  if (state !== "ready") {
    const copy = EMPTY_COPY[state];
    return {
      state,
      primary: state === "low_confidence" || state === "no_recent_observations" ? primary : null,
      ranked,
      headline: copy.headline,
      summary: copy.summary,
      confidenceLabel: copy.confidenceLabel,
      confidence: state === "low_confidence" && primary ? primary.confidence : 0,
      updatedLabel: newest === null ? null : relativeTime(newest, now),
      updatedAt: newest,
      noticing: [],
    };
  }

  const leading = primary!;
  return {
    state,
    primary: leading,
    ranked,
    headline: leading.title,
    summary: leading.summary,
    confidenceLabel: confidenceLabel(leading),
    confidence: leading.confidence,
    updatedLabel: relativeTime(leading.timestamp, now),
    updatedAt: leading.timestamp,
    noticing: ranked
      .slice(1, 4)
      .map((item) => ({ label: INTELLIGENCE_DOMAIN_LABELS[item.domain], text: item.summary })),
  };
}
