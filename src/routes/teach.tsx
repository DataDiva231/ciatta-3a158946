import { createFileRoute, Link } from "@tanstack/react-router";

import { Understanding } from "@/components/ciatta/understanding";
import { useCheckIns, useQuickAddEvents } from "@/lib/ciatta-store";
import { buildNarrative } from "@/lib/narrative";
import { buildTeachSuggestions, confidenceLine } from "@/lib/teach-suggestions";


export const Route = createFileRoute("/teach")({
  head: () => ({
    meta: [
      { title: "What happened today? — Ciatta" },
      {
        name: "description",
        content:
          "Share a moment from your day in your own words. Everything you share makes tomorrow's understanding more personal.",
      },
      { property: "og:title", content: "What happened today? — Ciatta" },
      {
        property: "og:description",
        content: "Share how your day felt, in your own words.",
      },
    ],
  }),
  component: TeachPage,
});

const OTHER_WAYS = [
  { to: "/talk", label: "Talk" },
  { to: "/capture", label: "Capture" },
  { to: "/attach", label: "Attach" },
] as const;


function TeachPage() {
  const { latest } = useCheckIns();
  const { events } = useQuickAddEvents();
  const narrative = buildNarrative(latest, events);
  const suggestions = buildTeachSuggestions(events, narrative.confidence.value);

  return (
    <div className="flex min-h-full flex-col px-7 pt-6 pb-2">
      <div className="flex flex-1 items-center justify-center py-2">
        <Understanding size="hero" confidence={narrative.confidence.value} />
      </div>

      <h1 className="font-serif text-[32px] leading-[1.12] tracking-[-0.015em]">
        What happened today?
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{confidenceLine()}</p>

      {suggestions.length > 0 && (
        <div className="mt-7">
          <p className="label-caps">Suggested moments</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {suggestions.map((s) => (
              <Link
                key={s.category}
                to="/quick-add"
                search={{ category: s.category }}
                className="animate-in fade-in text-[13px] leading-snug transition-opacity active:opacity-60"
              >
                <span className="text-accent">{s.label}</span>{" "}
                <span className="text-muted-foreground">{s.reason}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        to="/quick-add"
        className="mt-8 flex items-center justify-between gap-4 rounded-full bg-foreground px-6 py-4 text-left transition-opacity hover:opacity-90 active:opacity-80"
      >
        <span className="min-w-0">
          <span className="block text-[15px] leading-none font-medium text-background">
            Quick Add
          </span>
          <span className="mt-1.5 block text-[12px] leading-snug text-background/70">
            The fastest way to share a moment.
          </span>
        </span>
        <span aria-hidden="true" className="text-[16px] text-background/70">
          →
        </span>
      </Link>


      <div className="mt-7 flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">Other ways to share</span>
        <span className="flex items-center gap-5">
          {OTHER_WAYS.map(({ to, label }) => (
            <Link key={label} to={to} className="text-accent transition-opacity active:opacity-60">
              {label}
            </Link>
          ))}
        </span>
      </div>
    </div>
  );
}

