/**
 * The Intelligence model.
 *
 * Intelligence is structured understanding derived from biological evidence.
 * It never touches features, observations or Bluetooth: everything it knows
 * arrives as evidence, and everything it produces stays traceable back through
 * evidence → features → observations.
 */
import type { BiologicalEvidence, EvidenceType } from "@/lib/evidence/model";

export type IntelligenceDomain =
  | "cardiovascular"
  | "recovery"
  | "thermal"
  | "activity"
  | "sleep"
  | "device_health";

/** How settled the engine's understanding of a domain is. */
export type IntelligenceStatus = "learning" | "emerging" | "established" | "changing";

/** Bumped whenever understanding or confidence maths changes. */
export const INTELLIGENCE_PROCESSING_VERSION = "0i.1";

/** Trailing window each intelligence pass considers. */
export const INTELLIGENCE_WINDOW_MS = 600_000;

/** Minimum spacing between intelligence passes. */
export const INTELLIGENCE_INTERVAL_MS = 10_000;

export const INTELLIGENCE_DOMAIN_LABELS: Record<IntelligenceDomain, string> = {
  cardiovascular: "Cardiovascular",
  recovery: "Recovery",
  thermal: "Thermal",
  activity: "Activity",
  sleep: "Sleep",
  device_health: "Device health",
};

export const INTELLIGENCE_STATUS_LABELS: Record<IntelligenceStatus, string> = {
  learning: "Learning",
  emerging: "Emerging",
  established: "Established",
  changing: "Changing",
};

export type Intelligence = {
  id: string;
  /** Milliseconds since epoch — when this understanding was produced. */
  timestamp: number;
  domain: IntelligenceDomain;
  title: string;
  summary: string;
  supportingEvidenceIds: string[];
  supportingFeatureIds: string[];
  supportingObservationIds: string[];
  /** 0–1. Independent of any AI model. */
  confidence: number;
  status: IntelligenceStatus;
  sessionId: string;
  /** Explainability: why this object exists at all. */
  reason: string;
  /** The inputs to the confidence calculation, kept for inspection. */
  confidenceBreakdown: {
    evidenceConfidence: number;
    evidenceVolume: number;
    evidenceAgreement: number;
    timeCoverage: number;
    domainCompleteness: number;
  };
  /** The observed value the summary speaks about, when the domain has one. */
  value: number | null;
  /** Previous value for the same domain, when one existed. */
  previousValue: number | null;
  timeWindow: { from: number; to: number; evidenceCount: number };
  processingVersion: string;
};

/** One window of evidence for one session, bucketed by evidence type. */
export type IntelligenceWindow = {
  sessionId: string;
  from: number;
  to: number;
  byType: Partial<Record<EvidenceType, BiologicalEvidence[]>>;
  /** Everything in the window, newest last. */
  all: BiologicalEvidence[];
};

/** What a domain processor knows about its own history. */
export type DomainHistory = {
  /** The last intelligence object published for this domain, if any. */
  previous: Intelligence | null;
  /** How many objects this domain has produced in this session. */
  count: number;
};

/**
 * A processor turns one window into at most one intelligence object for its
 * domain. Adding a domain means adding a processor; the pipeline does not
 * change.
 */
export type IntelligenceProcessor = {
  domain: IntelligenceDomain;
  requiredEvidence: EvidenceType[];
  optionalEvidence?: EvidenceType[];
  /** Evidence count per required type at which time coverage counts as full. */
  idealEvidence: number;
  /** Relative change that counts as "changing" for this domain. */
  changeThreshold: number;
  understand: (
    window: IntelligenceWindow,
    history: DomainHistory,
  ) => {
    title: string;
    summary: string;
    reason: string;
    value: number | null;
    evidence: BiologicalEvidence[];
  } | null;
};

export type IntelligenceQuery = {
  sessionId?: string;
  domains?: IntelligenceDomain[];
  statuses?: IntelligenceStatus[];
  minConfidence?: number;
  from?: number;
  to?: number;
  limit?: number;
};

export function newIntelligenceId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `intel_${Date.now().toString(36)}_${random}`;
}
