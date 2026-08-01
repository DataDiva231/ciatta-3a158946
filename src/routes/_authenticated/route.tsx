import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * The gate. Everything Ciatta knows about a person lives behind it: Today,
 * Teach, Journey, Profile, Settings, onboarding and the first observation.
 *
 * Client-only, because the session lives in the browser. The server re-checks
 * the bearer token on every engine call, so this is convenience, not the wall.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // An unverified email waits at the inbox screen, not inside the app.
    if (!data.user.email_confirmed_at) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
