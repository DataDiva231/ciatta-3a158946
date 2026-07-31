/**
 * Context Service — what was true around an observation.
 *
 * Meaning always comes from the observation plus its context. This module is
 * the single place that answers "what else was going on?", so every source
 * gets the same enrichment.
 */
import type { Observation } from "./observations.server";

import type { ObservationInput } from "@/lib/engine-types";

export type SubjectContext = {
  lifeStage: string | null;
  cyclePhase: string | null;
  cycleDay: number | null;
  medications: string[];
  /** What this person said they want, used by the Guidance Engine. */
  goals: string[];
  recentSleep: string | null;
  recentActivity: string | null;
};

const PHASES: { name: string; from: number; to: number }[] = [
  { name: "menstrual", from: 1, to: 5 },
  { name: "follicular", from: 6, to: 13 },
  { name: "ovulatory", from: 14, to: 16 },
  { name: "luteal", from: 17, to: 32 },
];

function timeOfDay(iso: string): string {
  const hour = new Date(iso).getHours();
  if (hour < 5) return "night";
  if (hour < 11) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/** Day of the current cycle, counted from the most recent cycle start. */
function cycleDay(observations: Observation[]): number | null {
  const start = observations.find(
    (o) =>
      o.category === "Cycle" ||
      o.value === "Cycle started" ||
      o.context["cycleStarted"] === "true",
  );
  if (!start) return null;
  const days = Math.floor((Date.now() - new Date(start.occurredAt).getTime()) / 86_400_000);
  return Math.max(1, days + 1);
}

function phaseFor(day: number | null): string | null {
  if (day === null) return null;
  return PHASES.find((p) => day >= p.from && day <= p.to)?.name ?? "luteal";
}

function latestValue(observations: Observation[], category: string): string | null {
  return observations.find((o) => o.category === category)?.value ?? null;
}

/** Builds the context Ciatta currently holds about this person. */
export function buildContext(
  identity: Record<string, unknown>,
  observations: Observation[],
): SubjectContext {
  const day = cycleDay(observations);
  return {
    lifeStage: (identity["lifeStage"] as string) || null,
    cyclePhase: phaseFor(day),
    cycleDay: day,
    medications: Array.isArray(identity["medications"])
      ? (identity["medications"] as string[])
      : [],
    recentSleep: latestValue(observations, "Sleep"),
    recentActivity: latestValue(observations, "Activity"),
  };
}

/** The context stamped onto each new observation as it is recorded. */
export function enrichmentFor(
  context: SubjectContext,
): (input: ObservationInput) => Record<string, string> {
  return (input) => {
    const stamped: Record<string, string> = { timeOfDay: timeOfDay(input.occurredAt) };
    if (context.lifeStage) stamped["lifeStage"] = context.lifeStage;
    if (context.cyclePhase) stamped["cyclePhase"] = context.cyclePhase;
    if (context.cycleDay !== null) stamped["cycleDay"] = String(context.cycleDay);
    if (context.recentSleep) stamped["recentSleep"] = context.recentSleep;
    if (context.recentActivity) stamped["recentActivity"] = context.recentActivity;
    if (context.medications.length) stamped["medications"] = context.medications.join(", ");
    return stamped;
  };
}
