/**
 * Guidance Engine — the only layer allowed to recommend.
 *
 * Pipeline: Current Understanding + Current Context + User Goals + Evidence
 * Engine → Guidance → Recommendation → Today.
 *
 * Guidance never bypasses Understanding: it receives it, it cannot query
 * observations for itself, and when the evidence or the fit is not there it
 * returns "continue learning" rather than weak advice.
 */
import { matchEvidence } from "@/server/evidence/evidence.server";
import { libraryStats } from "@/server/evidence/library.server";
import type { EvidenceCandidate, Guidance, ReasoningStep } from "@/lib/evidence-types";

import type { Observation } from "@/server/engine/observations.server";
import type { Understanding } from "@/server/engine/understanding.server";
import { profileFor, tooUncertain } from "@/server/engine/uncertainty.server";

export type GuidanceResult = {
  guidance: Guidance;
  candidates: EvidenceCandidate[];
  chain: ReasoningStep[];
};

/** What Today says when there is nothing evidence-backed worth saying. */
function continueLearning(u: Understanding): Guidance {
  if (u.observationCount === 0)
    return {
      lead: "Start anywhere.",
      rest: "One small thing about today is enough.",
      support: "I learn faster from what you notice than from anything I could assume.",
      meta: null,
    };
  return {
    lead: "Keep it simple.",
    rest: "Hold your usual rhythm today.",
    support: "I'd rather keep learning than suggest something I can't stand behind yet.",
    meta: null,
  };
}

/** Softens the wording when the science fits but the picture is still thin. */
function hedge(support: string, understanding: number): string {
  if (understanding > 0.6) return `${support} I'm still early with you, so take it lightly.`;
  return support;
}

export function generateGuidance(u: Understanding, observations: Observation[]): GuidanceResult {
  const chain: ReasoningStep[] = [
    {
      layer: "observation",
      detail: `${u.observationCount} observation(s) recorded; newest ${
        u.newest ? `${u.newest.category}: ${u.newest.value}` : "none recent"
      }.`,
    },
    {
      layer: "context",
      detail: `Life stage ${u.context.lifeStage ?? "unknown"}; cycle ${
        u.context.cyclePhase ? `${u.context.cyclePhase} day ${u.context.cycleDay}` : "unplaced"
      }; goals ${u.context.goals.length ? u.context.goals.join(", ") : "none stated"}.`,
    },
    {
      layer: "memory",
      detail: u.patterns.length
        ? u.patterns.map((p) => p.key).join(", ")
        : "No recurring patterns remembered yet.",
    },
    {
      layer: "belief",
      detail: `Holding: ${u.clearer.map((b) => b.key).join(", ") || "none"}. Forming: ${
        u.learning.map((b) => b.key).join(", ") || "none"
      }.`,
    },
    {
      layer: "understanding",
      detail: `Depth ${u.depth}, state ${u.state}, known ${u.daysKnown} day(s).`,
    },
  ];

  const { candidates, best } = matchEvidence(u, observations);
  const stats = libraryStats();

  chain.push({
    layer: "evidence",
    detail: `Library ${stats.version}: ${candidates.length} record(s) evaluated, ${
      candidates.filter((c) => !c.rejectedBecause).length
    } applicable.`,
  });

  if (!best) {
    chain.push({
      layer: "applicability",
      detail: "No record cleared the applicability floor. Withholding guidance.",
    });
    chain.push({ layer: "guidance", detail: "Continue learning." });
    chain.push({ layer: "recommendation", detail: "None returned by design." });
    const guidance = continueLearning(u);
    chain.push({ layer: "narrative", detail: `${guidance.lead} ${guidance.rest}` });
    return { guidance, candidates, chain };
  }

  const uncertainty = profileFor(u, best.record, best.applicability);
  chain.push({
    layer: "applicability",
    detail: `Best match ${best.record.id} — applicability ${best.applicability}, personalization ${
      best.personalization
    }, uncertainty U${uncertainty.understanding}/E${uncertainty.evidence}/A${uncertainty.applicability}.`,
  });

  if (tooUncertain(uncertainty)) {
    chain.push({
      layer: "guidance",
      detail: "Uncertainty on at least one dimension too high. Continue learning.",
    });
    const guidance = continueLearning(u);
    chain.push({ layer: "narrative", detail: `${guidance.lead} ${guidance.rest}` });
    return { guidance, candidates, chain };
  }

  const record = best.record;
  chain.push({
    layer: "guidance",
    detail: `${record.domain}: ${record.intervention} → ${record.expectedOutcome}.`,
  });
  chain.push({
    layer: "recommendation",
    detail: `${record.evidenceQuality} quality, ${record.recommendationStrength} strength, reviewed ${record.dateReviewed}.`,
  });

  const guidance: Guidance = {
    lead: record.guidance.lead,
    rest: record.guidance.rest,
    support: hedge(record.guidance.support, uncertainty.understanding),
    meta: {
      evidenceId: record.id,
      domain: record.domain,
      intervention: record.intervention,
      expectedOutcome: record.expectedOutcome,
      evidenceQuality: record.evidenceQuality,
      recommendationStrength: record.recommendationStrength,
      personalizationMatch: best.personalization,
      applicabilityScore: best.applicability,
      citations: record.citations,
      version: `${stats.version}/${record.version}`,
      dateReviewed: record.dateReviewed,
      uncertainty,
    },
  };

  chain.push({ layer: "narrative", detail: `${guidance.lead} ${guidance.rest}` });
  return { guidance, candidates, chain };
}
