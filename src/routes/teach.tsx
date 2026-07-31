import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Composer } from "@/components/ciatta/composer";
import { QuickAddSheet } from "@/components/ciatta/quick-add-sheet";
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



function TeachPage() {
  const router = useRouter();
  const { latest } = useCheckIns();
  const { events, addEvent } = useQuickAddEvents();
  const narrative = buildNarrative(latest, events);
  const suggestions = buildTeachSuggestions(events, narrative.confidence.value);
  const [saved, setSaved] = useState(false);
  /** Quick Add lives inside this screen: a sheet over the current question. */
  const [sheet, setSheet] = useState<{ category?: string; reason?: string } | null>(null);
  /** The short "✓ Flow: Moderate" line shown beneath the question. */
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const share = (text: string) => {
    addEvent({
      category: "Note",
      value: text,
      timestamp: new Date().toISOString(),
      metadata: { Note: text },
    });
    setSaved(true);
    window.setTimeout(() => router.navigate({ to: "/" }), 1400);
  };

  /** A Quick Add is just another answer: confirm it, then move the conversation on. */
  const logged = (summary: string) => {
    setConfirmed(summary);
    window.setTimeout(() => setConfirmed(null), 2400);
  };

  if (saved) {
    return (
      <div className="animate-dissolve flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <Understanding size="hero" confidence={narrative.confidence.value} />
        <h1 className="mt-8 font-serif text-[28px] leading-tight">Got it.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Tomorrow's understanding just became a little clearer.
        </p>
      </div>
    );
  }


  return (
    <div className="flex min-h-full flex-col px-7 pt-6 pb-2">
      <div className="flex flex-1 items-center justify-center py-2">
        <Understanding size="hero" confidence={narrative.confidence.value} />
      </div>

      <h1 className="font-serif text-[32px] leading-[1.12] tracking-[-0.015em]">
        What happened today?
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{confidenceLine()}</p>

      {confirmed && (
        <p className="animate-dissolve mt-3 flex items-center gap-2 text-[13px] leading-none text-accent">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m5 12.5 4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {confirmed}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-7">
          <p className="label-caps">Start with one of these</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.category}
                type="button"
                onClick={() => {
                  haptic("tap");
                  setSheet({ category: s.category, reason: s.reason, step: s.step });
                }}
                className="animate-in fade-in inline-flex h-[38px] items-center rounded-full bg-background px-4 text-[14px] leading-none text-foreground shadow-soft ring-1 ring-border/70 transition-all duration-200 active:scale-[0.97] active:bg-secondary"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}



      <button
        type="button"
        onClick={() => setSheet({})}
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
          ↑
        </span>
      </button>


      <div className="mt-7">
        <Composer
          label="Share anything else"
          placeholder="Tell me anything that might help explain today..."
          onSubmit={share}
        />
      </div>

      <QuickAddSheet
        open={sheet !== null}
        presetCategory={sheet?.category}
        reason={sheet?.reason}
        onClose={() => setSheet(null)}
        onLogged={logged}
      />
    </div>
  );
}


