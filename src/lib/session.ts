/**
 * Session — the app's single source of truth for who is signed in.
 *
 * The browser holds the session (persisted, auto-refreshed by Supabase); the
 * server re-validates the bearer token on every engine call. Signing out clears
 * the session, every cached answer, and everything Ciatta held on this device.
 */
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Session = {
  userId: string | null;
  email: string | null;
  name: string | null;
  ready: boolean;
};

export function useSession(): Session {
  const [session, setSession] = useState<Session>({
    userId: null,
    email: null,
    name: null,
    ready: false,
  });

  useEffect(() => {
    const read = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) =>
      setSession({
        userId: user?.id ?? null,
        email: user?.email ?? null,
        name:
          (user?.user_metadata?.["full_name"] as string | undefined) ??
          (user?.user_metadata?.["name"] as string | undefined) ??
          null,
        ready: true,
      });

    void supabase.auth.getSession().then(({ data }) => read(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => read(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}

/** Ends the session immediately, everywhere. */
export async function endSession(): Promise<void> {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    // Nothing Ciatta learned lives on the device after a sign out.
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("ciatta.")) window.localStorage.removeItem(key);
    }
  }
}

/** The bearer token for authenticated calls to our own HTTP endpoints. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
