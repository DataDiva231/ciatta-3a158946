/**
 * Connected sources — the door between the screens and the providers.
 *
 * Everything here is authenticated and provider-agnostic: the account comes from
 * the verified session, the source comes from a fixed list, and the work is done
 * by whichever provider that id maps to.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { SOURCES, type SourceId, type SourceState } from "./health-sources";

function asSourceId(value: unknown): SourceId {
  const id = String(value ?? "");
  const found = SOURCES.find((s) => s.id === id);
  if (!found) throw new Error("unknown_source");
  return found.id;
}

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SourceState[]> => {
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { listConnections } = await import("@/server/health/connections.server");
    const { provider } = await import("@/server/health/providers");

    const subject = await getOrCreateSubject(context.userId);
    const connections = await listConnections(subject.id);

    return SOURCES.map((descriptor) => {
      const found = connections.find((c) => c.provider === descriptor.id);
      const impl = provider(descriptor.id);
      return {
        id: descriptor.id,
        status: found?.status ?? "not_connected",
        lastSyncAt: found?.lastSyncAt ?? null,
        connectedAt: found?.connectedAt ?? null,
        error: found?.error ?? null,
        unavailableReason:
          !impl.configured() && descriptor.auth === "oauth"
            ? "This connection isn't open yet. I'll let you know when it is."
            : null,
      };
    });
  });

/** Starts authorization. OAuth sources return a URL; native ones return null. */
export const beginSourceAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; redirectUri: string }) => ({
    provider: asSourceId(input?.provider),
    redirectUri: String(input?.redirectUri ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }): Promise<{ url: string | null; reason: string | null }> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { saveConnection } = await import("@/server/health/connections.server");
    const { provider } = await import("@/server/health/providers");
    const { randomBytes } = await import("node:crypto");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    const impl = provider(data.provider);

    if (!impl.configured() || !impl.beginAuthorization) {
      return { url: null, reason: "not_configured" };
    }

    const state = randomBytes(24).toString("hex");
    const started = impl.beginAuthorization({ redirectUri: data.redirectUri, state });
    await saveConnection(subject.id, data.provider, {
      status: "connecting",
      scopes: started.scopes,
      error: null,
      credentials: { oauthState: state },
    });
    await audit({
      userId: context.userId,
      event: "health.connect",
      outcome: "success",
      sessionId: sessionIdFromClaims(context.claims),
      detail: { provider: data.provider, stage: "authorize" },
    });
    return { url: started.url, reason: started.url ? null : "not_configured" };
  });

/** Finishes authorization, stores sealed credentials, then syncs once. */
export const completeSourceAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; code: string; state: string; redirectUri: string }) => ({
    provider: asSourceId(input?.provider),
    code: String(input?.code ?? "").slice(0, 2000),
    state: String(input?.state ?? "").slice(0, 200),
    redirectUri: String(input?.redirectUri ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason: string | null }> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { readCredentials, saveConnection } = await import(
      "@/server/health/connections.server"
    );
    const { provider } = await import("@/server/health/providers");
    const { syncProvider } = await import("@/server/health/sync.server");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    const impl = provider(data.provider);
    const pending = await readCredentials(subject.id, data.provider);

    // The callback must match the request we started.
    if (!data.code || !pending?.oauthState || pending.oauthState !== data.state) {
      await saveConnection(subject.id, data.provider, {
        status: "sync_error",
        error: "That connection couldn't be verified. Try again.",
      });
      return { ok: false, reason: "state_mismatch" };
    }

    if (!impl.exchangeCode) return { ok: false, reason: "not_configured" };

    try {
      const credentials = await impl.exchangeCode({
        code: data.code,
        redirectUri: data.redirectUri,
      });
      await saveConnection(subject.id, data.provider, {
        status: "connected",
        connected: true,
        error: null,
        scopes: credentials.scopes ?? impl.scopes,
        credentials,
      });
      await syncProvider(context.userId, subject.id, data.provider);
      await audit({
        userId: context.userId,
        event: "health.connect",
        outcome: "success",
        sessionId: sessionIdFromClaims(context.claims),
        detail: { provider: data.provider, stage: "complete" },
      });
      return { ok: true, reason: null };
    } catch {
      await saveConnection(subject.id, data.provider, {
        status: "sync_error",
        error: "That connection didn't finish. Try again.",
      });
      return { ok: false, reason: "exchange_failed" };
    }
  });

/** Native sources record the consent iOS already collected. */
export const connectNativeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; scopes: string[] }) => ({
    provider: asSourceId(input?.provider),
    scopes: Array.isArray(input?.scopes) ? input.scopes.slice(0, 32).map(String) : [],
  }))
  .handler(async ({ data, context }) => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { saveConnection } = await import("@/server/health/connections.server");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    await saveConnection(subject.id, data.provider, {
      status: "connected",
      connected: true,
      error: null,
      scopes: data.scopes,
      metrics: data.scopes,
    });
    return { ok: true };
  });

export const disconnectSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => ({ provider: asSourceId(input?.provider) }))
  .handler(async ({ data, context }) => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { clearConnection } = await import("@/server/health/connections.server");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    await clearConnection(subject.id, data.provider);
    await audit({
      userId: context.userId,
      event: "health.disconnect",
      sessionId: sessionIdFromClaims(context.claims),
      detail: { provider: data.provider },
    });
    return { ok: true };
  });

export const syncSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => ({ provider: asSourceId(input?.provider) }))
  .handler(async ({ data, context }) => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { syncProvider } = await import("@/server/health/sync.server");

    await guard("health.import", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    return syncProvider(context.userId, subject.id, data.provider);
  });
