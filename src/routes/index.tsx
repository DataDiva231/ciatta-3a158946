import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProfileIcon } from "@/components/ciatta/tab-bar";
import { Understanding } from "@/components/ciatta/understanding";

import { formatLongDate, today } from "@/lib/ciatta-data";
import { useCheckIns, useQuickAddEvents } from "@/lib/ciatta-store";
import type { QuickAddEvent } from "@/lib/ciatta-store";
import { buildNarrative, type NarrativeLine } from "@/lib/narrative";
import { ONBOARDING_KEY } from "@/lib/onboarding-store";
import { useEngine } from "@/lib/use-engine";


export const Route = createFileRoute("/")({
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

/** Turns the newest thing Ciatta was taught into a plain, human sentence. */
function learnedSentence(event: QuickAddEvent | undefined) {
  if (!event) return "I learned something new about your day.";
  const value = (event.value ?? "").toLowerCase();
  switch (event.category) {
    case "Sleep":
      return `I learned you slept ${value || "differently than usual"}.`;
    case "Symptoms":
      return `I learned you're feeling ${value}.`;
    case "Flow":
      return `I learned your flow is ${value}.`;
    case "Activity":
      return `I learned about your ${value} session.`;
    case "Nutrition":
      return `I learned about ${value}.`;
    default:
      return `I learned about your ${event.category.toLowerCase()}.`;
  }
}

/** How clear today feels, in words rather than a score. */
function understandingLine(value: number, delta: number) {
  const state =
    value >= 85
      ? "Today feels clear to me"
      : value >= 70
        ? "Today is becoming clearer"
        : value >= 50
          ? "I'm beginning to understand today"
          : "I'm still listening to today";
  return delta > 0 ? `${state} · a little clearer since you shared` : state;
}


function TodayPage() {
  const navigate = useNavigate();
  
  // First run: send new users into their first Teach Session.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY);
      const done = raw ? Boolean(JSON.parse(raw)?.completed) : false;
      if (!done) navigate({ to: "/onboarding" });
    } catch {
      /* storage unavailable */
    }
  }, [navigate]);

  const { latest } = useCheckIns();
  const { events } = useQuickAddEvents();
  const narrative = buildNarrative(latest, events);
  const primaryLabels = ["Sleep quality", "Resting heart rate"];
  const primaryLines = narrative.lines.filter((l) => primaryLabels.includes(l.label));
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

  const newest = [...events].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];

  return (
    <div className="flex min-h-[calc(100svh-76px)] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 px-7 pt-8">
        <div>
          <h1 className="font-serif text-[26px] leading-none tracking-[-0.015em]">
            Good morning, Jenny
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {formatLongDate(today.date)}
          </p>
        </div>
        <Link
          to="/profile"
          aria-label="Profile"
          className="-mr-2 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
        >
          <ProfileIcon active={false} />
        </Link>
      </header>

      {/* The Understanding — the visual anchor of the screen. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7 py-10 [@media(max-height:780px)]:py-6">
        <Understanding
          size={268}
          confidence={narrative.confidence.value}
          active={justTaught}
        />

        {justTaught && (
          <div
            role="status"
            className="animate-dissolve absolute inset-x-7 bottom-1 text-center"
          >
            <p className="label-caps text-muted-foreground/70">New today</p>
            <p className="mt-2 font-serif text-[17px] leading-[1.35]">
              {learnedSentence(newest)}
            </p>
            <p className="mt-1 text-[12px] leading-[1.5] text-muted-foreground">
              Today's understanding became a little clearer.
            </p>

          </div>
        )}
      </div>

      <section className="shrink-0 px-7 pb-8">
        {/* The observation — the emotional centrepiece. */}
        <h2
          key={narrative.headline.map((p) => p.text).join("")}
          className="animate-dissolve font-serif text-[34px] leading-[1.15] tracking-[-0.015em] [@media(max-height:780px)]:text-[29px]"
        >
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h2>

        <p
          key={`conf-${narrative.confidence.value}`}
          className="animate-in fade-in mt-4 text-[11px] leading-none text-muted-foreground/70 duration-500"
        >
          {understandingLine(narrative.confidence.value, narrative.confidence.delta)}
        </p>


        {/* Why Ciatta thinks that. Quiet, non-tappable evidence. */}
        <div className="mt-9 [@media(max-height:780px)]:mt-7">
          <p className="label-caps text-muted-foreground/70">What I'm noticing</p>
          <div className="mt-3 divide-y divide-border/50">
            {primaryLines.map((line) => (
              <div key={line.label} className="py-3 first:pt-0 last:pb-0">
                <NarrativeBlock line={line} />
              </div>
            ))}
            {narrative.impact && (
              <p
                key={narrative.impact.text}
                className="animate-in fade-in py-3 text-[12px] leading-[1.5] text-muted-foreground duration-700"
              >
                {narrative.impact.source} · {narrative.impact.text}
              </p>
            )}
          </div>
        </div>

        {/* The single takeaway. */}
        <div className="mt-10 [@media(max-height:780px)]:mt-8">
          <p className="label-caps text-accent">Today's focus</p>
          <p className="mt-3 font-serif text-[22px] leading-[1.3]">
            {narrative.guidance.lead} {narrative.guidance.rest}
          </p>
          <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">
            {narrative.guidance.support}
          </p>
        </div>
      </section>
    </div>
  );
}

function NarrativeBlock({ line }: { line: NarrativeLine }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground/60">{line.label}</p>
      <p className="mt-1 text-[13px] leading-[1.55] text-foreground/80">
        {line.parts.map((part, i) => (
          <span key={i} className={part.accent ? "font-medium tabular-nums" : undefined}>
            {part.text}
          </span>
        ))}
      </p>
    </div>
  );
}
