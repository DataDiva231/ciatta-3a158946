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
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">{children}</div>
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
    <div className="px-6 pt-6 pb-10">
      {/* Act one — something became clearer. */}
      <section id="discovery" className="animate-dissolve scroll-mt-6">
        <ActTitle tone="clay">Something became clearer.</ActTitle>
        <p className="mt-3 text-[15px] leading-[1.6]">
          <Statement text={story.shift.statement} keyword={story.shift.keyword} />
        </p>

        <Card>
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <Caps>{story.shift.beforeLabel}</Caps>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">
                {story.shift.before}
              </p>
            </div>
            <span aria-hidden="true" className="pt-6 text-[14px] text-muted-foreground">
              →
            </span>
            <div className="min-w-0 flex-1">
              <Caps tone="clay">{story.shift.todayLabel}</Caps>
              <p className="mt-2 text-[13.5px] leading-[1.55]">{story.shift.today}</p>
            </div>
          </div>
        </Card>
      </section>

      <span className="my-8 block h-px w-full bg-border" />

      {/* Act two — why it changed. */}
      <section>
        <ActTitle tone="clay">Why it changed.</ActTitle>
        <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">
          {story.why.body}
        </p>
        <Card>
          <div className="flex items-start gap-2.5">
            <span className="pt-1.5">
              <Dot tone="clay" size={8} />
            </span>
            <p className="text-[13.5px] leading-[1.55]">{story.why.unlock}</p>
          </div>
        </Card>
      </section>

      <span className="my-8 block h-px w-full bg-border" />

      {/* Act three — what's becoming clearer next. */}
      <section>
        <ActTitle tone="moss">What's becoming clearer next.</ActTitle>
        {story.next.length ? (
          <Card>
            <div className="divide-y divide-border">
              {story.next.map((n, i) => (
                <div key={n.id} className={i === 0 ? "pb-4" : "py-4 last:pb-0"}>
                  <div className="flex items-start gap-2.5">
                    <span className="pt-1.5">
                      <Dot tone={n.tone} size={8} />
                    </span>
                    <p className="min-w-0 flex-1 text-[13.5px] leading-[1.5] font-medium">
                      {n.body}
                    </p>
                    <div className="shrink-0 text-right">
                      <p
                        className="text-[14px] leading-none tabular-nums"
                        style={{ color: TONE[n.tone] }}
                      >
                        {n.confidence}%
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">confidence</p>
                    </div>
                  </div>
                  <div className="mt-3 h-[3px] w-full rounded-full bg-border">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${n.confidence}%`, background: TONE[n.tone] }}
                    />
                  </div>
                  <p className="mt-2 text-[11.5px] text-muted-foreground">{n.need}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <p className="mt-3 text-[13px] leading-[1.7] text-muted-foreground">
            Ciatta is still watching. What it's close to understanding appears here first.
          </p>
        )}
      </section>

      <span className="my-8 block h-px w-full bg-border" />

      {/* Act four — your story. */}
      <section>
        <ActTitle tone="stone-blue">Your story.</ActTitle>
        {story.chapters.length ? (
          <div className="-mx-6 mt-4 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {story.chapters.map((c) => (
              <article
                key={c.id}
                className="w-[43%] min-w-[136px] shrink-0 rounded-2xl border border-border bg-card p-4"
              >
                <p className="flex items-center gap-2">
                  <Dot tone={c.tone} size={7} />
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: TONE[c.tone] }}
                  >
                    {c.month}
                  </span>
                </p>
                <p className="mt-2.5 text-[13px] leading-[1.5] text-muted-foreground">
                  {c.note}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-[1.7] text-muted-foreground">
            Your story begins with your first log.
          </p>
        )}
      </section>

      {/* The quiet understanding line. */}
      <Link
        to="/teach"
        className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4"
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

      {!story.hasData && story.hydrated ? (
        <p className="mt-6 text-[12px] leading-[1.7] text-muted-foreground">
          This is an example story. Teach Ciatta a few more times and Journey starts
          writing your own.
        </p>
      ) : null}
    </div>
  );
}
