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
  /** A moment in the user's own words, not a menu label. */
  label: string;
  /** What sharing it gives back to her. */
  reason: string;
  /**
   * The follow-up shown in the sheet for this exact moment, so the sheet opens
   * on the question the chip implies instead of the generic category step.
   */
  step: {
    title: string;
    sub: string;
    options: { label: string; note?: string }[];
  };
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
 * Returns the two or three moments most worth sharing right now, phrased the
 * way a woman would say them out loud.
 */
export function buildTeachSuggestions(
  events: QuickAddEvent[],
  confidence: number,
): TeachSuggestion[] {
  const phase = phaseForDay(today.cycleDay);
  const menstrual = phase === "Menstrual";
  const evening = new Date().getHours() >= 17;
  const out: TeachSuggestion[] = [];

  const sinceProduct = hoursSince(events, "Period Product");
  if (menstrual && (sinceProduct === null || sinceProduct >= 3)) {
    out.push({
      category: "Period Product",
      label: "My flow changed",
      reason: "Sharing this will help make your days ahead easier to plan.",
      step: {
        title: "How has it changed?",
        sub: "Sharing this will help make your days ahead easier to plan.",
        options: [
          { label: "Heavier than before", note: "Changing more often" },
          { label: "Lighter than before", note: "Easing off" },
          { label: "Started suddenly", note: "Earlier than expected" },
          { label: "Almost stopped", note: "Spotting only" },
        ],
      },
    });
  }

  if (menstrual && !loggedToday(events, "Symptoms")) {
    out.push({
      category: "Symptoms",
      label: "I have a headache",
      reason: "Sharing this will help patterns like this stop surprising you.",
      step: {
        title: "What does it feel like?",
        sub: "Sharing this will help patterns like this stop surprising you.",
        options: [
          { label: "Dull ache", note: "Background pressure" },
          { label: "Sharp or throbbing", note: "Hard to ignore" },
          { label: "Behind my eyes", note: "Light feels harsh" },
          { label: "With nausea", note: "Stomach unsettled" },
        ],
      },
    });
  }

  if (!loggedToday(events, "Sleep")) {
    out.push({
      category: "Sleep",
      label: "I slept poorly",
      reason: "Sharing this will help make tomorrow's recovery guidance more personal.",
      step: {
        title: "What made it hard?",
        sub: "Sharing this will help make tomorrow's recovery guidance more personal.",
        options: [
          { label: "Difficulty falling asleep", note: "Mind still going" },
          { label: "Woke up during the night", note: "More than once" },
          { label: "Woke up early", note: "Couldn't drift back" },
          { label: "Restless sleep", note: "Never fully settled" },
        ],
      },
    });
  }

  if (!loggedToday(events, "Activity")) {
    out.push({
      category: "Activity",
      label: evening ? "My energy feels low" : "I'm feeling stressed",
      reason: evening
        ? "Sharing this will help effort be read against your recovery."
        : "Sharing this will help you know when to push and when to ease.",
      step: evening
        ? {
            title: "How low does it feel?",
            sub: "Sharing this will help effort be read against your recovery.",
            options: [
              { label: "Heavy and slow", note: "Everything takes effort" },
              { label: "Fine until afternoon", note: "Faded later" },
              { label: "Wired but tired", note: "Restless, not rested" },
              { label: "Just need rest", note: "Nothing structured today" },
            ],
          }
        : {
            title: "Where is the stress sitting?",
            sub: "Sharing this will help you know when to push and when to ease.",
            options: [
              { label: "In my body", note: "Tense shoulders, jaw" },
              { label: "In my head", note: "Can't switch off" },
              { label: "Work or deadlines", note: "Load is high" },
              { label: "Life outside work", note: "Home or people" },
            ],
          },
    });
  }


  // The clearer things already are, the fewer moments to offer.
  const room = confidence >= 90 ? 1 : confidence >= 78 ? 2 : 3;
  return out.slice(0, room);
}

/** One warm line about what sharing gives back. */
export function confidenceLine() {
  return "Everything you share makes tomorrow's understanding more personal.";
}
