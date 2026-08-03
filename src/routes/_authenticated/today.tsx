import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProfileIcon } from "@/components/ciatta/tab-bar";
import { Understanding } from "@/components/ciatta/understanding";

import { formatLongDate } from "@/lib/dates";
import { useIdentity } from "@/lib/profile-store";
import { ONBOARDING_KEY } from "@/lib/onboarding-store";
import { useTodayIntelligence } from "@/lib/intelligence/use-today-intelligence";
import { useEngine } from "@/lib/use-engine";


export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Ciatta" },
      {
        name: "description",
        content:
          "Ciatta listens to your sleep, rhythm and cycle, and shares what it's beginning to understand about your body today.",
      },
      { property: "og:title", content: "Today — Ciatta" },
      {
        property: "og:description",
        content:
          "What Ciatta understands about you today, why it thinks so, and what to focus on next.",
      },
    ],
  }),

  component: TodayPage,
});

/** Highlights one phrase inside a sentence the engine wrote. */
function splitAccent(sentence: string, accent: string) {
  const at = accent ? sentence.indexOf(accent) : -1;
  if (at < 0) return [{ text: sentence, accent: false }];
  return [
    { text: sentence.slice(0, at), accent: false },
    { text: accent, accent: true },
    { text: sentence.slice(at + accent.length), accent: false },
  ].filter((p) => p.text.length > 0);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function TodayPage() {
  const navigate = useNavigate();

  // First run: send new users into their first Teach Session, then into their
  // first real observation before the app opens.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (!saved?.completed) navigate({ to: "/onboarding" });
      else if (!saved?.firstObservationDone) navigate({ to: "/first-observation" });
    } catch {
      /* storage unavailable */
    }
  }, [navigate]);

  const { identity } = useIdentity();
  const firstName = identity.name.trim().split(" ")[0];

  // Biological understanding comes from the Intelligence Store alone — the
  // screen never touches evidence, features, observations or Bluetooth.
  const today = useTodayIntelligence();

  // What the user has taught in words still speaks through the engine views.
  const { views } = useEngine();
  const view = views?.today;

  // While the store is starting up, or if understanding is unreachable, the
  // intelligence copy leads — no taught-text fallback, no technical detail.
  const engineSilenced = today.state === "initializing" || today.state === "error";

  const headline =
    today.state === "ready" || engineSilenced
      ? [{ text: today.headline, accent: false }]
      : view?.headline
        ? splitAccent(view.headline, view.accent)
        : [{ text: today.headline, accent: false }];
  const standing =
    today.state === "ready" || engineSilenced ? today.summary : (view?.standing ?? today.summary);
  const evidence: { label: string; text: string }[] = engineSilenced
    ? []
    : today.noticing.length
      ? today.noticing
      : (view?.evidence ?? []);
  const focus = engineSilenced ? null : (view?.focus ?? null);
  const depth =
    today.state === "ready" || engineSilenced
      ? today.confidence
      : (view?.depth ?? today.confidence);




  // Set by Quick Add so the insight visibly re-forms when the user lands back here.
  const [justTaught, setJustTaught] = useState(false);

  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem("ciatta:just-taught") !== null;
      sessionStorage.removeItem("ciatta:just-taught");
    } catch {
      /* storage unavailable */
    }
    if (!flagged) return;
    setJustTaught(true);
    const t = setTimeout(() => setJustTaught(false), 5200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[calc(100svh-76px)] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 px-7 pt-8">
        <div>
          <h1 className="font-serif text-[26px] leading-none tracking-[-0.015em]">
            {firstName ? `${greeting()}, ${firstName}` : greeting()}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{formatLongDate()}</p>
        </div>
        <Link
          to="/profile"
          aria-label="Profile"
          data-tour="profile"
          className="-mr-2 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
        >

          <ProfileIcon active={false} />
        </Link>
      </header>

      {/* The Understanding — the visual anchor of the screen. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7 py-10 [@media(max-height:780px)]:py-6">
        <Understanding size={268} confidence={depth} active={justTaught} />

        {justTaught && view?.acknowledgment && (
          <div role="status" className="animate-dissolve absolute inset-x-7 bottom-1 text-center">
            <p className="label-caps text-muted-foreground/70">New today</p>
            <p className="mt-2 font-serif text-[17px] leading-[1.35]">{view.acknowledgment}</p>
          </div>
        )}
      </div>

      <section className="shrink-0 px-7 pb-8">
        {/* The observation — the emotional centrepiece. */}
        <h2
          key={headline.map((p) => p.text).join("")}
          className="animate-dissolve font-serif text-[34px] leading-[1.15] tracking-[-0.015em] [@media(max-height:780px)]:text-[29px]"
        >
          {headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h2>

        <p
          key={standing}
          className="animate-in fade-in mt-4 text-[13px] leading-[1.55] text-muted-foreground duration-500"
        >
          {standing}
        </p>

        {/* Confidence state and freshness — plain language, never technical. */}
        <p className="animate-in fade-in mt-3 text-[11px] leading-none text-muted-foreground/70 duration-500">
          {today.confidenceLabel}
          {today.updatedLabel ? ` · ${today.updatedLabel}` : ""}
        </p>


        {/* Why Ciatta thinks that. Quiet, non-tappable evidence. */}
        {evidence.length > 0 && (
          <div className="mt-9 [@media(max-height:780px)]:mt-7">
            <p className="label-caps text-muted-foreground/70">What I'm noticing</p>
            <div className="mt-3 divide-y divide-border/50">
              {evidence.map((row) => (
                <div key={row.label + row.text} className="py-3 first:pt-0 last:pb-0">
                  <p className="label-caps text-muted-foreground/60">{row.label}</p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-foreground/80">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The single takeaway, or an honest invitation instead of one. */}
        <div className="mt-10 [@media(max-height:780px)]:mt-8">
          {focus ? (
            <>
              <p className="label-caps text-accent">Today's focus</p>
              <p className="mt-3 font-serif text-[22px] leading-[1.3]">
                {focus.lead} {focus.rest}
              </p>
              <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">
                {focus.support}
              </p>
            </>
          ) : (
            <Link to="/teach" className="inline-flex items-center gap-1.5 text-[15px] text-accent">
              Tell me about your day
              <span aria-hidden="true">{"\u203A"}</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
