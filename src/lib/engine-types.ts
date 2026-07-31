/**
 * Shared, client-safe types for the Ciatta Intelligence Engine.
 *
 * These describe the contract between the engine (server) and the screens
 * (client). Screens render these shapes; they never compute them.
 */

/** Anything that ever happened, from any source. Immutable once written. */
export type ObservationInput = {
  /** Stable id from the source, so re-sending the same event is a no-op. */
  externalId?: string;
  /** When it actually happened. */
  occurredAt: string;
  /** onboarding | quick_add | teach | check_in | apple_health | device | lab | clinician */
  source: string;
  category: string;
  value: string;
  /** Optional extra fields carried by the source. */
  context?: Record<string, string>;
  /** Internal only. Never surfaced to the user. */
  confidence?: number;
};

export type Evidence = {
  label: string;
  text: string;
};

/** "What do I understand today?" */
export type TodayView = {
  headline: string;
  /** Short accented fragment inside the headline, for the existing type treatment. */
  accent: string;
  /** Calm sentence about where the relationship currently stands. */
  standing: string;
  evidence: Evidence[];
  focus: { lead: string; rest: string; support: string };
  /** Present only when something new arrived since the last look. */
  acknowledgment: string | null;
  /** 0–100, internal. Screens use it for the orb, never as a number. */
  depth: number;
};

/** "What would help me understand you better?" */
export type TeachView = {
  prompt: string;
  /** Highest-value missing information, phrased as an invitation. */
  invitation: string;
  suggestions: { category: string; label: string; reason: string }[];
  followUp: string | null;
};

/** "How has my understanding of you changed?" */
export type JourneyView = {
  opening: string;
  discoveries: { title: string; body: string }[];
  clearer: { title: string; before: string; now: string }[];
  milestones: { label: string; note: string; at: string }[];
  changes: string[];
};

/** "Who do I understand you to be?" */
export type ProfileView = {
  summary: string;
  becomingClearer: string[];
  stillUncertain: string[];
  payingAttentionTo: string[];
  learningFrom: string[];
};

export type EngineViews = {
  today: TodayView;
  teach: TeachView;
  journey: JourneyView;
  profile: ProfileView;
};
