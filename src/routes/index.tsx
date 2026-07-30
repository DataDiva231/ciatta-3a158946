import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import figureAsset from "@/assets/ciatta-figure-cut.png.asset.json";
import figureWebp from "@/assets/ciatta-figure-cut.webp.asset.json";
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
    links: [
      {
        rel: "preload",
        as: "image",
        href: figureWebp.url,
        type: "image/webp",
        fetchpriority: "high",
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
    <div className="flex h-[calc(100svh-76px)] min-h-[calc(100svh-76px)] flex-col">
      <header className="shrink-0 px-6 pt-6 [@media(max-height:780px)]:pt-4">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:bg-secondary/70 [@media(max-height:780px)]:h-9 [@media(max-height:780px)]:w-9"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="mt-4 text-[15px] font-medium text-accent [@media(max-height:780px)]:mt-3">
          Good morning, Jenny
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{formatLongDate(today.date)}</p>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <picture className="contents">
          <source srcSet={figureWebp.url} type="image/webp" />
          <img
            src={figureAsset.url}
            alt="Ciatta's rendering of your body, lit from within"
            width={1024}
            height={1024}
            decoding="async"
            fetchPriority="high"
            className="mx-auto h-full w-auto max-w-[94%] object-contain"
            style={{
              maskImage: "linear-gradient(to bottom, black 74%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 74%, transparent 98%)",
            }}
          />
        </picture>
      </div>

      <section className="shrink-0 px-6 pb-1">
        <div className="mb-2 flex items-center gap-2">
          <span
            key={`conf-${narrative.confidence.value}`}
            className="animate-in fade-in inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] leading-none text-accent duration-500"
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-accent ${justTaught ? "animate-pulse" : ""}`} />
            {narrative.confidence.value}% confidence
            {narrative.confidence.delta > 0 && (
              <span className="text-muted-foreground">+{narrative.confidence.delta}</span>
            )}
          </span>
          {justTaught && (
            <span className="animate-in fade-in slide-in-from-bottom-1 text-[11px] leading-none text-muted-foreground duration-300">
              Updated just now
            </span>
          )}
        </div>
        <h1
          key={narrative.headline.map((p) => p.text).join("")}
          className="animate-in fade-in slide-in-from-bottom-2 font-serif text-[30px] leading-[1.15] font-light tracking-[-0.01em] duration-500 [@media(max-height:780px)]:text-[26px]"
        >
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        {narrative.impact && (
          <p
            key={narrative.impact.text}
            className="animate-in fade-in mt-2 truncate text-[12px] leading-none text-muted-foreground duration-700"
          >
            <span className="text-accent">{narrative.impact.source}</span> · {narrative.impact.text}
          </p>
        )}



        <div className="mt-4 divide-y divide-border border-t border-border [@media(max-height:780px)]:mt-3">
          {primaryLines.map((line) => (
            <NarrativeBlock key={line.label} line={line} compact />
          ))}

          <div className="py-3">
            <p className="label-caps">Guidance</p>
            <p className="mt-1 font-serif text-[18px] leading-[1.3] font-light whitespace-nowrap">
              <span className="text-accent">{narrative.guidance.lead}</span>{" "}
              {narrative.guidance.rest}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] whitespace-nowrap text-muted-foreground">
              {narrative.guidance.support}
            </p>
          </div>
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
    <div className={small ? "py-3" : "py-5 [@media(max-height:780px)]:py-3.5"}>
      <p className="label-caps">{line.label}</p>
      <p
        className={
          compact
            ? "mt-1 truncate text-[13px] leading-[1.5] tracking-[-0.01em] whitespace-nowrap"
            : wrap
              ? "mt-1 text-[13px] leading-[1.5] tracking-[-0.01em]"
              : "mt-1.5 text-[16px] leading-[1.5]"
        }
      >
        {line.parts.map((part, i) => (
          <span
            key={i}
            className={
              part.accent
                ? `align-baseline font-serif leading-[1] text-accent ${small ? "text-[17px]" : "text-[22px]"}`
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

