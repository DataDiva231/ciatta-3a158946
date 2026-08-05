/**
 * API Layer (server side) — the four views into the one understanding.
 *
 * Today, Teach, Journey and Profile are not features. They are questions asked
 * of the same model. Understanding is explained by the Narrative Engine;
 * anything action-shaped comes from the Guidance Engine, which is the only
 * layer permitted to recommend.
 */
import { beliefPhrase, journeyOpening } from "./narrative.server";
import {
  acknowledgment,
  evidenceFor,
  headlineFor,
  profileSummary,
  standingLine,
  teachInvitation,
  teachPrompt,
} from "./narrative.server";
import { listRelationshipEvents } from "./memory.server";
import { followUpFor, generateGuidance, suggestionsFor } from "./adaptation.server";
import { previousSnapshot, type Understanding } from "./understanding.server";

import type { Observation } from "./observations.server";
import type { EngineViews } from "@/lib/engine-types";

export async function buildViews(
  subjectId: string,
  u: Understanding,
  observations: Observation[] = [],
): Promise<EngineViews> {
  const { headline, accent } = headlineFor(u);
  const previous = await previousSnapshot(subjectId);
  const events = await listRelationshipEvents(subjectId);
  const { guidance } = generateGuidance(u, observations);

  const changes: string[] = [];
  if (previous) {
    const before = Number(previous.depth);
    if (u.depth > before + 2) changes.push("A few things became clearer since you were last here.");
    const heldBefore = ((previous.summary as { holding?: string[] } | null)?.holding ?? []).length;
    if (u.clearer.length > heldBefore)
      changes.push("Something I was unsure about started to hold up.");
  }
  if (!changes.length && u.newest)
    changes.push("What you shared today is already part of how I read you.");

  return {
    today: {
      headline,
      accent,
      standing: standingLine(u),
      evidence: evidenceFor(u),
      focus: { lead: guidance.lead, rest: guidance.rest, support: guidance.support },
      acknowledgment: acknowledgment(u),
      depth: u.depth,
    },
    teach: {
      prompt: teachPrompt(u),
      invitation: teachInvitation(u),
      suggestions: suggestionsFor(u),
      followUp: followUpFor(u),
    },
    journey: {
      opening: journeyOpening(u),
      discoveries: u.patterns.slice(0, 4).map((p) => ({
        title: `${p.detail["category"] ?? "Something"} keeps returning`,
        body: p.summary,
      })),
      clearer: u.clearer.slice(0, 3).map((b) => ({
        title: b.domain,
        before: "I had no read on this.",
        now: beliefPhrase(b),
      })),
      milestones: events
        .filter((e) => e.kind === "milestone" || e.kind === "beginning")
        .slice(0, 6)
        .map((e) => ({ label: e.label, note: "", at: e.occurred_at })),
      changes,
    },
    profile: {
      summary: profileSummary(u),
      becomingClearer: u.clearer.slice(0, 3).map(beliefPhrase),
      stillUncertain: u.learning.slice(0, 3).map(beliefPhrase),
      payingAttentionTo: u.wants.map((w) => w.category),
      learningFrom: Array.from(
        new Set(u.patterns.map((p) => p.detail["category"] ?? "").filter(Boolean)),
      ).slice(0, 5),
    },
  };
}
