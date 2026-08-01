import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

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

function Halo({ size = 232, markSize = 104 }: { size?: number; markSize?: number }) {
  return (
    <div
      className="animate-breathe relative flex items-center justify-center"
      style={{ width: size, height: size }}
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
        style={{ width: markSize, height: markSize }}
      />
    </div>
  );
}

/**
 * Splash — the brand is allowed to be remembered before anything is asked.
 * Mark settles, the wordmark fades in, it is held, then everything fades away.
 */
function Splash({ leaving }: { leaving: boolean }) {
  const [markIn, setMarkIn] = useState(false);
  const [named, setNamed] = useState(false);

  useEffect(() => {
    const a = window.setTimeout(() => setMarkIn(true), 60);
    const b = window.setTimeout(() => setNamed(true), 1100);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <div
      className="flex h-[100svh] flex-col items-center justify-center bg-background transition-opacity duration-[1100ms]"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div
        className="transition-opacity duration-[1400ms]"
        style={{ opacity: markIn ? 1 : 0 }}
      >
        <Halo />
      </div>
      <div
        className="mt-12 transition-opacity duration-[1600ms]"
        style={{ opacity: named ? 1 : 0 }}
      >
        <img src={wordmark.url} alt="Ciatta" className="dark:invert" style={{ width: 148 }} />
      </div>
    </div>
  );
}

const RULES = [
  { label: "8–30 characters", test: (v: string) => v.length >= 8 && v.length <= 30 },
  { label: "1 uppercase character", test: (v: string) => /[A-Z]/.test(v) },
  { label: "1 lowercase character", test: (v: string) => /[a-z]/.test(v) },
  { label: "1 number", test: (v: string) => /\d/.test(v) },
  { label: "1 special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.2-1.16 2.37-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.5-.66-2.79-.66-1.29 0-1.69.64-2.76.68-1.11.04-1.95-1.09-2.66-2.1-1.45-2.1-2.56-5.93-1.07-8.52.74-1.28 2.06-2.1 3.5-2.12 1.09-.02 2.12.73 2.79.73.67 0 1.92-.9 3.24-.77.55.02 2.1.2 3.09 1.51-.08.05-1.85 1.08-1.82 3.51M14.3 4.9c.6-.72 1-1.72.89-2.72-.86.03-1.9.57-2.52 1.29-.55.63-1.03 1.65-.9 2.62.96.08 1.93-.48 2.53-1.19" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.59-5.15 3.59-8.81"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.86-3a7.2 7.2 0 0 1-10.72-3.78H1.4v3.1A12 12 0 0 0 12 24"
      />
      <path fill="#FBBC05" d="M5.37 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 1.4 6.6l3.97 3.1A7.2 7.2 0 0 1 12 4.75"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"splash" | "choose" | "email">("splash");
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  const passwordOk = useMemo(() => RULES.every((r) => r.test(password)), [password]);

  // Already signed in? Go straight in — sessions survive app launches.
  useEffect(() => {
    let alive = true;
    const cleanups: number[] = [];
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        navigate({ to: "/", replace: true });
        return;
      }
      // The wordmark is held long enough to be recognised, then fades out.
      const fade = window.setTimeout(() => alive && setSplashLeaving(true), 4200);
      const done = window.setTimeout(() => alive && setPhase("choose"), 5300);
      cleanups.push(fade, done);
    });
    return () => {
      alive = false;
      cleanups.forEach((t) => window.clearTimeout(t));
    };
  }, [navigate]);

  const continueWith = async (provider: "google" | "apple") => {
    setBusy(provider);
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(null);
      setError("That didn't complete. Try once more.");
      return;
    }
    if (result.redirected) return; // The browser is on its way to the provider.
    navigate({ to: "/", replace: true });
  };

  const submitEmail = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("I'll need an email address to reach you.");
      return;
    }
    if (mode === "signup" && !passwordOk) {
      setError("A slightly stronger password, and we're set.");
      return;
    }
    setBusy("email");
    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(null);
      if (err) {
        setError(err.message);
        return;
      }
      if (!data.session) {
        setNotice("Check your email to confirm, and we'll pick up right here.");
        return;
      }
      navigate({ to: "/", replace: true });
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(null);
    if (err) {
      setError("Those details didn't match. Try again.");
      return;
    }
    navigate({ to: "/", replace: true });
  };

  if (phase === "splash") return <Splash leaving={splashLeaving} />;

  const legal = (
    <p className="mt-6 text-center text-[12.5px] leading-relaxed text-muted-foreground">
      By continuing, you agree to Ciatta&apos;s{" "}
      <Link to="/terms" className="underline underline-offset-2">
        Terms of Use
      </Link>{" "}
      and{" "}
      <Link to="/privacy" className="underline underline-offset-2">
        Privacy Policy
      </Link>
      .
    </p>
  );

  if (phase === "email") {
    return (
      <div className="animate-in fade-in flex min-h-[100svh] flex-col bg-background px-8 pt-14 pb-12 duration-[700ms]">
        <button
          type="button"
          onClick={() => {
            setPhase("choose");
            setError(null);
            setNotice(null);
          }}
          className="self-start text-[14px] text-muted-foreground"
        >
          ← Back
        </button>

        <h1 className="mt-10 font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
          {mode === "signup" ? "Everything begins here." : "Welcome back."}
        </h1>
        <p className="mt-3 max-w-[19rem] text-[14.5px] leading-relaxed text-muted-foreground">
          {mode === "signup"
            ? "Create an account so what I learn stays yours."
            : "Sign in, and we'll continue where we left off."}
        </p>

        <div className="mt-8 space-y-3">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl bg-muted px-5 py-[15px] text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <div className="relative">
            <input
              type={reveal ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl bg-muted px-5 py-[15px] pr-14 text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-4 flex items-center text-muted-foreground"
            >
              {reveal ? (
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8" />
                  <path d="M6.3 6.9C4.3 8.2 2.8 10 2 12c1.7 4 5.6 6.5 10 6.5 1.7 0 3.3-.4 4.7-1.1M9.9 5.7A10 10 0 0112 5.5c4.4 0 8.3 2.5 10 6.5a13 13 0 01-2.4 3.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12c1.7-4 5.6-6.5 10-6.5S20.3 8 22 12c-1.7 4-5.6 6.5-10 6.5S3.7 16 2 12z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <ul className="mt-5 space-y-2.5">
            {RULES.map((rule) => {
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
        )}

        <div className="mt-auto pt-10">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void submitEmail()}
            className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "email"
              ? "Just a moment…"
              : mode === "signup"
                ? "Sign Up with Email"
                : "Sign In"}
          </button>

          {error && (
            <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>
          )}
          {notice && (
            <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{notice}</p>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
            className="mt-6 w-full text-center text-[13.5px] text-muted-foreground"
          >
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <span className="text-foreground underline underline-offset-2">Sign in</span>
              </>
            ) : (
              <>
                New here?{" "}
                <span className="text-foreground underline underline-offset-2">Create account</span>
              </>
            )}
          </button>
          {legal}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 flex min-h-[100svh] flex-col bg-background duration-[900ms]">
      <div className="flex-1 px-8 pt-20">
        <img src={mark.url} alt="Ciatta" className="dark:invert" style={{ width: 44, height: 44 }} />
        <h1 className="mt-12 max-w-[17rem] font-serif text-[34px] leading-[1.12] tracking-[-0.02em]">
          I don&apos;t know you yet.
        </h1>
        <p className="mt-4 max-w-[19rem] text-[14.5px] leading-relaxed text-muted-foreground">
          Everything begins here. Create an account so what I learn stays yours — inside your own
          account, only ever yours.
        </p>
      </div>

      <div className="shrink-0 px-8 pb-10">
        <div className="space-y-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void continueWith("apple")}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            <AppleGlyph />
            {busy === "apple" ? "Just a moment…" : "Continue with Apple"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void continueWith("google")}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background px-6 py-[15px] text-[15px] font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            <GoogleGlyph />
            {busy === "google" ? "Just a moment…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setPhase("email")}
            className="w-full rounded-full bg-muted px-6 py-[15px] text-[15px] font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            Continue with Email
          </button>
        </div>

        {error && <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>}

        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setPhase("email");
          }}
          className="mt-6 w-full text-center text-[13.5px] text-muted-foreground"
        >
          Already have an account?{" "}
          <span className="text-foreground underline underline-offset-2">Sign in</span>
        </button>
        {legal}
      </div>
    </div>
  );
}
