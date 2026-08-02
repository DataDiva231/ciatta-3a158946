/**
 * Scheduled sync. Called on a timer, never by a person.
 *
 * Walks every live connection and runs it through the same provider interface
 * the app uses, so a scheduled sync and a manual one are the same code path.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SUPABASE_ANON_KEY"];
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
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
