import { useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { usePriorities } from "@/lib/ciatta-store";
import { useIdentity } from "@/lib/profile-store";
import { useProfile, type Area, type Understanding } from "@/lib/profile-data";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Profile — What Ciatta understands about you" },
      {
        name: "description",
        content:
          "A living summary of what Ciatta has learned about your body: understandings, health snapshot, connected sources, and your preferences.",
      },
      { property: "og:title", content: "Profile — Ciatta" },
      {
        property: "og:description",
        content: "The living portrait of what Ciatta understands about you.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

/* ---------------------------------------------------------------- primitives */

function SectionTitle({ children, note }: { children: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="label-caps">{children}</p>
      {note && <span className="text-[12px] text-fog">{note}</span>}
    </div>
  );
}

/** A grouped iOS-style block: hairline card, rows divided inside. */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-surface">
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Bar({ w = "100%", h = 14 }: { w?: string; h?: number }) {
  return (
    <span
      aria-hidden="true"
      className="block animate-pulse rounded-full bg-secondary"
      style={{ width: w, height: h }}
    />
  );
}

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-surface px-4 py-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-6">
          <Bar w={`${38 + ((i * 13) % 26)}%`} />
          <Bar w={`${22 + ((i * 7) % 14)}%`} h={12} />
        </div>
      ))}
    </div>
  );
}

function Invitation({
  line,
  body,
  action = "Teach Ciatta",
}: {
  line: string;
  body: string;
  action?: string;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-surface px-4 py-5">
      <p className="font-serif text-[19px] leading-snug">{line}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      <Link
        to="/teach"
        className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-[15px] text-accent"
      >
        {action}
        <span aria-hidden="true">{"\u203A"}</span>
      </Link>
    </div>
  );
}

function ExampleNote({ children }: { children: string }) {
  return <p className="mt-2.5 px-1 text-[13px] leading-relaxed text-fog italic">{children}</p>;
}

/** Static, non-tappable row: no chevron, no press state. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
      <span className="text-[15px]">{label}</span>
      <span className="text-[14px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 shrink-0 text-[15px] leading-none text-fog transition-transform duration-300 ease-out ${
        open ? "-rotate-90" : ""
      }`}
    >
      {"\u203A"}
    </span>
  );
}

/** Inline expansion that keeps the row anchored, so scroll position never jumps. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

const pressable =
  "transition-colors hover:bg-secondary/60 active:bg-secondary focus-visible:outline-none focus-visible:bg-secondary";

function ConfidenceBar({ value }: { value: number }) {
  return (
    <span
      aria-hidden="true"
      className="mt-2 block h-[3px] w-full max-w-[180px] overflow-hidden rounded-full bg-secondary"
    >
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

/* ------------------------------------------------------------ understanding */

