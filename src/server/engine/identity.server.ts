/**
 * Identity Service — one continuously evolving profile per person.
 *
 * A person is their authenticated account: `subjects.user_id` is the only
 * identity Ciatta recognises, and it comes from a server-validated session
 * token — never from the client. Everything downstream sees only `subjectId`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Subject = {
  id: string;
  identity: Record<string, unknown>;
  createdAt: string;
};

export async function getOrCreateSubject(userId: string): Promise<Subject> {
  const existing = await supabaseAdmin
    .from("subjects")
    .select("id, identity, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    return {
      id: existing.data.id,
      identity: (existing.data.identity ?? {}) as Record<string, unknown>,
      createdAt: existing.data.created_at,
    };
  }

  const created = await supabaseAdmin
    .from("subjects")
    .insert({ user_id: userId })
    .select("id, identity, created_at")
    .single();
  if (created.error) throw created.error;

  await supabaseAdmin.from("relationship_events").insert({
    subject_id: created.data.id,
    kind: "beginning",
    label: "We met",
    detail: {},
  });

  return {
    id: created.data.id,
    identity: (created.data.identity ?? {}) as Record<string, unknown>,
    createdAt: created.data.created_at,
  };
}

/** Merges what we now know about who this person is. Never destructive. */
export async function mergeIdentity(
  subjectId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const current = await supabaseAdmin
    .from("subjects")
    .select("identity")
    .eq("id", subjectId)
    .single();
  if (current.error) throw current.error;
  const merged = { ...((current.data.identity ?? {}) as Record<string, unknown>), ...patch };
  await supabaseAdmin
    .from("subjects")
    .update({ identity: merged as never, updated_at: new Date().toISOString() })
    .eq("id", subjectId);
}

export async function forgetSubject(userId: string): Promise<void> {
  await supabaseAdmin.from("subjects").delete().eq("user_id", userId);
}
