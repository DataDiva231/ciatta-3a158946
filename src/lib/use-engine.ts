/**
 * The screens' single connection to the Intelligence Engine.
 *
 * Everything the app has captured locally is translated into Observations and
 * handed to the engine; the engine hands back the four views. No screen decides
 * what anything means — it renders what comes back.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCheckIns, useQuickAddEvents, type CheckIn, type QuickAddEvent } from "./ciatta-store";
import type { EngineViews, ObservationInput } from "./engine-types";
import { syncEngine } from "./engine.functions";
import { useOnboarding, type Onboarding } from "./onboarding-store";
import { useSession } from "./session";

function fromQuickAdd(events: QuickAddEvent[]): ObservationInput[] {
  return events.map((e) => ({
    externalId: e.id,
    occurredAt: e.timestamp,
    source: e.category === "Note" ? "teach" : "quick_add",
    category: e.category,
    value: e.value,
    context: e.metadata ?? {},
  }));
}

function fromCheckIns(checkIns: CheckIn[]): ObservationInput[] {
  const out: ObservationInput[] = [];
  for (const c of checkIns) {
    const at = c.savedAt || `${c.day}T08:00:00.000Z`;
    // The engine records observations by externalId and permanently drops
    // any later input that reuses one (so a source can safely replay its
    // history). A check-in can be re-saved same-day with different values,
    // so `savedAt` has to be part of the id — otherwise an edit's new
    // values are silently discarded because the original day+category id
    // already exists.
    const edit = c.savedAt || at;
    const felt =
      ["", "Barely slept", "Restless", "Broken", "Solid", "Deep"][c.sleepFelt] ?? "Solid";
    out.push({
      externalId: `checkin-${c.day}-${edit}-sleep`,
      occurredAt: at,
      source: "check_in",
      category: "Sleep",
      value: felt,
      context: { energy: String(c.energy) },
    });
    if (c.mood)
      out.push({
        externalId: `checkin-${c.day}-${edit}-mood`,
        occurredAt: at,
        source: "check_in",
        category: "Mood",
        value: c.mood,
      });
    for (const symptom of c.symptoms)
      out.push({
        externalId: `checkin-${c.day}-${edit}-symptom-${symptom}`,
        occurredAt: at,
        source: "check_in",
        category: "Symptoms",
        value: symptom,
      });
    if (c.cycleStarted)
      out.push({
        externalId: `checkin-${c.day}-${edit}-cycle`,
        occurredAt: at,
        source: "check_in",
        category: "Cycle",
        value: "Cycle started",
        context: { cycleStarted: "true" },
      });
  }
  return out;
}

function fromOnboarding(data: Onboarding): {
  observations: ObservationInput[];
  identity: Record<string, unknown>;
} {
  if (!data.completed && !data.path.length) return { observations: [], identity: {} };

  const at = new Date().toISOString();
  const observations: ObservationInput[] = [];
  const push = (category: string, value: string) =>
    observations.push({
      externalId: `onboarding-${category}-${value}`,
      occurredAt: at,
      source: "onboarding",
      category,
      value,
      confidence: 0.8,
    });

  if (data.lifeStage) push("Life stage", data.lifeStage);
  for (const c of data.conditions) push("Condition", c);
  for (const m of data.medications) push("Medication", m);
  for (const s of data.supplements) push("Supplement", s);
  if (data.primaryGoal) push("Goal", data.primaryGoal);
  for (const [question, answers] of Object.entries(data.answers))
    for (const answer of answers) push(`Answer: ${question}`, answer);

  return {
    observations,
    identity: {
      name: data.name,
      lifeStage: data.lifeStage,
      conditions: data.conditions,
      medications: data.medications,
      supplements: data.supplements,
      priorities: data.priorities,
      primaryGoal: data.primaryGoal,
    },
  };
}

/**
 * Runs the learning loop for whatever is new, then returns the current views.
 * `null` while the engine has not answered yet — screens keep their own quiet
 * placeholder until then.
 */
export function useEngine(): { views: EngineViews | null; loading: boolean } {
  const { events, hydrated: eventsReady } = useQuickAddEvents();
  const { checkIns, hydrated: checkInsReady } = useCheckIns();
  const { data: onboarding, hydrated: onboardingReady } = useOnboarding();

  const { userId, ready: sessionReady } = useSession();
  const ready = eventsReady && checkInsReady && onboardingReady && sessionReady && !!userId;

  const payload = useMemo(() => {
    const fromOnb = fromOnboarding(onboarding);
    return {
      observations: [...fromQuickAdd(events), ...fromCheckIns(checkIns), ...fromOnb.observations],
      identity: fromOnb.identity,
    };
  }, [events, checkIns, onboarding]);

  // A full content signature, not just count + first item — otherwise an
  // edit to an existing entry (same count, different values) doesn't change
  // the key and the engine never resyncs with the new data.
  const signature = useMemo(
    () => payload.observations.map((o) => o.externalId).join("|"),
    [payload.observations],
  );

  const query = useQuery({
    queryKey: ["engine", userId ?? "anonymous", signature],
    enabled: ready && typeof window !== "undefined",
    staleTime: 30_000,
    queryFn: () =>
      syncEngine({
        data: {
          observations: payload.observations,
          identity: payload.identity,
        },
      }),
  });

  return { views: query.data ?? null, loading: query.isPending };
}
