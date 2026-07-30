import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryOrb, type OrbTone } from "@/components/ciatta/discovery-orb";
import {
  emergingInsights,
  journeyTimeline,
  recentDiscoveries,
  todaysDiscovery,
  understandingMilestone,
  type Discovery,
} from "@/lib/journey-content";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey — Where curiosity meets time" },
      {
        name: "description",
        content:
          "Ciatta's evolving story of your body: today's discovery, recent discoveries, emerging insights and milestones of understanding.",
      },
      { property: "og:title", content: "Journey — Ciatta" },
      {
        property: "og:description",
        content: "Every day reveals something new about your body.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

const TONE_TEXT: Record<OrbTone, string> = {
  clay: "var(--clay)",
  moss: "var(--moss)",
  "stone-blue": "var(--stone-blue)",
  wheat: "var(--wheat)",
  iris: "oklch(0.66 0.13 300)",
};

/** Small uppercase eyebrow that opens every Journey section. */
function Eyebrow({ children, tone }: { children: string; tone?: OrbTone }) {
  return (
    <p className="label-caps" style={tone ? { color: TONE_TEXT[tone] } : undefined}>
      {children}
    </p>
  );
}

function Rule() {
  return <span className="my-7 block h-px w-full bg-border" />;
}

function Confidence({ value, tone }: { value: number; tone: OrbTone }) {
  return (
    <p
      className="font-serif text-[30px] leading-none font-light"
      style={{ color: TONE_TEXT[tone] }}
    >
      {value}%
    </p>
  );
}

/** A full discovery: headline, orb, and the reasoning beneath it. */
function DiscoveryDetail({ d, eyebrow }: { d: Discovery; eyebrow: string }) {
  return (
    <article>
      <Eyebrow tone={d.tone}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-serif text-[26px] leading-[1.2] font-light tracking-[-0.01em]">
        {d.title}
      </h2>

      <div className="mt-5 flex items-end justify-between gap-6">
        <div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {d.confidenceLabel}
          </p>
          <div className="mt-2">
            <Confidence value={d.confidence} tone={d.tone} />
          </div>
        </div>
        <DiscoveryOrb tone={d.tone} size={78} />
      </div>

      <Rule />

      <Eyebrow tone={d.tone}>Why we noticed</Eyebrow>
      <p className="mt-2.5 text-[14px] leading-[1.65] text-muted-foreground">
        {d.whyWeNoticed}
      </p>

      <Rule />

      <Eyebrow tone={d.tone}>Signals that contributed</Eyebrow>
      <ul className="mt-2.5 space-y-2">
        {d.signals.map((s) => (
          <li key={s} className="text-[14px] leading-[1.65]">
            {s}
          </li>
        ))}
      </ul>

      <Rule />

      <Eyebrow tone={d.tone}>Why this matters</Eyebrow>
      <div className="mt-2.5 space-y-3">
        {d.whyThisMatters.map((p) => (
          <p key={p} className="text-[14px] leading-[1.65] text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <Rule />

      <Eyebrow tone={d.tone}>What to try</Eyebrow>
      <p className="mt-2.5 text-[14px] leading-[1.65] text-muted-foreground">
        {d.whatToTry}
      </p>
    </article>
  );
}

/** A compact discovery row used in the Recent Discoveries list. */
function DiscoveryRow({ d }: { d: Discovery }) {
  return (
    <article className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <h3 className="font-serif text-[19px] leading-[1.3] font-light">{d.title}</h3>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{d.confidenceLabel}</p>
      </div>
      <p
        className="shrink-0 pt-0.5 text-[15px] tabular-nums"
        style={{ color: TONE_TEXT[d.tone] }}
      >
        {d.confidence}%
      </p>
    </article>
  );
}

function JourneyPage() {
  return (
    <div className="px-6 pt-10 pb-10">
      <header>
        <h1 className="font-serif text-[38px] leading-none font-light tracking-[-0.02em]">
          Journey
        </h1>
        <p className="mt-3 text-[15px] font-medium">Where curiosity meets time.</p>
        <p className="mt-3 max-w-[26ch] text-[13px] leading-[1.7] text-muted-foreground">
          Every day reveals something new about your body.
        </p>
      </header>

      <span className="my-9 block h-px w-full border-t border-dotted border-border" />

      <section>
        <DiscoveryDetail d={todaysDiscovery} eyebrow="Today's discovery" />
        <div className="mt-8 border-t border-border pt-5">
          <p className="text-[12px] text-muted-foreground">Help us learn more</p>
          <p className="mt-2 flex items-center justify-between font-serif text-[21px] leading-none font-light">
            Teach Ciatta More
            <span aria-hidden="true" className="text-[15px] text-muted-foreground">
              →
            </span>
          </p>
        </div>
      </section>

      <section className="mt-12">
        <Eyebrow>Recent discoveries</Eyebrow>
        <div className="mt-3 divide-y divide-border border-t border-border">
          {recentDiscoveries.map((d) => (
            <DiscoveryRow key={d.id} d={d} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <Eyebrow>Emerging insights</Eyebrow>
        <div className="mt-3 divide-y divide-border border-t border-border">
          {emergingInsights.map((i) => (
            <article key={i.id} className="flex items-start justify-between gap-6 py-5">
              <div className="min-w-0">
                <p className="font-serif text-[19px] leading-[1.3] font-light">{i.body}</p>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {i.confidenceLabel}
                </p>
                <p className="mt-2 text-[13px] text-accent">Continue teaching Ciatta.</p>
              </div>
              <p
                className="shrink-0 pt-0.5 text-[15px] tabular-nums"
                style={{ color: TONE_TEXT[i.tone] }}
              >
                {i.confidence}%
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <Eyebrow>Understanding milestones</Eyebrow>
        <div className="mt-5 border-t border-border pt-7 text-center">
          <p className="text-[12px] text-muted-foreground">
            {understandingMilestone.label}
          </p>
          <p className="mt-3 flex items-center justify-center gap-4 font-serif text-[28px] leading-none font-light text-moss">
            <span>{understandingMilestone.from}%</span>
            <span aria-hidden="true" className="text-[16px] text-muted-foreground">
              →
            </span>
            <span>{understandingMilestone.to}%</span>
          </p>
          <p className="mx-auto mt-4 max-w-[30ch] text-[13px] leading-[1.7] text-muted-foreground">
            {understandingMilestone.note}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <Eyebrow>Journey timeline</Eyebrow>
        <dl className="mt-3 divide-y divide-border border-t border-border">
          {journeyTimeline.map((t) => (
            <div key={t.month} className="flex items-baseline gap-6 py-4">
              <dt className="w-16 shrink-0 text-[13px] font-medium">{t.month}</dt>
              <dd className="text-[13px] leading-[1.6] text-muted-foreground">{t.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <span className="my-10 block h-px w-full border-t border-dotted border-border" />

      <footer className="pb-2 text-center">
        <p className="mx-auto max-w-[24ch] text-[14px] leading-[1.9] text-muted-foreground">
          You've reached today. Every day adds another chapter to your story. See you
          tomorrow.
        </p>
      </footer>
    </div>
  );
}
