/**
 * Narrative Engine — all user-facing language, generated from structured
 * understanding.
 *
 * Calm, humble, conversational, curious. Never certain, never technical, never
 * a number. Screens render these strings verbatim.
 */
import type { Belief } from "./beliefs.server";
import type { Understanding } from "./understanding.server";

export function standingLine(u: Understanding): string {
  if (u.observationCount === 0) return "I don't know you yet. Tell me anything.";
  if (u.depth < 30) return "I'm just beginning to notice how your days move.";
  if (u.depth < 55) return "I'm starting to see some shape in what you share.";
  if (u.depth < 78) return "I'm beginning to understand how your body tends to move.";
  return "I know your rhythm well enough to notice when it changes.";
}

export function headlineFor(u: Understanding): { headline: string; accent: string } {
  const flowHeavy =
    u.newest && (u.newest.value === "Heavy" || u.newest.context["Flow"] === "Heavy");

  if (u.observationCount === 0)
    return { headline: "There's nothing I understand about today yet.", accent: "yet" };
  if (flowHeavy)
    return {
      headline: "It looks like your flow is heavier than usual today.",
      accent: "heavier than usual",
    };
  if (u.state === "recover")
    return {
      headline: "It looks like your body is asking for more recovery today.",
      accent: "more recovery",
    };
  if (u.state === "strong")
    return { headline: "It looks like you have room to push today.", accent: "room to push" };
  return { headline: "You seem to be holding steady today.", accent: "holding steady" };
}

export function evidenceFor(u: Understanding) {
  const evidence: { label: string; text: string }[] = [];

  if (u.context.cyclePhase && u.context.cycleDay !== null) {
    evidence.push({
      label: "Cycle",
      text: `Day ${u.context.cycleDay}. You're in your ${u.context.cyclePhase} phase, from what you've told me.`,
    });
  }
  if (u.context.recentSleep) {
    evidence.push({
      label: "Sleep",
      text: `You told me your sleep was ${u.context.recentSleep.toLowerCase()}. I'm reading today against that.`,
    });
  }
  if (u.context.recentActivity) {
    evidence.push({
      label: "Movement",
      text: `Your last session was ${u.context.recentActivity.toLowerCase()}. I've made room for it.`,
    });
  }
  for (const pattern of u.patterns.slice(0, 2)) {
    evidence.push({ label: "Something recurring", text: pattern.summary });
  }
  if (u.strongest) {
    evidence.push({ label: "What I'm noticing", text: u.strongest.statement });
  }
  if (!evidence.length) {
    evidence.push({
      label: "Where we are",
      text: "I'm working from very little so far. Anything you share changes this.",
    });
  }
  return evidence.slice(0, 5);
}

export function acknowledgment(u: Understanding): string | null {
  if (!u.newest) return null;
  const detail = [u.newest.value, u.newest.context["Absorbency"], u.newest.context["Flow"]]
    .filter(Boolean)
    .join(" · ");
  if (u.newest.category === "Sleep")
    return `You told me about your sleep — ${detail.toLowerCase()}. I've read today against it.`;
  if (u.newest.category === "Symptoms")
    return `I'm holding ${detail.toLowerCase()} next to where you are in your cycle.`;
  if (u.newest.category === "Note") return "Thank you for that. I've kept it.";
  return `I've folded ${detail.toLowerCase()} into how I read today.`;
}

export function beliefPhrase(belief: Belief): string {
  if (belief.status === "holding") return belief.statement;
  if (belief.status === "fading") return `I'm less sure that ${lower(belief.statement)}`;
  return `I'm beginning to notice that ${lower(belief.statement)}`;
}

function lower(sentence: string): string {
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

export function teachPrompt(u: Understanding): string {
  if (u.observationCount === 0) return "Tell me anything about today.";
  if (u.wants.length) return "What happened today?";
  return "What happened today?";
}

export function teachInvitation(u: Understanding): string {
  const want = u.wants[0];
  if (!want) return "Everything you share makes tomorrow's understanding more personal.";
  return `${want.reason} I'm still learning that part of you.`;
}

export function profileSummary(u: Understanding): string {
  const parts: string[] = [];
  if (u.context.lifeStage) parts.push(`You've told me you're ${u.context.lifeStage.toLowerCase()}`);
  else parts.push("I'm still learning the shape of your life right now");

  if (u.clearer.length) parts.push(`and ${lower(beliefPhrase(u.clearer[0]!))}`);
  else if (u.learning.length) parts.push(`and ${lower(beliefPhrase(u.learning[0]!))}`);

  const closing =
    u.depth < 40
      ? "It's early between us, and I'd rather be honest about that than sound certain."
      : "None of it is fixed — I keep revising as you share more.";
  return `${parts.join(" ")}. ${closing}`;
}

export function journeyOpening(u: Understanding): string {
  if (!u.observationCount) return "Our story hasn't started yet.";
  if (u.daysKnown < 1) return "We met today. This is everything so far.";
  return `We've known each other ${u.daysKnown === 1 ? "a day" : `${u.daysKnown} days`}. Here's what's changed.`;
}
