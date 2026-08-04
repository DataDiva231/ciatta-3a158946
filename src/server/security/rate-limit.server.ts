/**
 * Rate limiting and abuse protection for write-heavy work.
 *
 * Counting happens in the database (`consume_rate_limit`), because server
 * functions run on stateless workers — an in-memory counter would protect
 * nothing. Every guarded endpoint is limited twice: once for the signed-in
 * person, once for the network address they arrive from.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { audit, callerFingerprint, type AuditEvent } from "./audit.server";

export type Limit = { windowSeconds: number; max: number };

/** Per-endpoint budgets. Generous for a person, hostile to a script. */
export const LIMITS: Record<string, { user: Limit; ip: Limit }> = {
  "engine.sync": { user: { windowSeconds: 60, max: 40 }, ip: { windowSeconds: 60, max: 120 } },
  "engine.debug": { user: { windowSeconds: 60, max: 20 }, ip: { windowSeconds: 60, max: 60 } },
  "account.delete": { user: { windowSeconds: 3600, max: 5 }, ip: { windowSeconds: 3600, max: 20 } },
  "health.connect": { user: { windowSeconds: 3600, max: 30 }, ip: { windowSeconds: 3600, max: 90 } },
  "health.import": { user: { windowSeconds: 60, max: 12 }, ip: { windowSeconds: 60, max: 40 } },
  "health.scheduled_sync": { user: { windowSeconds: 60, max: 2 }, ip: { windowSeconds: 60, max: 2 } },
  transcription: { user: { windowSeconds: 300, max: 20 }, ip: { windowSeconds: 300, max: 60 } },
};

export class RateLimited extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
    this.name = "RateLimited";
  }
}

async function consume(bucketKey: string, limit: Limit): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    _bucket_key: bucketKey,
    _window_seconds: limit.windowSeconds,
    _limit: limit.max,
  });
  // Fail open on infrastructure errors: a counter outage must not lock people out.
  if (error) {
    console.error(`[rate-limit] ${bucketKey} check failed: ${error.message}`);
    return true;
  }
  return data !== false;
}

/**
 * Allows the request or throws `RateLimited`. Blocks are audited so abuse is
 * visible after the fact.
 */
export async function guard(
  endpoint: keyof typeof LIMITS,
  options: { userId?: string | null; request?: Request | null; auditAs?: AuditEvent } = {},
): Promise<void> {
  const limit = LIMITS[endpoint];
  if (!limit) return;

  const { ip } = callerFingerprint(options.request ?? null);
  const checks: { key: string; limit: Limit; scope: string }[] = [
    { key: `ip:${endpoint}:${ip}`, limit: limit.ip, scope: "ip" },
  ];
  if (options.userId) {
    checks.unshift({ key: `user:${endpoint}:${options.userId}`, limit: limit.user, scope: "user" });
  }

  for (const check of checks) {
    const allowed = await consume(check.key, check.limit);
    if (allowed) continue;
    await audit({
      userId: options.userId ?? null,
      event: "rate_limit.block",
      outcome: "denied",
      detail: { endpoint, scope: check.scope },
      request: options.request ?? null,
    });
    throw new RateLimited(check.limit.windowSeconds);
  }
}
