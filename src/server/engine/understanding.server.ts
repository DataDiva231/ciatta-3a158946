/**
 * Understanding Engine — one current understanding, synthesised from
 * observations, context, memory and beliefs.
 *
 * It answers: what do I currently understand, what am I still learning, what
 * became clearer, what supports this, and what would help next. It explains.
 * It does not diagnose and it does not predict.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Belief } from "./beliefs.server";
import type { SubjectContext } from "./context.server";
import type { Memory } from "./memory.server";
import { within, type Observation } from "./observations.server";

export type Understanding = {
  /** 0–100. Internal only; used for pacing, never shown as a number. */
  depth: number;
  /** How the body currently reads: recovering, steady, or with room to push. */
  state: "recover" | "steady" | "strong";
  strongest: Belief | null;
  learning: Belief[];
  clearer: Belief[];
  patterns: Memory[];
  milestones: Memory[];
  context: SubjectContext;
  /** The last thing shared, if it was recent enough to matter today. */
  newest: Observation | null;
  /** Category the engine would most like to hear about next. */
  wants: { category: string; reason: string }[];
  observationCount: number;
  daysKnown: number;
};

const WANTED: { category: string; reason: string }[] = [
  { category: "Sleep", reason: "Sleep explains more of your day than anything else." },
  { category: "Flow", reason: "Flow tells me where you are in your cycle." },
  { category: "Symptoms", reason: "Symptoms are how I learn your patterns." },
  { category: "Mood", reason: "Mood often moves before anything else does." },
  { category: "Activity", reason: "Movement changes how the rest of the day reads." },
  { category: "Period Product", reason: "It helps me learn the shape of your period." },
];

function resolveState(observations: Observation[]): Understanding["state"] {
  for (const o of within(observations, 1)) {
    if (o.category === "Sleep" && (o.value === "Barely slept" || o.value === "Restless"))
      return "recover";
    if (o.category === "Symptoms") return "recover";
    if (o.value === "Heavy" || o.context["Flow"] === "Heavy") return "recover";
    if (o.category === "Activity" && o.value === "Hard") return "recover";
    if (o.category === "Sleep" && o.value === "Deep") return "strong";
  }
  return "steady";
}

/** Depth grows with breadth, recency and how much has held up over time. */
function resolveDepth(observations: Observation[], beliefs: Belief[], daysKnown: number): number {
  const breadth = new Set(observations.map((o) => o.category)).size;
  const recent = within(observations, 7).length;
  const held = beliefs.filter((b) => b.status === "holding").length;
  return Math.round(
    Math.min(
      97,
      8 +
        Math.min(24, breadth * 5) +
        Math.min(24, recent * 2) +
        Math.min(24, held * 8) +
        Math.min(17, daysKnown * 1.5),
    ),
  );
}

export function synthesise(input: {
  observations: Observation[];
  beliefs: Belief[];
  memories: Memory[];
  context: SubjectContext;
  createdAt: string;
}): Understanding {
  const { observations, beliefs, memories, context } = input;
  const daysKnown = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.createdAt).getTime()) / 86_400_000),
  );

  const known = new Set(observations.map((o) => o.category));
  const wants = WANTED.filter((w) => !known.has(w.category)).slice(0, 3);
  const fallbackWants = WANTED.filter((w) => {
    const last = observations.find((o) => o.category === w.category);
    return !last || Date.now() - new Date(last.occurredAt).getTime() > 2 * 86_400_000;
  }).slice(0, 3);

  return {
    depth: resolveDepth(observations, beliefs, daysKnown),
    state: resolveState(observations),
    strongest: beliefs[0] ?? null,
    learning: beliefs.filter((b) => b.status === "forming"),
    clearer: beliefs.filter((b) => b.status === "holding"),
    patterns: memories.filter((m) => m.kind === "pattern"),
    milestones: memories.filter((m) => m.kind === "milestone"),
    context,
    newest: within(observations, 1)[0] ?? null,
    wants: wants.length ? wants : fallbackWants,
    observationCount: observations.length,
    daysKnown,
  };
}

/** Records the understanding so Journey can speak about what changed. */
export async function saveSnapshot(subjectId: string, understanding: Understanding): Promise<void> {
  await supabaseAdmin.from("understanding_snapshots").insert({
    subject_id: subjectId,
    depth: understanding.depth,
    summary: {
      state: understanding.state,
      strongest: understanding.strongest?.statement ?? null,
      holding: understanding.clearer.map((b) => b.key),
      observations: understanding.observationCount,
    } as never,
  });
}

export async function previousSnapshot(subjectId: string) {
  const { data } = await supabaseAdmin
    .from("understanding_snapshots")
    .select("depth, summary, created_at")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .range(1, 1);
  return data?.[0] ?? null;
}
