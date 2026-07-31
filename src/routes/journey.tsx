import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import type { OrbTone } from "@/components/ciatta/discovery-orb";
import { useIdentity } from "@/lib/profile-store";
import { useJourneyStory } from "@/lib/journey-story";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey — Your story is becoming clearer" },
      {
        name: "description",
        content:
          "An edited narrative of understanding: what became clearer, why it changed, what's becoming clearer next, and how your story has evolved.",
      },
      { property: "og:title", content: "Journey — Ciatta" },
      {
        property: "og:description",
        content: "Not a feed. Not a log. An edited narrative of understanding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

/** Accent dots and values only — everything else stays neutral. */
const TONE: Record<OrbTone, string> = {
  clay: "var(--clay)",
  moss: "var(--moss)",
  wheat: "var(--wheat)",
  "stone-blue": "var(--stone-blue)",
  iris: "var(--clay)",
};

function Dot({ tone, size = 9 }: { tone: OrbTone; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: TONE[tone] }}
    />
  );
}

/** Section opener: a small colored dot beside a serif line. */
function ActTitle({ tone, children }: { tone: OrbTone; children: string }) {
  return (
    <h2 className="flex items-center gap-2.5 font-serif text-[22px] leading-[1.2] tracking-[-0.01em]">
      <Dot tone={tone} />
      {children}
    </h2>
  );
}

/** The statement, with only its closing words carrying the accent. */
function Statement({ text, keyword }: { text: string; keyword: string }) {
  const at = text.lastIndexOf(keyword);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span style={{ color: TONE.clay }}>{text.slice(at)}</span>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-5">{children}</div>
  );
}

function Caps({ tone, children }: { tone?: OrbTone; children: string }) {
  return (
    <p
      className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
      style={tone ? { color: TONE[tone] } : undefined}
    >
      {children}
    </p>
  );
}

function JourneyPage() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const story = useJourneyStory();
  const { identity } = useIdentity();
  const firstName = identity.name.split(" ")[0];

  useEffect(() => {
    if (hash !== "discovery") return;
    document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="px-6 pt-10 pb-16">
      {/* Act one — the emotional centerpiece. */}
      <section id="discovery" className="animate-dissolve scroll-mt-6">
        <p className="flex items-center gap-2.5">
          <Dot tone="clay" size={8} />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.16em]"
            style={{ color: TONE.clay }}
          >
            Something became clearer
          </span>
        </p>
        <h1 className="mt-6 font-serif text-[32px] leading-[1.14] tracking-[-0.015em]">
          <Statement text={story.shift.statement} keyword={story.shift.keyword} />
        </h1>

        <div className="mt-10 space-y-7">
          <div>
            <Caps>{story.shift.beforeLabel}</Caps>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-muted-foreground">
              {story.shift.before}
            </p>
          </div>
          <div>
            <Caps tone="clay">{story.shift.todayLabel}</Caps>
            <p className="mt-2.5 text-[16px] leading-[1.55]">{story.shift.today}</p>
          </div>
        </div>
      </section>

      <span className="my-14 block h-px w-full bg-border" />

      {/* Act two — the quiet explanation. */}
      <section>
        <ActTitle tone="clay">Why it changed.</ActTitle>
        <div className="mt-5 space-y-4 text-[14px] leading-[1.65] text-muted-foreground">
          <p>{story.why.what}</p>
          <p>{story.why.why}</p>
        </div>
        <Card>
          <div className="flex items-start gap-3">
            <span className="pt-1.5">
              <Dot tone="clay" size={7} />
            </span>
            <p className="text-[13.5px] leading-[1.6]">{story.why.matters}</p>
          </div>
        </Card>
      </section>

      <span className="my-14 block h-px w-full bg-border" />

      {/* Act three — future curiosity. */}
      <section>
        <ActTitle tone="moss">What's becoming clearer next.</ActTitle>
        {story.next.length ? (
          <div className="mt-6 space-y-8">
            {story.next.map((n) => (
              <div key={n.id}>
                <p className="font-serif text-[20px] leading-[1.3] tracking-[-0.01em]">
                  {n.body}
                </p>
                <p className="mt-3 text-[11.5px] text-muted-foreground">
                  {n.need} · {n.confidence}% confidence
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[14px] leading-[1.7] text-muted-foreground">
            Ciatta is still listening. What it's close to understanding appears here first.
          </p>
        )}
      </section>

      <span className="my-14 block h-px w-full bg-border" />

      {/* Act four — reflection. */}
      <section>
        <ActTitle tone="stone-blue">Your story.</ActTitle>
        {story.chapters.length ? (
          <div className="-mx-6 mt-6 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {story.chapters.map((c) => (
              <article
                key={c.id}
                className="w-[62%] min-w-[180px] shrink-0 rounded-2xl border border-border bg-card p-5"
              >
                <p className="flex items-center gap-2">
                  <Dot tone={c.tone} size={7} />
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: TONE[c.tone] }}
                  >
                    {c.chapter}
                  </span>
                </p>
                <p className="mt-3.5 text-[13.5px] leading-[1.6] text-muted-foreground">
                  {c.note}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[14px] leading-[1.7] text-muted-foreground">
            Your story begins with your first log.
          </p>
        )}
      </section>

      {/* The quiet understanding line. */}
      <Link
        to="/teach"
        className="mt-14 flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-5"
      >
        <span className="text-[13.5px]">Understanding</span>
        <span
          className="font-serif text-[22px] leading-none tabular-nums"
          style={{ color: TONE.clay }}
        >
          {story.understanding}%
        </span>
        <span className="ml-auto flex items-center gap-2 text-[12.5px] text-muted-foreground">
          Keep going, {firstName}.
          <span aria-hidden="true">→</span>
        </span>
      </Link>

      <p className="mt-10 max-w-[30ch] text-[13px] leading-[1.75] text-muted-foreground">
        {story.closing}
      </p>
    </div>
  );
}

