import { useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { usePriorities } from "@/lib/ciatta-store";
import { signOut } from "@/lib/onboarding-store";
import { useIdentity } from "@/lib/profile-store";
import { useProfile, type Area, type SourceRow, type Understanding } from "@/lib/profile-data";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Profile — Who Ciatta understands you to be" },
      {
        name: "description",
        content:
          "A living portrait of what Ciatta understands about you: how long it has been learning, what it has begun to see, and what it is still discovering.",
      },
      { property: "og:title", content: "Profile — Ciatta" },
      {
        property: "og:description",
        content: "A living portrait of who Ciatta currently understands you to be.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

/* --------------------------------------------------- learning-state language */

/** Natural learning states instead of percentages. */
function learningState(v: number) {
  if (v >= 80) return "Well understood";
  if (v >= 60) return "Connections forming";
  if (v >= 35) return "Beginning to understand";
  if (v >= 15) return "Still listening";
  return "Nothing to say yet";
}

/* ---------------------------------------------------------------- primitives */

function SectionTitle({ children, note }: { children: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="label-caps">{children}</p>
      {note && <span className="text-[12px] text-fog">{note}</span>}
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
    <div className="mt-4 space-y-5">
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
  action = "Teach me",
}: {
  line: string;
  body: string;
  action?: string;
}) {
  return (
    <div className="mt-4">
      <p className="font-serif text-[20px] leading-snug">{line}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      <Link to="/teach" className="mt-4 inline-flex items-center gap-1.5 text-[15px] text-accent">
        {action}
        <span aria-hidden="true">{"\u203A"}</span>
      </Link>
    </div>
  );
}

function ExampleNote({ children }: { children: string }) {
  return <p className="mt-3 text-[13px] leading-relaxed text-fog italic">{children}</p>;
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

const pressable = "transition-opacity active:opacity-60 focus-visible:outline-none";

/** Hairline-separated stack — no card, no border box. */
function Stack({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 divide-y divide-border/70">{children}</div>;
}

function Note({ children }: { children: string }) {
  return <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{children}</p>;
}

function MicroLabel({ children }: { children: string }) {
  return <p className="mt-5 text-[12px] tracking-[0.08em] text-fog uppercase">{children}</p>;
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((s, i) => (
        <span key={s} className="text-[13px] text-muted-foreground">
          {s}
          {i < items.length - 1 && (
            <span aria-hidden="true" className="ml-3 text-fog">
              &middot;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ the portrait */

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * One coherent portrait, synthesised from the understanding model already in
 * place — no new inference, no percentages surfaced.
 */
function buildPortrait(understandings: Understanding[], areas: Area[], focus: string): string {
  const [lead, second] = understandings;
  const refining = areas
    .filter((a) => a.confidence < 80)
    .slice(0, 2)
    .map((a) => a.name.toLowerCase());

  const parts: string[] = [];

  if (lead) parts.push(lead.summary);
  if (second)
    parts.push(
      `I'm also seeing that ${lowerFirst(second.title.replace(/\.$/, ""))}, though I'm still learning how those changes connect.`,
    );

  const watching = refining.length ? refining.join(" and ") : focus.toLowerCase();
  parts.push(
    `Right now I'm paying closest attention to your ${watching}, because those relationships may explain more of your health over time.`,
  );

  return parts.join(" ");
}

/* ------------------------------------------------------------------- areas */

function AreaBlock({ a, open, onToggle }: { a: Area; open: boolean; onToggle: () => void }) {
  return (
    <div className="py-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 text-left ${pressable}`}
      >
        <span className="text-[16px]">{a.name}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[13px] text-muted-foreground">{learningState(a.confidence)}</span>
          <Chevron open={open} />
        </span>
      </button>
      <Reveal open={open}>
        <div className="pt-3 pb-1">
          <p className="text-[15px] leading-relaxed">{a.detail}</p>

          <MicroLabel>What&rsquo;s moved lately</MicroLabel>
          <Note>{a.recentChange}</Note>

          {a.evidence.length > 0 && (
            <>
              <MicroLabel>What I&rsquo;m going on</MicroLabel>
              <Tags items={a.evidence} />
            </>
          )}

          <Link
            to="/quick-add"
            search={{ category: undefined, reason: undefined }}
            className="mt-5 inline-flex items-center gap-1.5 text-[15px] text-accent"
          >
            Tell me about your {a.name.toLowerCase()}
            <span aria-hidden="true">{"\u203A"}</span>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* ----------------------------------------------------------- learning from */

function SourceBlock({ s, open, onToggle }: { s: SourceRow; open: boolean; onToggle: () => void }) {
  if (!s.active) {
    return (
      <div className="flex items-center justify-between gap-4 py-3.5">
        <span className="text-[16px] text-muted-foreground">{s.name}</span>
        <span className="text-[13px] text-fog">Coming soon</span>
      </div>
    );
  }
  return (
    <div className="py-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 text-left ${pressable}`}
      >
        <span className="text-[16px]">{s.name}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[13px] text-muted-foreground">{s.status}</span>
          <Chevron open={open} />
        </span>
      </button>
      <Reveal open={open}>
        <p className="pt-2.5 pb-1 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
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
    <div className="mt-2 divide-y divide-border/70">
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
            className={`flex touch-none items-center gap-3 bg-background py-3.5 text-[16px] transition-transform duration-200 ease-out ${
              isDragging ? "relative z-10 scale-[1.02]" : ""
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
        className={`shrink-0 self-start text-[14px] text-accent ${pressable}`}
      >
        Edit
      </Link>
    </header>
  );
}

/* -------------------------------------------------------------------- page */

function ProfilePage() {
  const profile = useProfile();
  const { priorities, reorder } = usePriorities(profile.defaultPriorities);

  const [openArea, setOpenArea] = useState<string | null>(null);
  const [openMilestone, setOpenMilestone] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const { views: engine } = useEngine();

  if (!profile.hydrated) return <ProfileSkeleton />;

  const since = profile.snapshot.find((s) => s.id === "learning-since")?.value ?? "Today";
  const focus = profile.snapshot.find((s) => s.id === "next")?.value ?? "Recovery";
  // Profile is the relationship summary the engine holds; the local synthesis
  // stands in until it answers.
  const portrait = engine?.profile.summary ?? buildPortrait(profile.understandings, profile.areas, focus);
  const refining = profile.areas.filter((a) => a.confidence < 80).slice(0, 4);
  const learningNext = refining.length ? refining : profile.areas.slice(0, 3);

  return (
    <div className="pb-10">
      <ProfileHeader since={since} />

      {/* What I'm beginning to understand — one portrait, not a dashboard */}
      <section className="mt-9 px-6">
        <SectionTitle>What I&rsquo;m beginning to understand</SectionTitle>
        {profile.hasData ? (
          <p className="mt-4 font-serif text-[22px] leading-[1.45] tracking-[-0.01em]">
            {portrait}
          </p>
        ) : (
          <>
            <Invitation
              line="I don't understand you well enough to say yet."
              body={`I'd rather wait than guess. ${
                profile.observationCount === 0
                  ? "Nothing shared yet."
                  : `${profile.observationCount} things shared so far.`
              } Below is what my understanding will sound like once I have one.`}
              action="Teach me something"
            />
            <p className="mt-6 font-serif text-[20px] leading-[1.45] text-muted-foreground">
              {portrait}
            </p>
            <ExampleNote>An example only. Yours will replace it as I learn you.</ExampleNote>
          </>
        )}
      </section>

      {/* What I'm learning next — only what's actively being refined */}
      <section className="mt-11 px-6">
        <SectionTitle>What I&rsquo;m learning next</SectionTitle>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          These are the relationships I&rsquo;m actively refining right now.
        </p>
        <Stack>
          {learningNext.map((a) => (
            <AreaBlock
              key={a.name}
              a={a}
              open={openArea === a.name}
              onToggle={() => setOpenArea((cur) => (cur === a.name ? null : a.name))}
            />
          ))}
        </Stack>
      </section>

      {/* Our story */}
      <section className="mt-10 px-6">
        <SectionTitle>Our story</SectionTitle>
        {profile.timeline.length <= 1 ? (
          <Invitation
            line="Nothing to look back on yet."
            body="Each time my understanding of you shifts, I'll remember the moment here."
            action="Teach me something"
          />
        ) : (
          <ol className="mt-4 space-y-1 border-l border-border pl-5">
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
                    className="-mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-opacity active:opacity-60"
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
                        ? `This is where we are right now. I'm paying closest attention to ${focus.toLowerCase()}, and the next few things you share will move this line.`
                        : `By this point I'd seen the same thing enough times to change how I read your days. Everything after ${t.when} I understood with this in mind.`}
                    </p>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* What matters most */}
      <section className="mt-10 px-6">
        <SectionTitle note="Drag to reorder">What matters most</SectionTitle>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          I pay attention everywhere, but hardest to what&rsquo;s near the top. Move something up
          and I&rsquo;ll lean toward it.
        </p>
        <PriorityList priorities={priorities} reorder={reorder} />
      </section>

      {/* Learning from */}
      <section className="mt-10 px-6">
        <SectionTitle>Learning from</SectionTitle>
        <Stack>
          {profile.sources.map((s) => (
            <SourceBlock
              key={s.id}
              s={s}
              open={openSource === s.id}
              onToggle={() => setOpenSource((cur) => (cur === s.id ? null : s.id))}
            />
          ))}
        </Stack>
      </section>

      {/* Settings */}
      <section className="mt-10 px-6">
        <SectionTitle>Settings</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <SettingsLink section="notifications" label="Notifications" />
          <SettingsLink section="appearance" label="Appearance" />
          <SettingsLink section="apps" label="Connected apps" />
        </div>
      </section>

      {/* Account */}
      <section className="mt-10 px-6">
        <SectionTitle>Account</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <SignOutRow />
          <SettingsLink section="privacy" label="Privacy" />
          <SettingsLink section="help" label="Help" />
          <SettingsLink section="about" label="About Ciatta" />
          <SettingsLink section="legal" label="Legal" />
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
          What I understand about you belongs to you. It is never sold, and can always be exported
          or permanently deleted.
        </p>
      </section>
    </div>
  );
}

function SignOutRow() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        signOut();
        navigate({ to: "/onboarding", replace: true });
      }}
      className={`flex w-full items-center justify-between gap-4 py-3.5 text-left text-[16px] ${pressable}`}
    >
      Sign out
      <Chevron />
    </button>
  );
}

function SettingsLink({ section, label }: { section: string; label: string }) {
  return (
    <Link
      to="/profile/settings/$section"
      params={{ section }}
      className={`flex w-full items-center justify-between gap-4 py-3.5 text-left text-[16px] ${pressable}`}
    >
      {label}
      <Chevron />
    </Link>
  );
}

/** The portrait's silhouette, held while stored understanding is read. */
function ProfileSkeleton() {
  return (
    <div className="pb-10" aria-busy="true" aria-live="polite">
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

      <section className="mt-8 space-y-3 px-6">
        <Bar w="90%" h={22} />
        <Bar w="70%" h={22} />
        <Bar w="84%" h={12} />
      </section>

      <section className="mt-10 px-6">
        <SectionTitle>What I&rsquo;ve begun to understand</SectionTitle>
        <div className="mt-4 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Bar w="86%" h={20} />
              <Bar w="52%" h={20} />
              <Bar w="34%" h={12} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 px-6">
        <SectionTitle>Where we are</SectionTitle>
        <SkeletonRows rows={6} />
      </section>

      <section className="mt-10 px-6">
        <SectionTitle>What matters most</SectionTitle>
        <SkeletonRows rows={4} />
      </section>
    </div>
  );
}
