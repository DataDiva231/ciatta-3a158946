/**
 * Curiosity — the teach side of the relationship. Not guidance.
 *
 * This asks "what would help me understand you better?" and never "what should
 * you do?". Recommendations live in the Guidance Engine.
 */
import type { Understanding } from "./understanding.server";

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
