/**
 * Shared, client-safe types for the Evidence and Guidance layers.
 *
 * The Understanding Engine learns. The Narrative Engine explains. The Evidence
 * Engine evaluates science. The Guidance Engine recommends. These are the
 * shapes the last two produce.
 */

export type EvidenceQuality = "high" | "moderate" | "low" | "very-low";

/** GRADE-style strength of the recommendation, not of the study. */
export type RecommendationStrength = "strong" | "conditional" | "insufficient";

export type EvidenceStatus = "active" | "draft" | "retired";

/** Independent uncertainty. Never collapsed into a single score. */
export type UncertaintyProfile = {
  /** How little we know about the person. 0 = known well, 1 = unknown. */
  understanding: number;
  /** How weak the science behind the matched evidence is. */
  evidence: number;
  /** How poorly the evidence fits this particular person right now. */
  applicability: number;
};

/** Internal metadata behind every recommendation. Never shown to users. */
export type RecommendationMeta = {
  evidenceId: string;
  domain: string;
  intervention: string;
  expectedOutcome: string;
  evidenceQuality: EvidenceQuality;
  recommendationStrength: RecommendationStrength;
  /** How well this person's understanding matches the evidence population. */
  personalizationMatch: number;
  applicabilityScore: number;
  citations: string[];
  version: string;
  dateReviewed: string;
  uncertainty: UncertaintyProfile;
};

/** One step of the reasoning chain, for explainability. */
export type ReasoningStep = {
  layer:
    | "observation"
    | "context"
    | "memory"
    | "belief"
    | "understanding"
    | "evidence"
    | "applicability"
    | "guidance"
    | "recommendation"
    | "narrative";
  detail: string;
};

/** A candidate the Evidence Engine considered, kept or rejected. */
export type EvidenceCandidate = {
  evidenceId: string;
  domain: string;
  intervention: string;
  applicabilityScore: number;
  personalizationMatch: number;
  evidenceQuality: EvidenceQuality;
  recommendationStrength: RecommendationStrength;
  /** Null when the candidate survived matching. */
  rejectedBecause: string | null;
};

/** What Today renders. `null` guidance means "continue learning". */
export type Guidance = {
  lead: string;
  rest: string;
  support: string;
  /** Internal only. Screens never read this. */
  meta: RecommendationMeta | null;
};

/**
 * Developer-facing explainability panel — "why I'm saying this".
 *
 * Every user-facing line must be traceable back to real observations. This
 * carries the whole trace in one place so it can be verified.
 */
export type ExplainPanel = {
  observations: {
    at: string;
    source: string;
    category: string;
    value: string;
    context: string;
  }[];
  context: { label: string; value: string }[];
  memories: { key: string; kind: string; summary: string }[];
  beliefs: { key: string; domain: string; status: string; statement: string }[];
  narrative: {
    headline: string;
    accent: string;
    standing: string;
    evidence: { label: string; text: string }[];
    teachPrompt: string;
    teachInvitation: string;
  };
  /** Why this narrative was selected, in order of the deciding factors. */
  whyNarrative: string[];
  /** Why a recommendation was — or was not — generated. */
  whyRecommendation: string[];
  snapshot: {
    depth: number;
    state: string;
    observationCount: number;
    daysKnown: number;
    takenAt: string;
  };
};

/** Developer-facing view of the whole chain. */
export type EngineDebugView = {
  subjectId: string;
  understanding: {
    depth: number;
    state: string;
    observationCount: number;
    daysKnown: number;
    beliefsHolding: string[];
    beliefsForming: string[];
    patterns: string[];
    newest: string | null;
    context: Record<string, string>;
  };
  uncertainty: UncertaintyProfile;
  library: { version: string; active: number; total: number };
  candidates: EvidenceCandidate[];
  guidance: Guidance;
  chain: ReasoningStep[];
  explain: ExplainPanel;
};

