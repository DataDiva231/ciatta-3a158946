/**
 * Adaptation — the layer between Understanding and Narrative that decides
 * what Ciatta surfaces, asks, or prioritizes next. Not what to say (that's
 * the Narrative Engine's job); what to draw attention to.
 *
 * This module unifies the entry point for Ciatta's existing adaptive
 * decisions under one name — it does not merge their logic. The codebase
 * already drew a deliberate, safety-relevant line between two kinds of
 * adaptation, and this module preserves it rather than flattening it:
 *
 *   - Curiosity — "what would help me understand you better?" — asking.
 *     `suggestionsFor`/`followUpFor` below, moved here verbatim from the
 *     former curiosity.server.ts.
 *   - Guidance — "what should you do?" — recommending. Re-exported, not
 *     moved: the Guidance Engine (src/server/guidance/guidance.server.ts)
 *     is a larger, already well-isolated subsystem with its own
 *     evidence-matching and uncertainty-profiling pipeline, and an explicit
 *     charter ("the only layer allowed to recommend") that deserves its own
 *     dedicated look before anything about its internals changes. Unifying
 *     the entry point now, without touching its internals, is the safe,
 *     incremental step — see PHASE_3_MIGRATION_PLAN.md, A3.
 */
import type { Understanding } from "./understanding.server";

export { generateGuidance, type GuidanceResult } from "@/server/guidance/guidance.server";

/** Contextual Quick Add suggestions, ordered by how much they'd teach me. */
export function suggestionsFor(u: Understanding) {
  return u.wants.map((want) => ({
    category: want.category,
    label: want.category,
    reason: want.reason,
  }));
}

/** One adaptive follow-up, based on the last thing shared. */
export function followUpFor(u: Understanding): string | null {
  if (!u.newest) return null;
  const c = u.newest.category;
  if (c === "Sleep") return "Did anything wake you, or was it just light?";
  if (c === "Symptoms") return "Has this been building, or did it arrive today?";
  if (c === "Flow" || c === "Period Product") return "Is this usual for this point in your period?";
  if (c === "Activity") return "How did your body feel afterwards?";
  if (c === "Mood") return "Was there anything around it, or did it just arrive?";
  return null;
}
