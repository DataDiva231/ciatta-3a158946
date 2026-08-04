/**
 * Connection store — one table, one lifecycle, every source.
 *
 * Status, timings, granted scopes and sealed credentials all live here. No
 * provider writes to the database itself; they hand results back and this module
 * records them, which is why adding a source never touches the engine.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { SOURCE_IDS, type SourceId, type SourceStatus } from "@/lib/health-sources";

import { open, seal } from "./tokens.server";

export type ProviderCredentials = {
  accessToken?: string;
  refreshToken?: string;
  /** ISO timestamp. */
  expiresAt?: string;
  scopes?: string[];
  externalAccountId?: string;
  /** Pending authorization state, echoed back on the callback. */
  oauthState?: string;
  /** Where the last sync stopped, so the next one resumes. */
  cursor?: string;
};

export type Connection = {
  provider: SourceId;
  status: SourceStatus;
  scopes: string[];
  metrics: string[];
  connectedAt: string | null;
  lastSyncAt: string | null
  error: string | null;
};

export function isSourceId(value: string): value is SourceId {
  return (SOURCE_IDS as readonly string[]).includes(value);
}

const NONE = (provider: SourceId): Connection => ({
  provider,
  status: "not_connected",
  scopes: [],
  metrics: [],
  connectedAt: null,
  lastSyncAt: null,
  error: null,
});

const SELECT =
  "provider, status, scopes, metrics, connected_at, disconnected_at, last_sync_at, last_import_at, last_error, token_ciphertext";

type Row = {
  provider: string;
  status: string | null;
  scopes: string[] | null;
  metrics: string[] | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_sync_at: string | null;
  last_import_at: string | null;
  last_error: string | null;
  token_ciphertext: string | null;
};

function toConnection(row: Row): Connection {
  const provider = row.provider as SourceId;
  if (row.disconnected_at || !row.connected_at) return NONE(provider);
  const status = (row.status ?? "connected") as SourceStatus;
  return {
    provider,
    status,
    scopes: row.scopes ?? [],
    metrics: row.metrics ?? [],
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at ?? row.last_import_at,
    error: status === "sync_error" ? row.last_error : null,
  };
}

export async function listConnections(subjectId: string): Promise<Connection[]> {
  const { data, error } = await supabaseAdmin
    .from("health_connections")
    .select(SELECT)
    .eq("subject_id", subjectId);
  if (error) throw error;
  return ((data ?? []) as Row[]).filter((r) => isSourceId(r.provider)).map(toConnection);
}

export async function readConnection(
  subjectId: string,
  provider: SourceId,
): Promise<Connection> {
  const { data, error } = await supabaseAdmin
    .from("health_connections")
    .select(SELECT)
    .eq("subject_id", subjectId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data ? toConnection(data as Row) : NONE(provider);
}

/** Opens the sealed credentials for one connection. Server handlers only. */
export async function readCredentials(
  subjectId: string,
  provider: SourceId,
): Promise<ProviderCredentials | null> {
  const { data, error } = await supabaseAdmin
    .from("health_connections")
    .select("token_ciphertext, disconnected_at")
    .eq("subject_id", subjectId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.disconnected_at) return null;
  return open<ProviderCredentials>(data.token_ciphertext);
}

type Patch = {
  status?: SourceStatus;
  scopes?: string[];
  metrics?: string[];
  credentials?: ProviderCredentials | null;
  error?: string | null;
  markSynced?: boolean;
  connected?: boolean;
  /** Clears disconnected_at without stamping connected_at — for an in-flight
   * reconnect attempt that hasn't completed yet. */
  clearDisconnected?: boolean;
};

export async function saveConnection(
  subjectId: string,
  provider: SourceId,
  patch: Patch,
): Promise<Connection> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    subject_id: subjectId,
    provider,
    updated_at: now,
  };
  if (patch.status) row["status"] = patch.status;
  if (patch.scopes) row["scopes"] = patch.scopes;
  if (patch.metrics) row["metrics"] = patch.metrics;
  if (patch.credentials !== undefined) {
    row["token_ciphertext"] = patch.credentials ? seal(patch.credentials) : null;
    if (patch.credentials?.externalAccountId) {
      row["external_account_id"] = patch.credentials.externalAccountId;
    }
  }
  if (patch.error !== undefined) row["last_error"] = patch.error;
  if (patch.markSynced) {
    row["last_sync_at"] = now;
    row["last_import_at"] = now;
  }
  if (patch.connected) {
    row["connected_at"] = now;
    row["disconnected_at"] = null;
  } else if (patch.clearDisconnected) {
    row["disconnected_at"] = null;
  }

  const { error } = await supabaseAdmin
    .from("health_connections")
    .upsert(row as never, { onConflict: "subject_id,provider" });
  if (error) throw error;
  return readConnection(subjectId, provider);
}

/** Withdraws consent. Credentials are destroyed, not just marked stale. */
export async function clearConnection(subjectId: string, provider: SourceId): Promise<void> {
  const { error } = await supabaseAdmin
    .from("health_connections")
    .upsert(
      {
        subject_id: subjectId,
        provider,
        status: "not_connected",
        metrics: [],
        scopes: [],
        token_ciphertext: null,
        external_account_id: null,
        last_error: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "subject_id,provider" },
    );
  if (error) throw error;
}

/** Every subject currently expecting a scheduled sync. */
export async function connectedSubjects(): Promise<{ subjectId: string; provider: SourceId }[]> {
  const { data, error } = await supabaseAdmin
    .from("health_connections")
    .select("subject_id, provider, connected_at, disconnected_at")
    .not("connected_at", "is", null)
    .is("disconnected_at", null);
  if (error) throw error;
  return (data ?? [])
    .filter((r) => isSourceId(r.provider))
    .map((r) => ({ subjectId: r.subject_id, provider: r.provider as SourceId }));
}
