/**
 * Server-side session verification for raw HTTP endpoints.
 *
 * Server functions get this from `requireSupabaseAuth`. Our own HTTP routes
 * (voice upload) validate the same bearer token here. Client-side auth is never
 * trusted: no valid token, no work done.
 */
import { createClient } from "@supabase/supabase-js";

export async function requireUser(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  if (token.split(".").length !== 3) return null;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}
