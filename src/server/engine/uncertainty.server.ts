/**
 * Uncertainty — tracked independently across three dimensions and never
 * collapsed into one number.
 *
 * Understanding uncertainty: how little Ciatta knows about this person.
 * Evidence uncertainty: how weak the science behind a match is.
 * Applicability uncertainty: how poorly that science fits this person now.
 */
import type { EvidenceRecord } from "@/server/evidence/library.server";
import type { UncertaintyProfile } from "@/lib/evidence-types";

import type { Understanding } from "./understanding.server";

const QUALITY_UNCERTAINTY: Record<EvidenceRecord["evidenceQuality"], number> = {
  high: 0.1,
  moderate: 0.3,
  low: 0.55,
  "very-low": 0.8,
};

export function understandingUncertainty(u: Understanding): number {
  const depth = 1 - u.depth / 100;
  const thin = u.observationCount < 3 ? 0.25 : u.observationCount < 8 ? 0.1 : 0;
  const unheld = u.clearer.length ? 0 : 0.1;
  return round(Math.min(1, depth + thin + unheld));
}

export function evidenceUncertainty(record: EvidenceRecord): number {
  const base = QUALITY_UNCERTAINTY[record.evidenceQuality];
  const conditional = record.recommendationStrength === "strong" ? 0 : 0.1;
  return round(Math.min(1, base + conditional));
}

export function applicabilityUncertainty(applicabilityScore: number): number {
  return round(Math.max(0, 1 - applicabilityScore));
}

export function profileFor(
  u: Understanding,
  record: EvidenceRecord | null,
  applicabilityScore: number,
): UncertaintyProfile {
  return {
    understanding: understandingUncertainty(u),
    evidence: record ? evidenceUncertainty(record) : 1,
    applicability: record ? applicabilityUncertainty(applicabilityScore) : 1,
  };
}

/** True when any single dimension is too uncertain to speak with. */
export function tooUncertain(p: UncertaintyProfile): boolean {
  return p.understanding > 0.82 || p.evidence > 0.6 || p.applicability > 0.45;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
