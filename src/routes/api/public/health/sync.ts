/**
 * Scheduled sync. Called on a timer, never by a person.
 *
 * Walks every live connection and runs it through the same provider interface
 * the app uses, so a scheduled sync and a manual one are the same code path.
 *
 * Guarded by HEALTH_SYNC_SECRET, a server-only value never shipped to the
 * client — unlike the Supabase publishable/anon key, which is embedded in
 * every browser bundle and therefore cannot gate anything.
 */
import { timingSafeEqual } from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";

function isAuthorized(request: Request): boolean {
  const expected = process.env["HEALTH_SYNC_SECRET"];
  const provided = request.headers.get("x-sync-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/health/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { guard, RateLimited } = await import("@/server/security/rate-limit.server");
        try {
          await guard("health.scheduled_sync", { request });
        } catch (error) {
          if (error instanceof RateLimited) {
            return new Response("Too many requests", { status: 429 });
          }
          throw error;
        }

        const { connectedSubjects } = await import("@/server/health/connections.server");
        const { syncProvider } = await import("@/server/health/sync.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const live = await connectedSubjects();
        let imported = 0;
        let failed = 0;

        for (const { subjectId, provider } of live.slice(0, 500)) {
          // The loop needs the account behind the subject to write observations.
          const { data } = await supabaseAdmin
            .from("subjects")
            .select("user_id")
            .eq("id", subjectId)
            .maybeSingle();
          const userId = data?.user_id;
          if (!userId) continue;
          const outcome = await syncProvider(userId, subjectId, provider);
          if (outcome.status === "sync_error") failed += 1;
          imported += outcome.imported;
        }

        return Response.json({ connections: live.length, imported, failed });
      },
    },
  },
});
