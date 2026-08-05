import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PASSWORD_RULES, passwordMeetsRules } from "@/lib/password-rules";

/**
 * The recovery link lands here with proof in the URL — a PKCE code, a
 * one-time token hash, or (older flow) tokens already in the fragment.
 * Supabase's client only auto-detects the fragment case; a code or token
 * hash has to be exchanged explicitly before updateUser() has any session
 * to act on. Without this, "Continue" looks enabled but always fails.
 */
function readRecoveryProof(): { code?: string; tokenHash?: string } | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("code") ?? undefined;
  const tokenHash = query.get("token_hash") ?? hash.get("token_hash") ?? undefined;
  const hasTokens = Boolean(hash.get("access_token"));
  if (!code && !tokenHash && !hasTokens) return null;
  return { code, tokenHash };
}

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Ciatta" },
      {
        name: "description",
        content: "Choose a new password and continue your conversation with Ciatta.",
      },
      { property: "og:title", content: "Set a new password — Ciatta" },
      {
        property: "og:description",
        content: "Choose a new password and continue where you left off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<"checking" | "ready" | "invalid">("checking");
  const passwordOk = useMemo(() => passwordMeetsRules(password), [password]);

  // Establish the recovery session before anything is submittable — a
  // code/token hash proves nothing on its own until exchanged.
  useEffect(() => {
    let alive = true;
    const establish = async () => {
      const proof = readRecoveryProof();
      try {
        if (proof?.code) {
          await supabase.auth.exchangeCodeForSession(proof.code);
        } else if (proof?.tokenHash) {
          await supabase.auth.verifyOtp({ token_hash: proof.tokenHash, type: "recovery" });
        }
      } catch (e) {
        console.error("[reset-password] session exchange failed", e);
      }
      // Tokens already in the fragment are picked up by the client itself —
      // either way, the session is what actually decides readiness.
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      window.history.replaceState({}, "", "/reset-password");
      setSession(data.session ? "ready" : "invalid");
    };
    void establish();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    setError(null);
    if (!passwordOk) {
      setError("A slightly stronger password, and we're set.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError("That didn't save. Try once more.");
      return;
    }
    navigate({ to: "/today", replace: true });
  };

  if (session === "checking") {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background px-10">
        <p className="text-center text-[14.5px] text-muted-foreground">One moment…</p>
      </div>
    );
  }

  if (session === "invalid") {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center bg-background px-10 text-center">
        <h1 className="font-serif text-[28px] leading-[1.15] tracking-[-0.02em]">
          That link has expired.
        </h1>
        <p className="mt-3 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
          Reset links can only be used once. Head back and send yourself a fresh one.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/auth", replace: true })}
          className="mt-8 rounded-full bg-foreground px-6 py-[13px] text-[14.5px] font-medium text-background transition-all duration-200 active:scale-[0.99]"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] flex-col items-center bg-background">
      <div className="flex w-full max-w-[27rem] flex-1 flex-col px-8 pt-20 pb-12 sm:px-10">
        <h1 className="font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
          Choose a new password.
        </h1>
        <p className="mt-3 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
          Then we&apos;ll pick up exactly where we left off.
        </p>

        <div className="relative mt-8">
          <input
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-2xl bg-muted px-5 py-[15px] pr-16 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute inset-y-0 right-4 flex items-center text-[13px] text-muted-foreground"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>

        <ul className="mt-5 space-y-2.5">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className="flex items-center gap-3 text-[13.5px] text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={`size-[15px] rounded-full border transition-colors duration-300 ${
                    met ? "border-foreground bg-foreground" : "border-border"
                  }`}
                />
                {rule.label}
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-10">
          <button
            type="button"
            disabled={busy || !passwordOk}
            onClick={() => void submit()}
            className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Just a moment…" : "Continue"}
          </button>
          {error && <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>}
        </div>
      </div>
    </div>
  );
}
