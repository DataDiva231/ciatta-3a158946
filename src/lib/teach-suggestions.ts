/**
 * Adaptive Teach suggestions.
 *
 * Teach should never show the same list to every woman. These suggestions are
 * derived from cycle phase, what Ciatta has already been taught today, and how
 * confident it currently is — so the ask shrinks as understanding grows.
 */

import { phaseForDay, today } from "./ciatta-data";
import type { QuickAddEvent } from "./ciatta-store";

export type TeachSuggestion = {
  /** Quick Add category this jumps straight into. */
  category: string;
  label: string;
  /** Why Ciatta is asking, in its own voice. */
  reason: string;
};

const HOUR = 60 * 60 * 1000;

function hoursSince(events: QuickAddEvent[], category: string) {
  const last = events.find((e) => e.category === category);
  if (!last) return null;
  return (Date.now() - new Date(last.timestamp).getTime()) / HOUR;
}

function loggedToday(events: QuickAddEvent[], category: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return events.some(
    (e) => e.category === category && new Date(e.timestamp).getTime() >= start.getTime(),
  );
}

/**
 * Returns the two or three things Ciatta still needs, most useful first.
 * High confidence deliberately returns fewer asks.
 */
export function buildTeachSuggestions(
  events: QuickAddEvent[],
  confidence: number,
): TeachSuggestion[] {
  const phase = phaseForDay(today.cycleDay);
  const menstrual = phase === "menstrual";
  const out: TeachSuggestion[] = [];

  const sinceProduct = hoursSince(events, "Period Product");
  if (menstrual) {
    if (sinceProduct === null) {
      out.push({
        category: "Period Product",
        label: "Period product",
        reason: "Ciatta hasn't seen a change today",
      });
    } else if (sinceProduct >= 3) {
      out.push({
        category: "Period Product",
        label: "Period product",
        reason: `${Math.floor(sinceProduct)} hrs since your last change`,
      });
    }
  }

  if (!loggedToday(events, "Sleep")) {
    out.push({
      category: "Sleep",
      label: "Sleep",
      reason: "Your own read sharpens tonight's recovery",
    });
  }

  if (menstrual && !loggedToday(events, "Symptoms")) {
    out.push({
      category: "Symptoms",
      label: "Symptoms",
      reason: "Cramps and mood shift with this phase",
    });
  }

  if (!loggedToday(events, "Activity")) {
    out.push({
      category: "Activity",
      label: "Activity",
      reason: "Effort is read against recovery, not the calendar",
    });
  }

  // The more Ciatta already understands, the less it asks for.
  const room = confidence >= 90 ? 1 : confidence >= 78 ? 2 : 3;
  return out.slice(0, room);
}

/** One line describing how much Ciatta currently understands. */
export function confidenceLine(confidence: number, asks: number) {
  if (asks === 0) return "Ciatta has everything it needs today.";
  if (confidence >= 90) return `${confidence}% understanding — only one thing left to learn.`;
  return `${confidence}% understanding of today. ${asks} things would sharpen it.`;
}
