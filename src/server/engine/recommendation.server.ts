/**
 * Recommendation Engine — one focus for today, and the next best thing to
 * learn. Explanations only: no diagnosis, no prediction, no prescription.
 */
import type { Understanding } from "./understanding.server";

export function focusFor(u: Understanding): { lead: string; rest: string; support: string } {
  if (u.observationCount === 0)
    return {
      lead: "Start anywhere.",
      rest: "One small thing about today is enough.",
      support: "I learn faster from what you notice than from what I measure.",
    };

  const flowHeavy =
    u.newest && (u.newest.value === "Heavy" || u.newest.context["Flow"] === "Heavy");
  if (flowHeavy)
    return {
      lead: "Stay ahead of it.",
      rest: "You may want to change sooner than usual today.",
      support: "I'd keep an eye on it for the next few hours.",
    };

  if (u.state === "recover")
    return {
      lead: "Protect your rest.",
      rest: "An earlier night would help more than anything else today.",
      support: "From what you've shared, rest is where your body recovers fastest.",
    };

  if (u.state === "strong")
    return {
      lead: "Use it.",
      rest: "This looks like a good day for something harder.",
      support: "What you've told me suggests you can carry the extra load.",
    };

  return {
    lead: "Keep it simple.",
    rest: "Hold your usual rhythm today.",
    support: "Nothing needs changing. I'll tell you when I notice something.",
  };
}

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
