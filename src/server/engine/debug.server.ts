/**
 * Explainability surface — every recommendation must be traceable back through
 * evidence, understanding and observation. This assembles that trace.
 */
import { libraryStats } from "@/server/evidence/library.server";
import { generateGuidance } from "@/server/guidance/guidance.server";
import type { EngineDebugView } from "@/lib/evidence-types";

import type { Observation } from "./observations.server";
import type { Understanding } from "./understanding.server";
import { profileFor, understandingUncertainty } from "./uncertainty.server";

export function buildDebugView(
  subjectId: string,
  u: Understanding,
  observations: Observation[],
): EngineDebugView {
  const { guidance, candidates, chain } = generateGuidance(u, observations);

  const uncertainty = guidance.meta
    ? guidance.meta.uncertainty
    : {
        ...profileFor(u, null, 0),
        understanding: understandingUncertainty(u),
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
      context: {
        lifeStage: u.context.lifeStage ?? "—",
        cyclePhase: u.context.cyclePhase ?? "—",
        cycleDay: u.context.cycleDay === null ? "—" : String(u.context.cycleDay),
        goals: u.context.goals.join(", ") || "—",
        medications: u.context.medications.join(", ") || "—",
        recentSleep: u.context.recentSleep ?? "—",
        recentActivity: u.context.recentActivity ?? "—",
      },
    },
    uncertainty,
    library: libraryStats(),
    candidates,
    guidance,
    chain,
  };
}
