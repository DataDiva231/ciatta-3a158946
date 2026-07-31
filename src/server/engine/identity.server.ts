/**
 * Identity Service — one continuously evolving profile per person.
 *
 * The MVP identifies a person by a device-scoped key generated in the browser.
 * A real account id can later be attached to the same row (`user_id`) without
 * changing anything downstream: every other module only ever sees `subjectId`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Subject = {
  id: string;
  identity: Record<string, unknown>;
  createdAt: string;
};

export async function getOrCreateSubject(deviceKey: string): Promise<Subject> {
  const existing = await supabaseAdmin
    .from("subjects")
    .select("id, identity, created_at")
    .eq("device_key", deviceKey)
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
    .insert({ device_key: deviceKey })
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
    .update({ identity: merged, updated_at: new Date().toISOString() })
    .eq("id", subjectId);
}

export async function forgetSubject(deviceKey: string): Promise<void> {
  await supabaseAdmin.from("subjects").delete().eq("device_key", deviceKey);
}
