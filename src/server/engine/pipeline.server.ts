/**
 * Learning Loop — the single pipeline every interaction flows through:
 *
 *   Observation → Context → Memory → Belief revision → Understanding →
 *   Narrative → Frontend refresh
 *
 * Any future source (Apple Health, Health Connect, Ciatta Arc, Webbee, labs,
 * clinician summaries, environmental data) only has to produce Observations.
 */
import { listBeliefs, reviseBeliefs } from "./beliefs.server";
import { buildContext, enrichmentFor } from "./context.server";
import { getOrCreateSubject, mergeIdentity } from "./identity.server";
import { listMemories, rememberMilestone, updateMemory } from "./memory.server";
import { listObservations, recordObservations } from "./observations.server";
import { saveSnapshot, synthesise, type Understanding } from "./understanding.server";

import type { ObservationInput } from "@/lib/engine-types";

export type LoopResult = {
  subjectId: string;
  createdAt: string;
  understanding: Understanding;
};

/** Runs the loop. With no new observations it simply re-reads understanding. */
export async function runLearningLoop(
  deviceKey: string,
  incoming: ObservationInput[] = [],
  identityPatch: Record<string, unknown> = {},
): Promise<LoopResult> {
  const subject = await getOrCreateSubject(deviceKey);
  if (Object.keys(identityPatch).length) {
    await mergeIdentity(subject.id, identityPatch);
  }
  const identity = { ...subject.identity, ...identityPatch };

  // 1. Context — built from what we already hold, then stamped onto the new
  //    observations so meaning is preserved at the moment of recording.
  let history = await listObservations(subject.id);
  const context = buildContext(identity, history);

  // 2. Observation — immutable, append-only.
  const fresh = await recordObservations(subject.id, incoming, enrichmentFor(context));
  if (fresh.length) history = [...fresh, ...history];

  // 3. Memory — what Ciatta remembers, not what was logged.
  if (fresh.length) await updateMemory(subject.id, fresh, history);

  // 4. Belief revision — strengthen, weaken, form, drop.
  if (fresh.length) await reviseBeliefs(subject.id, fresh, history);
  const beliefs = await listBeliefs(subject.id);
  const memories = await listMemories(subject.id);

  // 5. Understanding — one synthesis across everything above.
  const understanding = synthesise({
    observations: history,
    beliefs,
    memories,
    context: buildContext(identity, history),
    createdAt: subject.createdAt,
  });

  if (fresh.length) {
    await saveSnapshot(subject.id, understanding);
    await recordMilestones(subject.id, understanding);
  }

  return { subjectId: subject.id, createdAt: subject.createdAt, understanding };
}

/** Relationship milestones, recorded the moment they happen. */
async function recordMilestones(subjectId: string, u: Understanding): Promise<void> {
  if (u.observationCount >= 1)
    await rememberMilestone(subjectId, "first-thing-shared", "You told me something for the first time.");
  if (u.observationCount >= 10)
    await rememberMilestone(subjectId, "ten-things-shared", "Ten things shared. Patterns started to appear.");
  if (u.patterns.length >= 1)
    await rememberMilestone(subjectId, "first-pattern", "I noticed something repeating.");
  if (u.clearer.length >= 1)
    await rememberMilestone(subjectId, "first-belief-held", "Something I suspected started holding up.");
  if (u.depth >= 50)
    await rememberMilestone(subjectId, "halfway", "I began to understand how your body tends to move.");
  if (u.depth >= 80)
    await rememberMilestone(subjectId, "deep", "I know your rhythm well enough to notice changes.");
}
