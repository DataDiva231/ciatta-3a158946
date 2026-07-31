/**
 * Explainability surface — every recommendation must be traceable back through
 * evidence, understanding and observation. This assembles that trace, plus the
 * developer-facing "why I'm saying this" panel for the narrative itself.
 */
import { libraryStats } from "@/server/evidence/library.server";
import { generateGuidance } from "@/server/guidance/guidance.server";
import type { EngineDebugView, ExplainPanel } from "@/lib/evidence-types";

import type { Observation } from "./observations.server";
import {
  evidenceFor,
  headlineFor,
  standingLine,
  teachInvitation,
  teachPrompt,
} from "./narrative.server";
import type { Understanding } from "./understanding.server";
import { profileFor, understandingUncertainty } from "./uncertainty.server";

function contextRows(u: Understanding) {
  return [
    { label: "Life stage", value: u.context.lifeStage ?? "—" },
    { label: "Cycle phase", value: u.context.cyclePhase ?? "—" },
    {
      label: "Cycle day",
      value: u.context.cycleDay === null ? "—" : String(u.context.cycleDay),
    },
    { label: "Goals", value: u.context.goals.join(", ") || "—" },
    { label: "Medications", value: u.context.medications.join(", ") || "—" },
    { label: "Recent sleep", value: u.context.recentSleep ?? "—" },
    { label: "Recent activity", value: u.context.recentActivity ?? "—" },
  ];
}

/** Reconstructs the decision the Narrative Engine made, in its own order. */
function whyNarrative(u: Understanding): string[] {
  const why: string[] = [];
  if (u.observationCount === 0) {
    why.push("No observations held — the only honest headline is that nothing is understood yet.");
    return why;
  }

  const flowHeavy =
    u.newest && (u.newest.value === "Heavy" || u.newest.context["Flow"] === "Heavy");
  if (flowHeavy)
    why.push(
      `Newest observation (${u.newest?.category}: ${u.newest?.value}) reads as heavy flow, which outranks every other signal today.`,
    );
  else if (u.state === "recover")
    why.push(
      "Understanding state resolved to 'recover' from a recent observation, so the headline speaks to recovery.",
    );
  else if (u.state === "strong")
    why.push("Understanding state resolved to 'strong', so the headline offers room to push.");
  else why.push("No observation in the last day moved the state, so the headline holds steady.");

  why.push(
    `Standing line chosen from depth ${u.depth} (${
      u.depth < 30
        ? "beginning"
        : u.depth < 55
          ? "shape appearing"
          : u.depth < 78
            ? "rhythm forming"
            : "rhythm known"
    }).`,
  );
  why.push(
    u.patterns.length
      ? `Evidence rows drawn from context plus ${u.patterns.length} remembered pattern(s).`
      : "Evidence rows drawn from context only — nothing recurring is remembered yet.",
  );
  why.push(
    u.wants.length
      ? `Teach prompt shaped by what is missing: ${u.wants.map((w) => w.category).join(", ")}.`
      : "Teach prompt is open-ended — nothing is conspicuously missing.",
  );
  return why;
}

function whyRecommendation(
  guidance: EngineDebugView["guidance"],
  candidates: EngineDebugView["candidates"],
): string[] {
  if (!guidance.meta) {
    const rejected = candidates.filter((c) => c.rejectedBecause);
    return [
      "No recommendation was generated. Continue learning was the correct answer.",
      rejected.length
        ? `Rejected: ${rejected
            .slice(0, 5)
            .map((c) => `${c.evidenceId} (${c.rejectedBecause})`)
            .join("; ")}.`
        : "No evidence record was even a candidate for this understanding.",
    ];
  }
  const m = guidance.meta;
  return [
    `Matched ${m.evidenceId} in ${m.domain}: ${m.intervention} → ${m.expectedOutcome}.`,
    `Evidence quality ${m.evidenceQuality}, recommendation strength ${m.recommendationStrength}, reviewed ${m.dateReviewed}.`,
    `Applicability ${m.applicabilityScore} and personalization match ${m.personalizationMatch} both cleared the floor.`,
    `Uncertainty held at understanding ${m.uncertainty.understanding}, evidence ${m.uncertainty.evidence}, applicability ${m.uncertainty.applicability}.`,
    `Citations: ${m.citations.join(", ") || "none recorded"}.`,
  ];
}

export function buildDebugView(
  subjectId: string,
  u: Understanding,
  observations: Observation[],
): EngineDebugView {
  const { guidance, candidates, chain } = generateGuidance(u, observations);
  const { headline, accent } = headlineFor(u);

  const uncertainty = guidance.meta
    ? guidance.meta.uncertainty
    : {
        ...profileFor(u, null, 0),
        understanding: understandingUncertainty(u),
      };

  const explain: ExplainPanel = {
    observations: observations.slice(0, 25).map((o) => ({
      at: o.occurredAt,
      source: o.source,
      category: o.category,
      value: o.value,
      context:
        Object.entries(o.context)
          .filter(([k]) => k !== "externalId")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ") || "—",
    })),
    context: contextRows(u),
    memories: [...u.patterns, ...u.milestones].map((m) => ({
      key: m.key,
      kind: m.kind,
      summary: m.summary,
    })),
    beliefs: [...u.clearer, ...u.learning].map((b) => ({
      key: b.key,
      domain: b.domain,
      status: b.status,
      statement: b.statement,
    })),
    narrative: {
      headline,
      accent,
      standing: standingLine(u),
      evidence: evidenceFor(u),
      teachPrompt: teachPrompt(u),
      teachInvitation: teachInvitation(u),
    },
    whyNarrative: whyNarrative(u),
    whyRecommendation: whyRecommendation(guidance, candidates),
    snapshot: {
      depth: u.depth,
      state: u.state,
      observationCount: u.observationCount,
      daysKnown: u.daysKnown,
      takenAt: new Date().toISOString(),
    },
  };

  return {
    subjectId,
    understanding: {
      depth: u.depth,
      state: u.state,
      observationCount: u.observationCount,
      daysKnown: u.daysKnown,
      beliefsHolding: u.clearer.map((b) => `${b.key} · ${b.statement}`),
      beliefsForming: u.learning.map((b) => `${b.key} · ${b.statement}`),
      patterns: u.patterns.map((p) => p.summary),
      newest: u.newest ? `${u.newest.category}: ${u.newest.value}` : null,
      context: Object.fromEntries(contextRows(u).map((r) => [r.label, r.value])),
    },
    uncertainty,
    library: libraryStats(),
    candidates,
    guidance,
    chain,
    explain,
  };
}
