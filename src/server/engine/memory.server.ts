/**
 * Memory Service — what Ciatta remembers, as distinct from what was logged.
 *
 * Memory holds recurring behaviour, emerging patterns, explanations already
 * formed, relationship milestones and interaction history. It survives between
 * sessions and is never a raw log.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Observation } from "./observations.server";

export type MemoryKind = "behaviour" | "pattern" | "explanation" | "milestone" | "interaction";

export type Memory = {
  kind: MemoryKind;
  key: string;
  summary: string;
  detail: Record<string, string>;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export async function listMemories(subjectId: string): Promise<Memory[]> {
  const { data, error } = await supabaseAdmin
    .from("memories")
    .select("kind, key, summary, detail, occurrences, first_seen_at, last_seen_at")
    .eq("subject_id", subjectId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    kind: row.kind as MemoryKind,
    key: row.key,
    summary: row.summary,
    detail: (row.detail ?? {}) as Record<string, string>,
    occurrences: row.occurrences,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }));
}

async function remember(
  subjectId: string,
  kind: MemoryKind,
  key: string,
  summary: string,
  detail: Record<string, string> = {},
): Promise<void> {
  const existing = await supabaseAdmin
    .from("memories")
    .select("id, occurrences")
    .eq("subject_id", subjectId)
    .eq("kind", kind)
    .eq("key", key)
    .maybeSingle();

  if (existing.data) {
    await supabaseAdmin
      .from("memories")
      .update({
        summary,
        detail: detail as never,
        occurrences: existing.data.occurrences + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id);
    return;
  }

  await supabaseAdmin.from("memories").insert({
    subject_id: subjectId,
    kind,
    key,
    summary,
    detail: detail as never,
  });
}

/** Folds new observations into memory. Called once per pipeline run. */
export async function updateMemory(
  subjectId: string,
  fresh: Observation[],
  all: Observation[],
): Promise<void> {
  for (const o of fresh) {
    await remember(
      subjectId,
      "behaviour",
      `${o.category}:${o.value}`.toLowerCase(),
      `${o.category} — ${o.value}`,
      { category: o.category, value: o.value, cyclePhase: o.context["cyclePhase"] ?? "" },
    );

    await remember(subjectId, "interaction", o.source, `Shared through ${o.source}`, {
      source: o.source,
    });
  }

  // Recurrence is the seed of a pattern: three or more of the same thing.
  const counts = new Map<string, Observation[]>();
  for (const o of all) {
    const key = `${o.category}:${o.value}`.toLowerCase();
    counts.set(key, [...(counts.get(key) ?? []), o]);
  }
  for (const [key, group] of counts) {
    if (group.length < 3) continue;
    const first = group[group.length - 1]!;
    const phase = group.find((g) => g.context["cyclePhase"])?.context["cyclePhase"];
    await remember(
      subjectId,
      "pattern",
      key,
      phase
        ? `${first.category} of ${first.value} keeps appearing in your ${phase} phase.`
        : `${first.category} of ${first.value} keeps coming back.`,
      { times: String(group.length), category: first.category, value: first.value },
    );
  }
}

export async function rememberMilestone(
  subjectId: string,
  key: string,
  summary: string,
  detail: Record<string, string> = {},
): Promise<void> {
  const existing = await supabaseAdmin
    .from("memories")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("kind", "milestone")
    .eq("key", key)
    .maybeSingle();
  if (existing.data) return;

  await supabaseAdmin.from("memories").insert({
    subject_id: subjectId,
    kind: "milestone",
    key,
    summary,
    detail: detail as never,
  });
  await supabaseAdmin.from("relationship_events").insert({
    subject_id: subjectId,
    kind: "milestone",
    label: summary,
    detail: detail as never,
  });
}

export async function listRelationshipEvents(subjectId: string, limit = 40) {
  const { data, error } = await supabaseAdmin
    .from("relationship_events")
    .select("kind, label, detail, occurred_at")
    .eq("subject_id", subjectId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
