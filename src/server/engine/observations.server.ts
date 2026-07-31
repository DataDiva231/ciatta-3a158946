/**
 * Observation Service — the immutable record of everything that happened.
 *
 * Observations are append-only. Nothing in the engine ever overwrites one;
 * later interpretation lives in memory, beliefs and understanding instead.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { ObservationInput } from "@/lib/engine-types";

export type Observation = {
  id: string;
  occurredAt: string;
  source: string;
  category: string;
  value: string;
  context: Record<string, string>;
  confidence: number;
};

function rowToObservation(row: {
  id: string;
  occurred_at: string;
  source: string;
  category: string;
  value: string;
  context: unknown;
  confidence: number;
}): Observation {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    source: row.source,
    category: row.category,
    value: row.value,
    context: (row.context ?? {}) as Record<string, string>,
    confidence: Number(row.confidence),
  };
}

/**
 * Records observations. Anything already recorded (same external id) is
 * skipped, so a source can safely replay its history.
 */
export async function recordObservations(
  subjectId: string,
  inputs: ObservationInput[],
  enrich: (input: ObservationInput) => Record<string, string>,
): Promise<Observation[]> {
  if (!inputs.length) return [];

  const externalIds = inputs.map((i) => i.externalId).filter(Boolean) as string[];
  const seen = new Set<string>();
  if (externalIds.length) {
    const existing = await supabaseAdmin
      .from("observations")
      .select("context")
      .eq("subject_id", subjectId)
      .in("context->>externalId", externalIds);
    for (const row of existing.data ?? []) {
      const id = (row.context as Record<string, string> | null)?.["externalId"];
      if (id) seen.add(id);
    }
  }

  const fresh = inputs.filter((i) => !i.externalId || !seen.has(i.externalId));
  if (!fresh.length) return [];

  const payload = fresh.map((input) => ({
    subject_id: subjectId,
    occurred_at: input.occurredAt,
    source: input.source,
    category: input.category,
    value: input.value,
    confidence: input.confidence ?? 0.6,
    context: {
      ...(input.context ?? {}),
      ...enrich(input),
      ...(input.externalId ? { externalId: input.externalId } : {}),
    } as never,
  }));

  const inserted = await supabaseAdmin
    .from("observations")
    .insert(payload)
    .select("id, occurred_at, source, category, value, context, confidence");
  if (inserted.error) throw inserted.error;
  return (inserted.data ?? []).map(rowToObservation);
}

export async function listObservations(subjectId: string, limit = 400): Promise<Observation[]> {
  const { data, error } = await supabaseAdmin
    .from("observations")
    .select("id, occurred_at, source, category, value, context, confidence")
    .eq("subject_id", subjectId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToObservation);
}

export function within(observations: Observation[], days: number): Observation[] {
  const cutoff = Date.now() - days * 86_400_000;
  return observations.filter((o) => new Date(o.occurredAt).getTime() >= cutoff);
}