function UnderstandingBlock({
  u,
  open,
  onToggle,
  lead,
}: {
  u: Understanding;
  open: boolean;
  onToggle: () => void;
  lead: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-start justify-between gap-4 px-4 py-4 text-left ${pressable}`}
      >
        <span className="min-w-0">
          <span
            className={`block font-serif leading-[1.25] tracking-[-0.01em] ${
              lead ? "text-[21px]" : "text-[18px]"
            }`}
          >
            {u.title}
          </span>
          <span className="mt-2 flex items-center gap-2 text-[13px]">
            <span className="text-accent">{u.tier}</span>
            <span aria-hidden="true" className="text-fog">
              &middot;
            </span>
            <span className="text-muted-foreground">{u.confidence}%</span>
          </span>
          <ConfidenceBar value={u.confidence} />
        </span>
        <Chevron open={open} />
      </button>

      <Reveal open={open}>
        <div className="px-4 pb-5">
          <p className="text-[15px] leading-relaxed">{u.summary}</p>

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">Why I think this</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {u.whyThisMatters}
          </p>

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">What I'm going on</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {u.signals.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border px-3 py-1.5 text-[13px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">
            What I'm still learning
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {u.stillLearning}
          </p>

          <Link
            to="/teach"
            className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[15px] text-accent"
          >
            Teach me more

            <span aria-hidden="true">{"\u203A"}</span>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------- areas */

function AreaBlock({ a, open, onToggle }: { a: Area; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left ${pressable}`}
      >
        <span className="text-[15px]">{a.name}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[14px] text-muted-foreground">{a.tier}</span>
          <Chevron open={open} />
        </span>
      </button>
      <Reveal open={open}>
        <div className="px-4 pb-5">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-accent">{a.confidence}% sure so far</span>
          </div>
          <ConfidenceBar value={a.confidence} />
          <p className="mt-3 text-[15px] leading-relaxed">{a.detail}</p>
          <p className="mt-4 text-[13px] font-medium tracking-wide uppercase">What's moved lately</p>

          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {a.recentChange}
          </p>
          {a.evidence.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {a.evidence.map((e) => (
                <span
                  key={e}
                  className="rounded-full border border-border px-3 py-1.5 text-[13px] text-muted-foreground"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
          <Link
            to="/quick-add"
            className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[15px] text-accent"
          >
            Log something for {a.name.toLowerCase()}
            <span aria-hidden="true">{"\u203A"}</span>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------- preferences */

/** Pointer drag-and-drop reordering with a live preview of the new order. */
function PriorityList({
  priorities,
  reorder,
}: {
  priorities: string[];
  reorder: (from: number, to: number) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const indexAt = (y: number) => {
    for (let i = 0; i < rowRefs.current.length; i += 1) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return rowRefs.current.length - 1;
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-surface">
      <div className="divide-y divide-border">
        {priorities.map((p, i) => {
          const isDragging = dragging === i;
          const shift =
            dragging === null || over === null || isDragging
              ? 0
              : dragging < i && i <= over
                ? -1
                : dragging > i && i >= over
                  ? 1
                  : 0;
          return (
            <div
              key={p}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={`flex touch-none items-center gap-3 bg-surface px-4 py-3.5 text-[15px] transition-transform duration-200 ease-out ${
                isDragging ? "relative z-10 scale-[1.02] shadow-lg" : ""
              }`}
              style={{ transform: `translateY(${shift * 100}%)` }}
            >
              <span className="w-4 text-[13px] text-fog tabular-nums">{i + 1}</span>
              <span className="flex-1">{p}</span>
              <span className="flex items-center gap-4 text-[13px] text-muted-foreground">
                <button
                  type="button"
                  aria-label={`Move ${p} up`}
                  disabled={i === 0}
                  onClick={() => reorder(i, i - 1)}
                  className="rounded-full px-1 transition-opacity disabled:opacity-25"
                >
                  {"\u2303"}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${p} down`}
                  disabled={i === priorities.length - 1}
                  onClick={() => reorder(i, i + 1)}
                  className="rotate-180 rounded-full px-1 transition-opacity disabled:opacity-25"
                >
                  {"\u2303"}
                </button>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag ${p} to reorder`}
                  onPointerDown={(e) => {
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    setDragging(i);
                    setOver(i);
                  }}
                  onPointerMove={(e) => {
                    if (dragging === null) return;
                    setOver(indexAt(e.clientY));
                  }}
                  onPointerUp={() => {
                    if (dragging !== null && over !== null && dragging !== over)
                      reorder(dragging, over);
                    setDragging(null);
                    setOver(null);
                  }}
                  onPointerCancel={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className="cursor-grab touch-none px-1 text-fog select-none active:cursor-grabbing"
                >
                  {"\u2261"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function ProfileHeader({ since }: { since: string }) {
  const { identity } = useIdentity();

  return (
    <header className="flex items-center gap-4 px-6 pt-8">
      {identity.photo ? (
        <img
          src={identity.photo}
          alt={`${identity.name}'s profile photo`}
          className="h-[64px] w-[64px] shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-[24px] text-muted-foreground"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--clay) 22%, transparent), transparent 70%)",
          }}
        >
          {identity.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-serif text-[26px] leading-tight tracking-[-0.01em]">
          {identity.name}
        </h1>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">
          {since === "Today" ? "I started learning you today" : `Learning you since ${since}`}
        </p>
      </div>
      <Link
        to="/profile/edit"
        className="shrink-0 rounded-full border border-border px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
      >
        Edit
      </Link>
    </header>
  );
}

/* -------------------------------------------------------------------- page */

function ProfilePage() {
  const profile = useProfile();
  const { identity } = useIdentity();
  const { priorities, reorder } = usePriorities(profile.defaultPriorities);

  const [openUnderstanding, setOpenUnderstanding] = useState<string | null>(
    profile.understandings[0]?.id ?? null,
  );
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [openMilestone, setOpenMilestone] = useState<string | null>(null);

  if (!profile.hydrated) return <ProfileSkeleton />;

  const since = profile.snapshot.find((s) => s.id === "learning-since")?.value ?? "today";
  const focus = profile.snapshot.find((s) => s.id === "next")?.value ?? "Recovery";

  return (
    <div className="pb-8">
      <ProfileHeader since={since} />

      {/* The framing: this page is the understanding, not a record */}
      <section className="mt-7 px-6">
        <p className="font-serif text-[24px] leading-[1.25] tracking-[-0.01em]">
          Here&rsquo;s what I&rsquo;m beginning to understand about you.
        </p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
          This isn&rsquo;t a record of what you&rsquo;ve told me &mdash; it&rsquo;s what I&rsquo;ve
          made of it so far. It changes as I learn.
        </p>
      </section>

      {/* What you've told me */}
      <section className="mt-8 px-6">
        <SectionTitle note="You told me this">What I&rsquo;m working from</SectionTitle>
        <Group>
          <Row label="Life stage" value={identity.lifeStage} />
          <Row
            label="Goals"
            value={identity.goals.length ? identity.goals.join(", ") : "Not set"}
          />
          <Row label="Paying closest attention to" value={focus} />
          <Row label="Where we are" value={profile.observationSummary} />
        </Group>
        <p className="mt-3 px-1 text-[14px] leading-relaxed text-muted-foreground">
          {profile.story[0]}
        </p>
      </section>

      {/* Your understanding — the centerpiece */}
      <section className="mt-9 px-6">
        <SectionTitle
          note={
            profile.understandings.length === 1
              ? "1 still forming"
              : `${profile.understandings.length} still forming`
          }
        >
          What I&rsquo;m beginning to understand
        </SectionTitle>

        {!profile.hasData && (
          <Invitation
            line="I don't understand you well enough to say yet."
            body={`I'd rather wait than guess. ${
              profile.observationCount === 0
                ? "Nothing logged yet."
                : `${profile.observationCount} logged so far.`
            } Below is what an understanding will look like once I have one.`}
            action="Teach me something"
          />
        )}
        <Group>
          {profile.understandings.map((u, i) => (
            <UnderstandingBlock
              key={u.id}
              u={u}
              lead={i === 0}
              open={openUnderstanding === u.id}
              onToggle={() => setOpenUnderstanding((cur) => (cur === u.id ? null : u.id))}
            />
          ))}
        </Group>
        {!profile.hasData && (
          <ExampleNote>
            Examples only. Yours will replace them as I learn you.
          </ExampleNote>
        )}
      </section>


      {/* Health */}
      <section className="mt-9 px-6">
        <SectionTitle>How my understanding stands</SectionTitle>

        <p className="mt-4 mb-0 px-1 text-[13px] text-muted-foreground">
          Where I am with you right now
        </p>
        <Group>
          {profile.snapshot.map((s) => (
            <Link
              key={s.id}
              to="/profile/metric/$id"
              params={{ id: s.id }}
              className={`flex items-baseline justify-between gap-4 px-4 py-3.5 ${pressable}`}
            >
              <span className="text-[15px]">{s.label}</span>
              <span className="flex shrink-0 items-baseline gap-2 text-[14px] text-muted-foreground">
                {s.value}
                <Chevron />
              </span>
            </Link>
          ))}
        </Group>
        {!profile.hasData && (
          <ExampleNote>Each line fills in from what you log. I don&rsquo;t estimate any of it.</ExampleNote>
        )}

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          What I&rsquo;m still learning, area by area
        </p>
        <Group>
          {profile.areas.map((a) => (
            <AreaBlock
              key={a.name}
              a={a}
              open={openArea === a.name}
              onToggle={() => setOpenArea((cur) => (cur === a.name ? null : a.name))}
            />
          ))}
        </Group>

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          What I&rsquo;m learning from
        </p>


        <Group>
          {profile.sources.map((s) =>
            s.active ? (
              <Link
                key={s.id}
                to="/profile/source/$id"
                params={{ id: s.id }}
                className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left ${pressable}`}
              >
                <span className="text-[15px]">{s.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] text-accent">{s.status}</span>
                  <Chevron />
                </span>
              </Link>
            ) : (
              <div
                key={s.id}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5"
              >
                <span className="text-[15px] text-muted-foreground">{s.name}</span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[12px] text-fog">
                  Coming soon
                </span>
              </div>
            ),
          )}
        </Group>

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          How my understanding changed
        </p>
        {profile.timeline.length <= 1 ? (
          <Invitation
            line="Nothing to look back on yet."
            body="Each time I become more certain about something, I'll note the moment here."
            action="Teach me something"
          />

        ) : (
          <div className="mt-3 rounded-2xl bg-surface px-5 py-5">
            <ol className="space-y-1 border-l border-border pl-5">
              {profile.timeline.map((t) => {
                const key = `${t.label}-${t.when}`;
                const open = openMilestone === key;
                return (
                  <li key={key} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute top-3 -left-[25px] h-[7px] w-[7px] rounded-full ${
                        t.current ? "bg-accent" : "bg-fog"
                      }`}
                    />
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenMilestone((cur) => (cur === key ? null : key))}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
                    >
                      <span>
                        <span className={`block text-[15px] ${t.current ? "text-accent" : ""}`}>
                          {t.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-muted-foreground">
                          {t.when}
                        </span>
                      </span>
                      <Chevron open={open} />
                    </button>
                    <Reveal open={open}>
                      <p className="pb-3 text-[14px] leading-relaxed text-muted-foreground">
                        {t.current
                          ? `This is where I am right now. I'm paying closest attention to ${focus.toLowerCase()}, and the next few logs will move this line.`
                          : `By this point I had seen the same thing enough times to change how I read your days. Everything after ${t.when} I interpreted with this in mind.`}
                      </p>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="mt-9 px-6">
        <SectionTitle note="Drag to reorder">Preferences</SectionTitle>
        <p className="mt-3 px-1 text-[14px] leading-relaxed text-muted-foreground">
          I look everywhere, but I look hardest at what&rsquo;s near the top. Move a topic up and
          I&rsquo;ll lean toward it.
        </p>


        <PriorityList priorities={priorities} reorder={reorder} />

        <Group>
          <SettingsLink section="notifications" label="Notifications" />
          <SettingsLink section="appearance" label="Appearance" />
          <SettingsLink section="apps" label="Connected apps" />
          <SettingsLink section="privacy" label="Privacy" />
        </Group>
      </section>

      {/* Support */}
      <section className="mt-9 px-6">
        <SectionTitle>Support</SectionTitle>
        <Group>
          <SettingsLink section="help" label="Help" />
          <SettingsLink section="about" label="About Ciatta" />
          <SettingsLink section="legal" label="Legal" />
        </Group>
        <p className="mt-4 px-1 text-[13px] leading-relaxed text-muted-foreground">
          Your understanding belongs to you. It is never sold, and can always be exported or
          permanently deleted.
        </p>
      </section>
    </div>
  );
}

function SettingsLink({ section, label }: { section: string; label: string }) {
  return (
    <Link
      to="/profile/settings/$section"
      params={{ section }}
      className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] ${pressable}`}
    >
      {label}
      <Chevron />
    </Link>
  );
}

/** The portrait's silhouette, held while stored understanding is read. */
function ProfileSkeleton() {
  return (
    <div className="pb-8" aria-busy="true" aria-live="polite">
      <header className="flex items-center gap-4 px-6 pt-8">
        <span
          aria-hidden="true"
          className="h-[64px] w-[64px] shrink-0 animate-pulse rounded-full bg-secondary"
        />
        <div className="flex-1 space-y-2">
          <Bar w="62%" h={20} />
          <Bar w="44%" h={12} />
        </div>
      </header>

      <section className="mt-8 px-6">
        <SectionTitle>About me</SectionTitle>
        <SkeletonRows rows={3} />
      </section>

      <section className="mt-9 px-6">
        <SectionTitle>Your understanding</SectionTitle>
        <div className="mt-3 space-y-6 rounded-2xl bg-surface px-4 py-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Bar w="86%" h={20} />
              <Bar w="52%" h={20} />
              <Bar w="34%" h={12} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9 px-6">
        <SectionTitle>Health</SectionTitle>
        <SkeletonRows rows={6} />
        <SkeletonRows rows={4} />
      </section>

      <section className="mt-9 px-6">
        <SectionTitle>Preferences</SectionTitle>
        <SkeletonRows rows={4} />
      </section>
    </div>
  );
}
