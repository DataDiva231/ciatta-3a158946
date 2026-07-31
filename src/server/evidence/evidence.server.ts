/**
 * Evidence Engine — sits between Understanding and Guidance.
 *
 * It never learns and it never speaks. Its only job: given the current
 * understanding, decide which curated, evidence-backed actions are appropriate
 * right now, score their applicability, rank them, and return the single
 * highest-value candidate — or nothing at all.
 *
 * "Continue learning" is a valid, preferred answer.
 */
import {
  libraryRecords,
  type EvidenceRecord,
  type EvidenceSubject,
} from "@/server/evidence/library.server";
import type { EvidenceCandidate } from "@/lib/evidence-types";

import type { Observation } from "@/server/engine/observations.server";
import type { Understanding } from "@/server/engine/understanding.server";

/** Minimum applicability before a record is even considered. */
const APPLICABILITY_FLOOR = 0.55;

const QUALITY_WEIGHT = { high: 1, moderate: 0.75, low: 0.45, "very-low": 0.25 } as const;
const STRENGTH_WEIGHT = { strong: 1, conditional: 0.7, insufficient: 0 } as const;

/** Projects the understanding into the narrow shape the library may read. */
export function subjectFor(u: Understanding, observations: Observation[]): EvidenceSubject {
  const latest: Record<string, string> = {};
  for (const o of observations) if (!(o.category in latest)) latest[o.category] = o.value;

  const recent = observations.filter(
    (o) => Date.now() - new Date(o.occurredAt).getTime() < 2 * 86_400_000,
  );

  return {
    lifeStage: u.context.lifeStage,
    cyclePhase: u.context.cyclePhase,
    cycleDay: u.context.cycleDay,
    goals: u.context.goals,
    medications: u.context.medications,
    latest,
    categories: Array.from(new Set(observations.map((o) => o.category))),
    beliefsHolding: u.clearer.map((b) => b.key),
    symptoms: recent.filter((o) => o.category === "Symptoms").map((o) => o.value),
    flowHeavy: recent.some((o) => o.value === "Heavy" || o.context["Flow"] === "Heavy"),
    observationCount: u.observationCount,
    depth: u.depth,
  };
}

/**
 * How well this person matches the population and signals the evidence was
 * established in. Separate from applicability: one asks "is this you?", the
 * other asks "does this apply today?".
 */
export function personalizationMatch(record: EvidenceRecord, subject: EvidenceSubject): number {
  let score = 0.4;
  if (subject.depth >= 40) score += 0.15;
  if (subject.observationCount >= 8) score += 0.1;
  if (record.population.some((p) => subject.lifeStage && new RegExp(p.split(" ")[0]!, "i").test(subject.lifeStage)))
    score += 0.15;
  if (subject.goals.some((g) => new RegExp(record.domain.split(" ")[0]!, "i").test(g)))
    score += 0.1;
  if (subject.beliefsHolding.length) score += 0.1;
  return Math.round(Math.min(1, score) * 100) / 100;
}

export type MatchResult = {
  candidates: EvidenceCandidate[];
  best: { record: EvidenceRecord; applicability: number; personalization: number } | null;
};

/** Reads understanding, matches evidence, evaluates applicability, ranks. */
export function matchEvidence(u: Understanding, observations: Observation[]): MatchResult {
  const subject = subjectFor(u, observations);
  const candidates: EvidenceCandidate[] = [];
  const ranked: { record: EvidenceRecord; applicability: number; personalization: number; value: number }[] =
    [];

  for (const record of libraryRecords()) {
    const applicability = Math.round(Math.min(1, record.applies(subject)) * 100) / 100;
    const personalization = personalizationMatch(record, subject);

    let rejected: string | null = null;
    if (applicability <= 0) rejected = "Applicability criteria not met";
    else if (applicability < APPLICABILITY_FLOOR)
      rejected = `Applicability ${applicability} below floor ${APPLICABILITY_FLOOR}`;
    else if (record.recommendationStrength === "insufficient")
      rejected = "Evidence strength insufficient for guidance";

    candidates.push({
      evidenceId: record.id,
      domain: record.domain,
      intervention: record.intervention,
      applicabilityScore: applicability,
      personalizationMatch: personalization,
      evidenceQuality: record.evidenceQuality,
      recommendationStrength: record.recommendationStrength,
      rejectedBecause: rejected,
    });

    if (rejected) continue;

    const value =
      applicability * 0.45 +
      QUALITY_WEIGHT[record.evidenceQuality] * 0.3 +
      STRENGTH_WEIGHT[record.recommendationStrength] * 0.15 +
      personalization * 0.1;
    ranked.push({ record, applicability, personalization, value });
  }

  ranked.sort((a, b) => b.value - a.value);
  candidates.sort((a, b) => b.applicabilityScore - a.applicabilityScore);

  const top = ranked[0];
  return {
    candidates,
    best: top
      ? { record: top.record, applicability: top.applicability, personalization: top.personalization }
      : null,
  };
}
