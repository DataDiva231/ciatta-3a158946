import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PASSWORD_RULES, passwordMeetsRules } from "@/lib/password-rules";

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
  const passwordOk = useMemo(() => passwordMeetsRules(password), [password]);

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
