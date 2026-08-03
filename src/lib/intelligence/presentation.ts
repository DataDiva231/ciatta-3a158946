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
  | "not_connected"
  | "learning"
  | "no_recent_observations"
  | "low_confidence"
  | "ready";

/** How strongly each domain deserves to lead the screen. */
const DOMAIN_PRIORITY: Record<IntelligenceDomain, number> = {
  recovery: 1,
  sleep: 0.94,
  cardiovascular: 0.88,
  thermal: 0.78,
  activity: 0.7,
  device_health: 0.35,
};

/** Settled understanding outranks a first impression at equal confidence. */
const STATUS_PRIORITY: Record<IntelligenceStatus, number> = {
  changing: 1,
  established: 0.95,
  emerging: 0.8,
  learning: 0.55,
};

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
};

export function rankIntelligenceScore(item: Intelligence, now = Date.now()): number {
  const age = Math.max(0, now - item.timestamp);
  const recency = Math.max(0.15, 1 - age / TODAY_FRESHNESS_MS);
  return (
    DOMAIN_PRIORITY[item.domain] *
    STATUS_PRIORITY[item.status] *
    (0.35 + 0.65 * item.confidence) *
    recency
  );
}

/** Highest priority first. */
export function rankIntelligence(items: Intelligence[], now = Date.now()): Intelligence[] {
  return [...items].sort((a, b) => rankIntelligenceScore(b, now) - rankIntelligenceScore(a, now));
}

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
