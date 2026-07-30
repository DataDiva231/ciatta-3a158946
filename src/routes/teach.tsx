import { createFileRoute, Link } from "@tanstack/react-router";

import { Understanding } from "@/components/ciatta/understanding";
import { useCheckIns, useQuickAddEvents } from "@/lib/ciatta-store";
import { buildNarrative } from "@/lib/narrative";
import { buildTeachSuggestions, confidenceLine } from "@/lib/teach-suggestions";


export const Route = createFileRoute("/teach")({
  head: () => ({
    meta: [
      { title: "Teach Ciatta — Ciatta" },
      {
        name: "description",
        content:
          "Tell Ciatta what changed since it last checked in. Every update makes tomorrow's understanding more personal.",
      },
      { property: "og:title", content: "Teach Ciatta — Ciatta" },
      {
        property: "og:description",
        content: "Teach Ciatta about your body in your own words.",
      },
    ],
  }),
  component: TeachPage,
});

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 6.5 9.7 4.4h4.6L15.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.5 11.5 12 18a4 4 0 0 1-5.7-5.7l7-7a2.8 2.8 0 0 1 4 4l-7 7a1.6 1.6 0 0 1-2.3-2.3l6.4-6.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OTHER_WAYS = [
  { to: "/talk", label: "Talk", Icon: MicIcon },
  { to: "/capture", label: "Capture", Icon: CameraIcon },
  { to: "/attach", label: "Attach", Icon: ClipIcon },
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
        What's changed since we last checked in?
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        {confidenceLine(narrative.confidence.value, suggestions.length)}
      </p>

      {suggestions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {suggestions.map((s) => (
            <Link
              key={s.category}
              to="/quick-add"
              search={{ category: s.category }}
              className="animate-in fade-in text-[13px] leading-none transition-opacity active:opacity-60"
            >
              <span className="text-accent">{s.label}</span>{" "}
              <span className="text-muted-foreground">{s.reason}</span>
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/quick-add"
        className="mt-8 flex items-center justify-between gap-4 rounded-[28px] px-6 py-5 text-left"
        style={{
          background: "linear-gradient(100deg, var(--clay), oklch(0.72 0.17 45))",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <span className="min-w-0">
          <span className="block font-serif text-[24px] leading-none text-primary-foreground">
            Quick Add
          </span>
          <span className="mt-2 block text-[12px] leading-snug text-primary-foreground/85">
            The fastest way to teach Ciatta something new.
          </span>
        </span>
        <span aria-hidden="true" className="text-[18px] text-primary-foreground/80">
          →
        </span>
      </Link>

      <div className="mt-7 flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">Or teach another way</span>
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

