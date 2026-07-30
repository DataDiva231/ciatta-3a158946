import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProfileIcon } from "@/components/ciatta/tab-bar";
import { Understanding } from "@/components/ciatta/understanding";

import { formatLongDate, today } from "@/lib/ciatta-data";
import { useCheckIns, useQuickAddEvents } from "@/lib/ciatta-store";
import { buildNarrative, type NarrativeLine } from "@/lib/narrative";
import { ONBOARDING_KEY } from "@/lib/onboarding-store";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Ciatta" },
      {
        name: "description",
        content:
          "Ciatta reads your sleep, recovery and cycle signals and tells you what your body is asking for today.",
      },
      { property: "og:title", content: "Today — Ciatta" },
      {
        property: "og:description",
        content: "Ciatta reads your sleep, recovery and cycle signals and tells you what your body is asking for today.",
      },
    ],
  }),

  component: TodayPage,
});


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
    const t = setTimeout(() => setJustTaught(false), 2600);
    return () => clearTimeout(t);
  }, []);



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

      {/* The Understanding, centred. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7">
        <Understanding
          size={264}
          confidence={narrative.confidence.value}
          active={justTaught}
        />
      </div>


      <section className="shrink-0 px-7 pb-6">
        <p
          key={`conf-${narrative.confidence.value}`}
          className="animate-in fade-in flex items-center gap-2 text-[11px] leading-none text-muted-foreground duration-500"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full bg-accent ${justTaught ? "animate-pulse" : ""}`}
          />
          <span className="text-accent">{narrative.confidence.value}% understood</span>
          {narrative.confidence.delta > 0 && <span>+{narrative.confidence.delta}</span>}
          {justTaught && (
            <span className="animate-in fade-in duration-300">· updated just now</span>
          )}
        </p>

        <h2
          key={narrative.headline.map((p) => p.text).join("")}
          className="animate-in fade-in slide-in-from-bottom-2 mt-3 font-serif text-[34px] leading-[1.1] tracking-[-0.015em] duration-500 [@media(max-height:780px)]:text-[29px]"
        >
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h2>

        {narrative.impact && (
          <p
            key={narrative.impact.text}
            className="animate-in fade-in mt-3 truncate text-[12px] leading-none text-muted-foreground duration-700"
          >
            <span className="text-accent">{narrative.impact.source}</span> ·{" "}
            {narrative.impact.text}
          </p>
        )}

        <div className="mt-6 space-y-2 [@media(max-height:780px)]:mt-5">
          {primaryLines.map((line) => (
            <Link
              key={line.label}
              to="/teach"
              className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_10px_26px_-22px_rgba(60,45,35,0.5)] transition-transform active:scale-[0.99]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0 flex-1">
                <NarrativeBlock line={line} wrap />
              </span>
              <span aria-hidden="true" className="shrink-0 text-[16px] leading-none text-muted-foreground/50">
                {"\u203A"}
              </span>

            </Link>
          ))}
        </div>

        <div className="mt-6 [@media(max-height:780px)]:mt-5">
          <p className="font-serif text-[19px] leading-[1.3]">
            <span className="text-accent">{narrative.guidance.lead}</span>{" "}
            {narrative.guidance.rest}
          </p>
          <p className="mt-1.5 truncate text-[13px] leading-[1.5] text-muted-foreground">
            {narrative.guidance.support}
          </p>
        </div>

      </section>

    </div>
  );
}

function NarrativeBlock({
  line,
  compact,
  wrap,
}: {
  line: NarrativeLine;
  compact?: boolean;
  wrap?: boolean;
}) {
  const small = compact || wrap;
  return (
    <div className={small ? "" : "[@media(max-height:780px)]:py-1 py-2"}>
      <p className="label-caps">{line.label}</p>
      <p
        className={
          compact
            ? "mt-1 truncate text-[13px] leading-[1.5] whitespace-nowrap"
            : wrap
              ? "mt-1 text-[13px] leading-[1.5]"
              : "mt-1.5 text-[16px] leading-[1.5]"
        }
      >
        {line.parts.map((part, i) => (
          <span
            key={i}
            className={
              part.accent
                ? `font-medium text-accent tabular-nums ${small ? "text-[14px]" : "text-[17px]"}`
                : undefined
            }
          >
            {part.text}
          </span>
        ))}
      </p>
    </div>
  );


}

