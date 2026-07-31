import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import mark from "@/assets/ciatta-mark.png.asset.json";
import wordmark from "@/assets/ciatta-wordmark.png.asset.json";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ciatta" },
      {
        name: "description",
        content:
          "Sign in to Ciatta. Everything Ciatta learns about you stays inside your own account.",
      },
      { property: "og:title", content: "Sign in — Ciatta" },
      {
        property: "og:description",
        content: "Ciatta begins with curiosity. Sign in to start your own understanding.",
      },
    ],
  }),
  component: AuthPage,
});

function Halo() {
  return (
    <div
      className="animate-in fade-in animate-breathe relative flex items-center justify-center duration-[1600ms]"
      style={{ width: 232, height: 232, animationFillMode: "backwards" }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 36% 32%, color-mix(in oklab, var(--clay) 7%, transparent) 0%, transparent 52%)," +
            "radial-gradient(circle at 70% 30%, oklch(0.88 0.04 340 / 0.07) 0%, transparent 54%)," +
            "radial-gradient(circle at 70% 72%, oklch(0.85 0.05 292 / 0.06) 0%, transparent 56%)," +
            "radial-gradient(circle at 30% 74%, oklch(0.88 0.04 232 / 0.07) 0%, transparent 56%)",
          maskImage: "radial-gradient(circle, black 34%, transparent 70%)",
          filter: "blur(14px)",
        }}
      />
      <img
        src={mark.url}
        alt=""
        aria-hidden="true"
        className="relative dark:invert"
        style={{ width: 104, height: 104 }}
      />
    </div>
  );
}

function Splash() {
  const [named, setNamed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setNamed(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex h-[100svh] flex-col items-center justify-center bg-background">
      <Halo />
      <div
        className={`mt-12 transition-opacity duration-[1200ms] ${named ? "opacity-100" : "opacity-0"}`}
      >
        <img src={wordmark.url} alt="Ciatta" className="dark:invert" style={{ width: 116 }} />
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"splash" | "sign-in">("splash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go straight in — sessions survive app launches.
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) navigate({ to: "/", replace: true });
      else window.setTimeout(() => alive && setPhase("sign-in"), 1900);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  const continueWithGoogle = async () => {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError("That didn't complete. Try once more.");
      return;
    }
    if (result.redirected) return; // The browser is on its way to Google.
    navigate({ to: "/", replace: true });
  };

  if (phase === "splash") return <Splash />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 flex h-[100svh] flex-col bg-background duration-[900ms]">
      <div className="flex-1 overflow-y-auto px-8 pt-20">
        <img src={mark.url} alt="Ciatta" className="dark:invert" style={{ width: 44, height: 44 }} />
        <h1 className="mt-12 max-w-[17rem] font-serif text-[34px] leading-[1.12] tracking-[-0.02em]">
          I don&apos;t know you yet.
        </h1>
        <p className="mt-4 max-w-[19rem] text-[14.5px] leading-relaxed text-muted-foreground">
          That&apos;s where we start. Everything you share helps me understand you a little more, and
          it stays inside your account, only ever yours.
        </p>
      </div>

      <div className="shrink-0 px-8 pb-10">
        <button
          type="button"
          disabled={busy}
          onClick={() => void continueWithGoogle()}
          className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Just a moment…" : "Continue with Google"}
        </button>
        {error ? (
          <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>
        ) : (
          <p className="mt-4 text-center text-[13px] leading-relaxed text-muted-foreground">
            Your health information is private to you.
          </p>
        )}
      </div>
    </div>
  );
}
