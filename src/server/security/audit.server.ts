/**
 * Audit Log — an append-only record of everything security-relevant that
 * happens inside Ciatta.
 *
 * Writes only. The table rejects updates and deletes at the database level and
 * chains every row to the one before it, so a missing or altered record is
 * detectable. Nothing here is ever shown to a user: it exists for security and
 * operational review.
 */
import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditEvent =
  | "session.sign_in"
  | "session.sign_out"
  | "account.delete"
  | "observation.create"
  | "engine.sync"
  | "engine.debug_access"
  | "health.connect"
  | "health.disconnect"
  | "health.import"
  | "transcription.request"
  | "rate_limit.block";

export type AuditOutcome = "success" | "failure" | "denied";

type AuditInput = {
  userId?: string | null;
  event: AuditEvent;
  outcome?: AuditOutcome;
  sessionId?: string | null;
  detail?: Record<string, unknown>;
  request?: Request | null;
};

/** Best-effort caller fingerprint. Used for per-IP limits and audit records. */
export function callerFingerprint(request?: Request | null): {
  ip: string;
  userAgent: string | null;
} {
  let headers: Headers | undefined = request?.headers;
  if (!headers) {
    try {
      headers = getRequest()?.headers;
    } catch {
      headers = undefined;
    }
  }
  const forwarded = headers?.get("x-forwarded-for") ?? "";
  const ip =
    headers?.get("cf-connecting-ip") ??
    (forwarded ? (forwarded.split(",")[0] ?? "").trim() : "") ??
    "";
  return { ip: ip || "unknown", userAgent: headers?.get("user-agent") ?? null };
}

/**
 * Records one event. Auditing must never break the thing it is auditing, so a
 * write failure is logged and swallowed.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const { ip, userAgent } = callerFingerprint(input.request ?? null);
    const { error } = await supabaseAdmin.from("audit_events").insert({
      user_id: input.userId ?? null,
      event_type: input.event,
      outcome: input.outcome ?? "success",
      session_id: input.sessionId ?? null,
      ip_address: ip,
      user_agent: userAgent,
      detail: (input.detail ?? {}) as never,
      record_hash: "pending", // replaced by the database chain trigger
    });
    if (error) console.error(`[audit] ${input.event} not recorded: ${error.message}`);
  } catch (error) {
    console.error("[audit] write failed", error);
  }
}

/** The session identifier carried by a verified token, when present. */
export function sessionIdFromClaims(claims: Record<string, unknown> | undefined): string | null {
  const value = claims?.["session_id"];
  return typeof value === "string" ? value : null;
}
