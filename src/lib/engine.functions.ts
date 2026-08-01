/**
 * API Layer — the only door between the screens and the Intelligence Engine.
 *
 * Every function here runs behind `requireSupabaseAuth`: the session token is
 * validated on the server and the account id it carries is the only identity
 * the engine ever sees. The client cannot name whose data it is reading.
 *
 * Thin by design: declarations and imports only, so every helper lives in a
 * server module.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { EngineViews, ObservationInput } from "./engine-types";
import type { EngineDebugView } from "./evidence-types";

export const syncEngine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { observations?: ObservationInput[]; identity?: Record<string, unknown> }) => ({
      observations: Array.isArray(input?.observations) ? input.observations.slice(0, 1000) : [],
      identity: input?.identity ?? {},
    }),
  )
  .handler(async ({ data, context }): Promise<EngineViews> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    const { buildViews } = await import("@/server/engine/views.server");

    await guard("engine.sync", { userId: context.userId });
    const result = await runLearningLoop(
      context.userId,
      data.observations ?? [],
      data.identity ?? {},
    );
    if (data.observations?.length) {
      await audit({
        userId: context.userId,
        event: "observation.create",
        sessionId: sessionIdFromClaims(context.claims),
        detail: { submitted: data.observations.length },
      });
    }
    return buildViews(result.subjectId, result.understanding, result.observations);
  });

export const engineTrace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EngineDebugView> => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    const { buildDebugView } = await import("@/server/engine/debug.server");

    await guard("engine.debug", { userId: context.userId });
    await audit({
      userId: context.userId,
      event: "engine.debug_access",
      sessionId: sessionIdFromClaims(context.claims),
    });
    const result = await runLearningLoop(context.userId);
    return buildDebugView(result.subjectId, result.understanding, result.observations);
  });

export const forgetEverything = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { guard } = await import("@/server/security/rate-limit.server");
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    const { forgetSubject } = await import("@/server/engine/identity.server");

    await guard("account.delete", { userId: context.userId });
    await forgetSubject(context.userId);
    await audit({
      userId: context.userId,
      event: "account.delete",
      sessionId: sessionIdFromClaims(context.claims),
    });
    return { ok: true };
  });

