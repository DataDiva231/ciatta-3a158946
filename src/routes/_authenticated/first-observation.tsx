/**
 * First Observation — the bridge between onboarding and the app.
 *
 * A new user shouldn't meet a finished product; they should meet a curious one.
 * So before Today opens, we learn one real thing together and let the whole
 * loop happen in front of them: share → the orb takes it in → a first real
 * understanding → their first Today insight. Everything shown here comes from
 * the Intelligence Engine reading the observation they just made.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Composer } from "@/components/ciatta/composer";
import { QuickAddSheet } from "@/components/ciatta/quick-add-sheet";
import { Understanding } from "@/components/ciatta/understanding";

import { useQuickAddEvents } from "@/lib/ciatta-store";
import { haptic } from "@/lib/haptics";
import { useOnboarding } from "@/lib/onboarding-store";
import { useEngine } from "@/lib/use-engine";

export const Route = createFileRoute("/_authenticated/first-observation")({
  head: () => ({
    meta: [
      { title: "One real thing — Ciatta" },
      {
        name: "description",
        content:
          "Ciatta begins with curiosity. Share one real thing about today and watch the first understanding form.",
      },
      { property: "og:title", content: "One real thing — Ciatta" },
      {
        property: "og:description",
        content: "The first thing you share becomes the first thing Ciatta understands.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FirstObservationPage,
});

type Stage = "invite" | "capture" | "processing" | "insight";

const PROCESSING_LINES = [
  "Taking that in\u2026",
  "Holding it next to what you told me\u2026",
  "Forming my first understanding of you\u2026",
];

function FirstObservationPage() {
  const navigate = useNavigate();
  const { save } = useOnboarding();
  const { addEvent } = useQuickAddEvents();
  const { views } = useEngine();

  const [stage, setStage] = useState<Stage>("invite");
  const [sheet, setSheet] = useState(false);
  const [line, setLine] = useState(0);

  // The orb visibly works while the engine runs the learning loop.
  useEffect(() => {
    if (stage !== "processing") return;
    const ticks = [
      window.setTimeout(() => setLine(1), 1200),
      window.setTimeout(() => setLine(2), 2400),
      window.setTimeout(() => setStage("insight"), 3600),
    ];
    return () => ticks.forEach(window.clearTimeout);
  }, [stage]);

  const done = () => {
    save({ firstObservationDone: true });
    navigate({ to: "/today" });
  };

  const shared = () => {
    haptic("tap");
    setSheet(false);
    setStage("processing");
  };

  if (stage === "invite") {
    return (
      <div className="animate-dissolve flex min-h-svh flex-col justify-between px-7 pt-24 pb-10">
        <div>
          <p className="label-caps text-muted-foreground/70">Before we start</p>
          <h1 className="mt-6 font-serif text-[34px] leading-[1.14] tracking-[-0.015em]">
            Let&rsquo;s understand one real thing together.
          </h1>
          <p className="mt-5 max-w-[22rem] text-[15px] leading-[1.7] text-muted-foreground">
            I don&rsquo;t know you yet, and I&rsquo;d rather learn than assume. One honest thing
            about today is enough to begin.
          </p>
        </div>

        <div className="flex justify-center py-8">
          <Understanding size={200} confidence={4} />
        </div>

        <button
          type="button"
          onClick={() => {
            haptic("tap");
            setStage("capture");
          }}
          className="w-full rounded-full bg-foreground px-6 py-4 text-[15px] leading-none font-medium text-background transition-opacity active:opacity-80"
        >
          Teach me one thing
        </button>
      </div>
    );
  }

  if (stage === "capture") {
    return (
      <div className="flex min-h-svh flex-col px-7 pt-16 pb-6">
        <p className="label-caps text-muted-foreground/70">Your first observation</p>
        <h1 className="mt-5 font-serif text-[30px] leading-[1.15] tracking-[-0.015em]">
          What happened today?
        </h1>
        <p className="mt-4 max-w-[20rem] text-[13px] leading-relaxed text-muted-foreground">
          Sleep, flow, a symptom, your mood &mdash; whatever is true right now. Nothing here is a
          test.
        </p>

        <div aria-hidden="true" className="min-h-[10vh] flex-1" />

        <button
          type="button"
          onClick={() => {
            haptic("tap");
            setSheet(true);
          }}
          className="flex w-full items-center justify-between gap-4 rounded-full bg-foreground px-6 py-4 text-left transition-opacity active:opacity-80"
        >
          <span className="min-w-0">
            <span className="block text-[15px] leading-none font-medium text-background">
              Quick Add
            </span>
            <span className="mt-1.5 block text-[12px] leading-snug text-background/70">
              The fastest way to share one moment.
            </span>
          </span>
          <span aria-hidden="true" className="text-[16px] text-background/70">
            ↑
          </span>
        </button>

        <div className="mt-4">
          <Composer
            label="Or tell me in your own words"
            placeholder="Tell me anything about today..."
            onSubmit={(text) => {
              addEvent({
                category: "Note",
                value: text,
                timestamp: new Date().toISOString(),
                metadata: { Note: text },
              });
              shared();
            }}
          />
        </div>

        <QuickAddSheet open={sheet} onClose={() => setSheet(false)} onLogged={() => shared()} />
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-8 text-center">
        <Understanding size={248} confidence={views?.today.depth ?? 12} active />
        <p key={line} className="animate-dissolve mt-12 font-serif text-[20px] leading-[1.35]">
          {PROCESSING_LINES[line]}
        </p>
      </div>
    );
  }

  const today = views?.today;

  return (
    <div className="animate-dissolve flex min-h-svh flex-col justify-between px-7 pt-16 pb-10">
      <div>
        <p className="label-caps text-accent">Your first understanding</p>
        <h1 className="mt-6 font-serif text-[32px] leading-[1.16] tracking-[-0.015em]">
          {today?.headline ?? "I'm just beginning to understand you."}
        </h1>
        <p className="mt-4 text-[13px] leading-none text-muted-foreground/70">
          {today?.standing ?? "This is everything I know so far, and it came from you."}
        </p>

        {today?.evidence?.length ? (
          <div className="mt-9">
            <p className="label-caps text-muted-foreground/70">What I&rsquo;m noticing</p>
            <div className="mt-3 divide-y divide-border/50">
              {today.evidence.map((row) => (
                <div key={row.label + row.text} className="py-3 first:pt-0 last:pb-0">
                  <p className="label-caps text-muted-foreground/60">{row.label}</p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-foreground/80">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {today?.focus ? (
          <div className="mt-9">
            <p className="label-caps text-accent">Today&rsquo;s focus</p>
            <p className="mt-3 font-serif text-[20px] leading-[1.3]">
              {today.focus.lead} {today.focus.rest}
            </p>
            <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">
              {today.focus.support}
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={done}
        className="mt-10 w-full rounded-full bg-foreground px-6 py-4 text-[15px] leading-none font-medium text-background transition-opacity active:opacity-80"
      >
        Continue
      </button>
    </div>
  );
}
