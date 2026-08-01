/**
 * Apple Health — the door between the native shell and the engine.
 *
 * Every call is authenticated; the account comes from the verified session, not
 * from the request. Consent is stored server-side, so an import can only ever
 * read the metrics the person actually granted.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { AppleHealthSample } from "./apple-health";
import type { EngineViews } from "./engine-types";

export type AppleHealthStatus = {
  connected: boolean;
  metrics: string[];
  connectedAt: string | null;
  lastImportAt: string | null;
};

export const appleHealthStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppleHealthStatus> => {
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { readConnection } = await import("@/server/health/apple-health.server");
    const subject = await getOrCreateSubject(context.userId);
    return readConnection(subject.id);
  });

export const connectAppleHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { metrics: string[] }) => ({
    metrics: Array.isArray(input?.metrics) ? input.metrics.slice(0, 32).map(String) : [],
  }))
  .handler(async ({ data, context }): Promise<AppleHealthStatus> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { grantConnection } = await import("@/server/health/apple-health.server");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    const connection = await grantConnection(subject.id, data.metrics);
    await audit({
      userId: context.userId,
      event: "health.connect",
      sessionId: sessionIdFromClaims(context.claims),
      detail: { provider: "apple_health", metrics: connection.metrics },
    });
    return connection;
  });

export const disconnectAppleHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { revokeConnection } = await import("@/server/health/apple-health.server");

    await guard("health.connect", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    await revokeConnection(subject.id);
    await audit({
      userId: context.userId,
      event: "health.disconnect",
      sessionId: sessionIdFromClaims(context.claims),
      detail: { provider: "apple_health" },
    });
    return { ok: true };
  });

/**
 * Imports a batch of HealthKit samples. Duplicates are dropped by the
 * Observation service, so the shell can safely replay a window of history.
 */
export const importAppleHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { samples: AppleHealthSample[] }) => ({
    samples: Array.isArray(input?.samples) ? input.samples.slice(0, 2000) : [],
  }))
  .handler(async ({ data, context }): Promise<EngineViews> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { getOrCreateSubject } = await import("@/server/engine/identity.server");
    const { readConnection, toObservations, markImported } = await import(
      "@/server/health/apple-health.server"
    );
    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    const { buildViews } = await import("@/server/engine/views.server");

    await guard("health.import", { userId: context.userId });
    const subject = await getOrCreateSubject(context.userId);
    const connection = await readConnection(subject.id);

    // No consent on record means no reading, whatever the client sends.
    const observations = connection.connected
      ? toObservations(data.samples, connection.metrics)
      : [];

    const result = await runLearningLoop(context.userId, observations);
    if (observations.length) await markImported(subject.id);

    await audit({
      userId: context.userId,
      event: "health.import",
      outcome: connection.connected ? "success" : "denied",
      sessionId: sessionIdFromClaims(context.claims),
      detail: {
        provider: "apple_health",
        received: data.samples.length,
        accepted: observations.length,
      },
    });

    return buildViews(result.subjectId, result.understanding, result.observations);
  });
