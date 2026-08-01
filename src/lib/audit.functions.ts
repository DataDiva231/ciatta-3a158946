/**
 * Session auditing. The moments that matter for security — arriving and
 * leaving — are recorded server-side, never trusted from the client beyond the
 * verified token itself.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recordSessionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { event: "sign_in" | "sign_out" }) => ({
    event: input?.event === "sign_out" ? ("sign_out" as const) : ("sign_in" as const),
  }))
  .handler(async ({ data, context }) => {
    const { audit, sessionIdFromClaims } = await import("@/server/security/audit.server");
    await audit({
      userId: context.userId,
      event: data.event === "sign_out" ? "session.sign_out" : "session.sign_in",
      sessionId: sessionIdFromClaims(context.claims),
    });
    return { ok: true };
  });
