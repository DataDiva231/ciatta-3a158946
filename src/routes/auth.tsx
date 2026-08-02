import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import mark from "@/assets/ciatta-mark.png.asset.json";
import wordmark from "@/assets/ciatta-wordmark.png.asset.json";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Begin with Ciatta — a quiet start" },
      {
        name: "description",
        content:
          "Ciatta learns your body by listening. Create your account and everything it comes to understand stays private to you.",
      },
      { property: "og:title", content: "Begin with Ciatta — a quiet start" },
      {
        property: "og:description",
        content: "Ciatta learns your body by listening. What you share stays yours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Begin with Ciatta — a quiet start" },
      {
        name: "twitter:description",
        content: "Ciatta learns your body by listening. What you share stays yours.",
      },
    ],
  }),
  component: AuthPage,
});

/* ------------------------------------------------------------------ chrome */

/**
 * One reading column, centered on every screen size. On a phone it fills the
 * width; on a tablet or desktop it stays a column rather than a stretched page.
 */
function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center bg-background">
      <Living />
      <div
        className={`relative flex w-full max-w-[27rem] flex-1 flex-col px-8 sm:px-10 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Almost motionless light. The words are the animation, not the background. */
function Living() {
  return (
    <div
      aria-hidden="true"
      className="animate-breathe pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 70% at 18% 8%, color-mix(in oklab, var(--clay) 5%, transparent) 0%, transparent 62%)," +
          "radial-gradient(110% 70% at 88% 78%, oklch(0.88 0.04 340 / 0.05) 0%, transparent 62%)",
      }}
    />
  );
}

function Fade({
  show,
  children,
  ms = 900,
  className = "",
}: {
  show: boolean;
  children: React.ReactNode;
  ms?: number;
  className?: string;
}) {
  return (
    <div
      className={`transition-all ease-out ${className}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(6px)",
        transitionDuration: `${ms}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ splash */

/**
 * The brand introduction: the mark breathes into view, dissolves into the
 * wordmark, and the wordmark is held a full three seconds before onboarding.
 */
function Splash({ onDone }: { onDone: () => void }) {
  // 0 mark in · 1 mark held · 2 wordmark · 3 leaving
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 80),
      window.setTimeout(() => setStep(2), 2000),
      window.setTimeout(() => setStep(3), 5400), // wordmark held ~3s
      window.setTimeout(onDone, 6300),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [onDone]);

  const markVisible = step === 1;
  const wordVisible = step === 2;

  return (
    <div className="relative flex h-[100svh] items-center justify-center bg-background">
      <Living />
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden={!markVisible}
          className="absolute transition-all ease-out"
          style={{
            opacity: markVisible ? 1 : 0,
            transform: `scale(${markVisible ? 1 : 0.92})`,
            transitionDuration: "1100ms",
          }}
        >
          <span
            aria-hidden="true"
            className="animate-breathe absolute -inset-16 rounded-full blur-xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--clay) 12%, transparent) 0%, transparent 70%)",
            }}
          />
          <img
            src={mark.url}
            alt="Ciatta"
            className="relative dark:invert"
            style={{ width: 64, height: 64 }}
          />
        </div>
        <img
          src={wordmark.url}
          alt="Ciatta"
          width={1920}
          height={562}
          className="dark:invert transition-all ease-out"
          style={{
            width: 168,
            height: "auto",
            opacity: wordVisible ? 1 : 0,
            transform: `translateY(${wordVisible ? 0 : 4}px)`,
            transitionDuration: wordVisible ? "1100ms" : "900ms",
          }}
        />
      </div>
    </div>
  );
}


/* --------------------------------------------------------- living intro */

const SLIDES: { title: string; lines: string[] }[] = [
  {
    title: "I don't know you yet.",
    lines: ["Every body has its own rhythm.", "I'm here to learn yours."],
  },
  {
    title: "I learn by listening.",
    lines: ["Not from perfect data.", "From the small things you notice every day."],
  },
  {
    title: "Understanding takes time.",
    lines: ["One observation becomes a pattern.", "Patterns become understanding."],
  },
  {
    title: "What you share stays yours.",
    lines: [
      "Your information belongs to you. Always.",
      "You choose what I learn and what you keep private.",
    ],
  },
  {
    title: "Let's begin.",
    lines: ["One conversation.", "We'll start small.", "I'll remember what matters."],
  },
];

function LivingIntro({ onStart }: { onStart: () => void }) {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (i >= SLIDES.length - 1) return;
    const out = window.setTimeout(() => setVisible(false), 2400);
    const next = window.setTimeout(() => {
      setI((n) => n + 1);
      setVisible(true);
    }, 3000);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(next);
    };
  }, [i]);

  const slide = SLIDES[i];

  return (
    <Shell className="pt-16 pb-12">
      <img
        src={mark.url}
        alt="Ciatta"
        className="dark:invert"
        style={{ width: 40, height: 40 }}
      />

      <div className="flex flex-1 flex-col justify-center py-10">
        <Fade show={visible} ms={700}>
          <h1 className="max-w-[17rem] font-serif text-[34px] leading-[1.12] tracking-[-0.02em]">
            {slide.title}
          </h1>
          <div className="mt-5 max-w-[19rem] space-y-2.5 text-[14.5px] leading-relaxed text-muted-foreground">
            {slide.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Fade>
      </div>

      <div className="shrink-0">
        <div className="mb-8 flex gap-2">
          {SLIDES.map((s, n) => (
            <span
              key={s.title}
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full transition-colors duration-700"
              style={{
                background: n === i ? "var(--foreground)" : "var(--border)",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99]"
        >
          Get Started
        </button>
      </div>
    </Shell>
  );
}

/* ----------------------------------------------------------------- glyphs */

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

const RULES = [
  { label: "8–30 characters", test: (v: string) => v.length >= 8 && v.length <= 30 },
  { label: "1 uppercase character", test: (v: string) => /[A-Z]/.test(v) },
  { label: "1 lowercase character", test: (v: string) => /[a-z]/.test(v) },
  { label: "1 number", test: (v: string) => /\d/.test(v) },
  { label: "1 special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

/* ------------------------------------------------------------------- page */

type Phase =
  | "splash"
  | "intro"
  | "choose"
  | "email"
  | "verify"
  | "confirming"
  | "handoff"
  | "greeting";

/** Development-visible trail for every authentication step. */
const log = (step: string, detail?: unknown) => {
  if (import.meta.env.DEV) console.info(`[auth] ${step}`, detail ?? "");
};

/**
 * A return from the confirmation email carries its proof in the URL — either a
 * PKCE code, a one-time token hash, or tokens in the fragment. Any of them mean
 * "this person just confirmed", so we never show them the intro or a form again.
 */
function readConfirmation(): { code?: string; tokenHash?: string; type?: string } | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("code") ?? undefined;
  const tokenHash = query.get("token_hash") ?? hash.get("token_hash") ?? undefined;
  const type = query.get("type") ?? hash.get("type") ?? undefined;
  const hasTokens = Boolean(hash.get("access_token"));
  if (!code && !tokenHash && !hasTokens) return null;
  return { code, tokenHash, type };
}

function AuthPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(() => (readConfirmation() ? "confirming" : "splash"));
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [busy, setBusy] = useState<"apple" | "google" | "email" | "reset" | "resend" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [returning, setReturning] = useState(false);
  const settled = useRef(false);

  const passwordOk = useMemo(() => RULES.every((r) => r.test(password)), [password]);

  /** After any successful sign-in: one warm line, then the conversation. */
  const enter = useCallback(
    (isReturning: boolean) => {
      if (settled.current) return;
      settled.current = true;
      log("entering app", { returning: isReturning });
      setReturning(isReturning);
      setPhase("greeting");
      window.setTimeout(() => {
        navigate({ to: isReturning ? "/" : "/onboarding", replace: true }).catch((e: unknown) =>
          console.error("[auth] navigation failed", e),
        );
      }, 2300);
    },
    [navigate],
  );

  /** A verified session continues; an unverified one waits at the inbox. */
  const settle = useCallback(
    (user: { created_at?: string; email?: string | null; email_confirmed_at?: string | null }) => {
      if (!user.email_confirmed_at) {
        log("session found but email unverified", { email: user.email });
        if (user.email) setEmail(user.email);
        setPhase("verify");
        return;
      }
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const fresh = createdAt > 0 && Date.now() - createdAt < 90_000;
      enter(!fresh);
    },
    [enter],
  );

  /**
   * Returning from the confirmation email: finish the verification, sign them
   * in, and carry them straight back into the conversation they left. They must
   * never land on a create-account form after succeeding.
   */
  useEffect(() => {
    const proof = readConfirmation();
    if (!proof) return;
    let alive = true;

    const finish = async () => {
      log("confirmation return", { hasCode: Boolean(proof.code), hasHash: Boolean(proof.tokenHash) });
      try {
        if (proof.code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(proof.code);
          if (err) log("code exchange failed", err.message);
        } else if (proof.tokenHash) {
          const { error: err } = await supabase.auth.verifyOtp({
            token_hash: proof.tokenHash,
            type: (proof.type as "signup" | "email" | "magiclink" | "invite") ?? "signup",
          });
          if (err) log("verifyOtp failed", err.message);
        }
      } catch (e) {
        console.error("[auth] confirmation failed", e);
      }
      // Tokens in the fragment are picked up by the client itself; either way the
      // session is what decides.
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      window.history.replaceState({}, "", "/auth");
      const user = data.session?.user;
      if (user?.email_confirmed_at) {
        // A brief, calm beat so the transition reads as continuation.
        window.setTimeout(() => alive && enter(false), 900);
        return;
      }
      if (user?.email) setEmail(user.email);
      setPhase("verify");
      setNotice("That link has already been used or has expired. Send a fresh one below.");
    };

    void finish();
    return () => {
      alive = false;
    };
  }, [enter]);

  // A session already in the browser means we're mid-relationship, not new.
  useEffect(() => {
    if (readConfirmation()) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) console.error("[auth] getSession failed", err);
      log("initial session", { hasSession: Boolean(data.session) });
      if (data.session) settle(data.session.user);
    });
    return () => {
      alive = false;
    };
  }, [settle]);


  // While waiting at the inbox, notice the moment verification lands.
  useEffect(() => {
    if (phase !== "verify") return;
    let alive = true;
    const check = async () => {
      const { data, error: err } = await supabase.auth.refreshSession();
      if (!alive) return;
      if (err) {
        log("refreshSession while verifying", err.message);
        return;
      }
      const user = data.session?.user;
      if (user?.email_confirmed_at) {
        log("verification detected");
        enter(false);
      }
    };
    const id = window.setInterval(() => void check(), 4000);
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      log("auth state change", event);
      if (session?.user.email_confirmed_at) enter(false);
    });
    return () => {
      alive = false;
      window.clearInterval(id);
      sub.subscription.unsubscribe();
    };
  }, [phase, enter]);

  const continueWith = async (provider: "google" | "apple") => {
    setError(null);
    setBusy(provider);
    setPhase("handoff");
    log("oauth start", provider);
    await new Promise((r) => window.setTimeout(r, 1200));
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      console.error("[auth] oauth failed", result.error);
      setBusy(null);
      setPhase("choose");
      setError("That didn't complete. Try once more.");
      return;
    }
    if (result.redirected) return; // On its way to the provider.
    const { data } = await supabase.auth.getUser();
    if (data.user) settle(data.user);
  };

  const submitEmail = async () => {
    setError(null);
    setNotice(null);
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("That email doesn't look complete — check it once more.");
      return;
    }
    if (mode === "signup" && !passwordOk) {
      setError("A slightly stronger password, and we're set.");
      return;
    }
    setBusy("email");
    if (mode === "signup") {
      log("signUp request", { email: address });
      const { data, error: err } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      setBusy(null);
      if (err) {
        console.error("[auth] signUp failed", err);
        setError(
          err.message.toLowerCase().includes("already registered")
            ? "There's already an account with this email. Sign in instead."
            : err.message,
        );
        return;
      }
      const repeated = (data.user?.identities?.length ?? 1) === 0;
      log("signUp response", {
        hasSession: Boolean(data.session),
        confirmed: Boolean(data.user?.email_confirmed_at),
        repeatedSignup: repeated,
      });
      if (data.user?.email_confirmed_at && data.session) {
        enter(false);
        return;
      }
      setNotice(
        repeated
          ? "This email already has an account waiting to be verified. Check your inbox, or resend below."
          : null,
      );
      setPhase("verify");
      return;

    }
    log("signIn request", { email: address });
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    setBusy(null);
    if (err) {
      console.error("[auth] signIn failed", err);
      if (err.message.toLowerCase().includes("not confirmed")) {
        setPhase("verify");
        return;
      }
      setError("Those details didn't match. Try again.");
      return;
    }
    if (data.user) settle(data.user);
  };

  const resendVerification = async () => {
    setError(null);
    setNotice(null);
    setBusy("resend");
    log("resend verification", { email });
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    setBusy(null);
    if (err) {
      console.error("[auth] resend failed", err);
      setError(
        err.message.toLowerCase().includes("rate")
          ? "That's been sent recently — give it a minute before trying again."
          : "That didn't send. Try once more.",
      );
      return;
    }
    setNotice("Sent. It should arrive in a moment.");
  };

  const changeEmail = async () => {
    setError(null);
    setNotice(null);
    settled.current = false;
    await supabase.auth.signOut().catch(() => undefined);
    setPassword("");
    setMode("signup");
    setPhase("email");
  };

  const forgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Add your email first, and I'll send a reset link.");
      return;
    }
    setBusy("reset");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(null);
    if (err) {
      console.error("[auth] password reset failed", err);
      setError("That didn't send. Try once more.");
      return;
    }
    setNotice("A reset link is on its way to your inbox.");
  };

  if (phase === "splash") return <Splash onDone={() => setPhase("intro")} />;

  if (phase === "intro") return <LivingIntro onStart={() => setPhase("choose")} />;

  if (phase === "handoff") {
    return (
      <div className="relative flex h-[100svh] items-center justify-center bg-background px-10">
        <Living />
        <p className="animate-in fade-in relative max-w-[19rem] text-center font-serif text-[22px] leading-[1.3] duration-[900ms]">
          One secure step, then we&apos;ll continue our conversation.
        </p>
      </div>
    );
  }

  if (phase === "verify") {
    return (
      <Shell className="animate-in fade-in pt-20 pb-12 duration-[700ms]">
        <div className="flex-1">
          <img src={mark.url} alt="Ciatta" className="dark:invert" style={{ width: 40, height: 40 }} />
          <h1 className="mt-12 max-w-[18rem] font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
            Check your email.
          </h1>
          <p className="mt-4 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
            I&apos;ve sent a verification link to
          </p>
          <p className="mt-1.5 text-[15px] font-medium break-all">{email.trim()}</p>
          <p className="mt-4 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
            Open it and we&apos;ll continue right here — this screen notices the moment you do.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void resendVerification()}
            className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "resend" ? "Sending…" : "Resend email"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void changeEmail()}
            className="mt-3 w-full rounded-full border border-border bg-background px-6 py-[15px] text-[15px] font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            Change email address
          </button>

          {error && <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>}
          {notice && <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{notice}</p>}
        </div>
      </Shell>
    );
  }



  if (phase === "greeting") {
    return (
      <div className="relative flex h-[100svh] flex-col items-center justify-center bg-background px-10">
        <Living />
        <div className="animate-in fade-in relative text-center duration-[1000ms]">
          <h1 className="font-serif text-[30px] leading-[1.16] tracking-[-0.02em]">
            {returning ? "Welcome back." : "Nice to meet you."}
          </h1>
          <p className="mt-3 text-[14.5px] text-muted-foreground">
            {returning ? "Let's continue." : "Let's begin."}
          </p>
        </div>
      </div>
    );
  }

  const legal = (
    <p className="mt-6 text-center text-[12.5px] leading-relaxed text-muted-foreground">
      By continuing, you agree to Ciatta&apos;s{" "}
      <Link to="/terms" className="text-foreground underline underline-offset-2">
        Terms of Use
      </Link>{" "}
      and{" "}
      <Link to="/privacy" className="text-foreground underline underline-offset-2">
        Privacy Policy
      </Link>
      .
    </p>
  );

  const social = (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void continueWith("apple")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background px-6 py-[15px] text-[15px] font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
      >
        <AppleGlyph />
        Continue with Apple
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void continueWith("google")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background px-6 py-[15px] text-[15px] font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
      >
        <GoogleGlyph />
        Continue with Google
      </button>
    </div>
  );

  const swap = (
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
          <span className="text-foreground underline underline-offset-2">Sign In</span>
        </>
      ) : (
        <>
          Don&apos;t have an account?{" "}
          <span className="text-foreground underline underline-offset-2">Create Account</span>
        </>
      )}
    </button>
  );

  if (phase === "email") {
    return (
      <Shell className="animate-in fade-in pt-14 pb-12 duration-[700ms]">
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
          {mode === "signup" ? "Create your account" : "Welcome back."}
        </h1>
        <p className="mt-3 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
          {mode === "signup"
            ? "Your account keeps your understanding private, secure, and available only to you."
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
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8" />
                  <path d="M6.3 6.9C4.3 8.2 2.8 10 2 12c1.7 4 5.6 6.5 10 6.5 1.7 0 3.3-.4 4.7-1.1M9.9 5.7A10 10 0 0112 5.5c4.4 0 8.3 2.5 10 6.5a13 13 0 01-2.4 3.4" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 12c1.7-4 5.6-6.5 10-6.5S20.3 8 22 12c-1.7 4-5.6 6.5-10 6.5S3.7 16 2 12z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mode === "signup" ? (
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
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void forgotPassword()}
            className="mt-4 self-start text-[13.5px] text-muted-foreground underline underline-offset-2 disabled:opacity-60"
          >
            Forgot password?
          </button>
        )}

        <div className="mt-auto pt-10">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void submitEmail()}
            className="w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "email" ? "Just a moment…" : "Continue"}
          </button>

          {error && <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{error}</p>}
          {notice && (
            <p className="mt-4 text-center text-[13.5px] text-muted-foreground">{notice}</p>
          )}

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {social}
          {swap}
          {legal}
        </div>
      </Shell>
    );
  }

  return (
    <Shell className="animate-in fade-in pt-20 pb-10 duration-[900ms]">
      <div className="flex-1">
        <img
          src={mark.url}
          alt="Ciatta"
          className="dark:invert"
          style={{ width: 40, height: 40 }}
        />
        <h1 className="mt-12 max-w-[17rem] font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
          Create your account
        </h1>
        <p className="mt-4 max-w-[20rem] text-[14.5px] leading-relaxed text-muted-foreground">
          Your account keeps your understanding private, secure, and available only to you.
        </p>
      </div>

      <div className="shrink-0">
        {social}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setMode("signup");
            setPhase("email");
          }}
          className="mt-3 w-full rounded-full bg-foreground px-6 py-[15px] text-[15px] font-medium text-background transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
        >
          Continue with Email
        </button>

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
          <span className="text-foreground underline underline-offset-2">Sign In</span>
        </button>
        {legal}
      </div>
    </Shell>
  );
}
