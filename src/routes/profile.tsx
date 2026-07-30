import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { todayKey, useCheckIns, usePriorities } from "@/lib/ciatta-store";
import { useProfile, type Understanding } from "@/lib/profile-data";

export const Route = createFileRoute("/profile")({
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

const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Low mood", "Tender chest", "Brain fog"];
const MOODS = ["Flat", "Even", "Bright"];

const NAME = "Jenny Alvarez";

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
      <p className="font-serif text-[19px] leading-snug font-light">{line}</p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
      <span className="text-[15px]">{label}</span>
      <span className="text-[14px] text-muted-foreground">{value}</span>
    </div>
  );
}

function LinkRow({ label, detail }: { label: string; detail?: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] transition-colors active:bg-secondary"
    >
      {label}
      <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
        {detail}
        <span aria-hidden="true">{"\u203A"}</span>
      </span>
    </button>
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
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="min-w-0">
          <span
            className={`block font-serif font-light leading-[1.25] tracking-[-0.01em] ${
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
          <span
            aria-hidden="true"
            className="mt-2 block h-[3px] w-full max-w-[180px] overflow-hidden rounded-full bg-secondary"
          >
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${u.confidence}%` }}
            />
          </span>
        </span>
        <Chevron open={open} />
      </button>

      <Reveal open={open}>
        <div className="px-4 pb-5">
          <p className="text-[15px] leading-relaxed">{u.summary}</p>

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">Why this matters</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {u.whyThisMatters}
          </p>

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">Evidence</p>
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

          <p className="mt-5 text-[13px] font-medium tracking-wide uppercase">Still learning</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {u.stillLearning}
          </p>

          <Link
            to="/teach"
            className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[15px] text-accent"
          >
            Teach Ciatta more
            <span aria-hidden="true">{"\u203A"}</span>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* --------------------------------------------------------------- check-in */

function CheckInForm() {
  const { saveCheckIn, latest, hydrated } = useCheckIns();
  const [sleepFelt, setSleepFelt] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState("Even");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [cycleStarted, setCycleStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const scale = (label: string, value: number, onChange: (v: number) => void) => (
    <div>
      <p className="label-caps">{label}</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={`h-10 flex-1 rounded-full border text-sm transition-colors ${
              value === n
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:border-fog"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 px-4 pb-5">
      {scale("How sleep felt", sleepFelt, setSleepFelt)}
      {scale("Energy right now", energy, setEnergy)}

      <div>
        <p className="label-caps">Mood</p>
        <div className="mt-2 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              aria-pressed={mood === m}
              className={`h-10 flex-1 rounded-full border text-sm transition-colors ${
                mood === m
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-fog"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label-caps">Anything you're feeling</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
              }
              aria-pressed={symptoms.includes(s)}
              className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
                symptoms.includes(s)
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground hover:border-fog"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 text-[15px]">
        <span>My period started today</span>
        <button
          type="button"
          role="switch"
          aria-checked={cycleStarted}
          onClick={() => setCycleStarted((v) => !v)}
          className={`h-7 w-12 rounded-full border transition-colors ${
            cycleStarted ? "border-accent bg-accent" : "border-border bg-secondary"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-background transition-transform ${
              cycleStarted ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>

      <button
        type="button"
        onClick={() => {
          saveCheckIn({ day: todayKey(), sleepFelt, energy, mood, symptoms, cycleStarted });
          setSaved(true);
        }}
        className="h-12 w-full rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Save check-in
      </button>

      {saved ? (
        <p className="text-center text-[13px] text-moss">
          Saved. Your understanding has been updated.
        </p>
      ) : hydrated && latest ? (
        <p className="text-center text-[13px] text-muted-foreground">
          Last check-in saved {new Date(latest.savedAt).toLocaleString()}.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function ProfileHeader({ since }: { since: string }) {
  return (
    <header className="flex items-center gap-4 px-6 pt-8">
      <span
        aria-hidden="true"
        className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-[24px] font-light text-muted-foreground"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--clay) 22%, transparent), transparent 70%)",
        }}
      >
        {NAME.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-serif text-[26px] leading-tight font-light tracking-[-0.01em]">
          {NAME}
        </h1>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">
          {since === "Just started"
            ? "Understanding begins today"
            : `Understanding since ${since}`}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full border border-border px-3.5 py-2 text-[13px] text-muted-foreground transition-colors active:bg-secondary"
      >
        Edit
      </button>
    </header>
  );
}

/* -------------------------------------------------------------------- page */

function ProfilePage() {
  const profile = useProfile();
  const { priorities, reorder } = usePriorities(profile.defaultPriorities);

  const [openUnderstanding, setOpenUnderstanding] = useState<string | null>(
    profile.understandings[0]?.id ?? null,
  );
  const [openSource, setOpenSource] = useState<string | null>(null);

  if (!profile.hydrated) return <ProfileSkeleton />;

  const since = profile.snapshot.find((s) => s.label === "Learning since")?.value ?? "today";
  const lifeStage = profile.snapshot.find((s) => s.label === "Life stage")?.value ?? "Cycling";
  const focus = profile.snapshot.find((s) => s.label === "Looking at next")?.value ?? "Recovery";

  return (
    <div className="pb-8">
      <ProfileHeader since={since} />

      {/* About me */}
      <section className="mt-8 px-6">
        <SectionTitle>About me</SectionTitle>
        <Group>
          <Row label="Life stage" value={lifeStage} />
          <Row label="Paying attention to" value={focus} />
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
              ? "1 in progress"
              : `${profile.understandings.length} in progress`
          }
        >
          Your understanding
        </SectionTitle>

        {!profile.hasData && (
          <Invitation
            line="Your portrait is still being drawn."
            body={`Ciatta needs a few more moments with you before it can say anything true. ${
              profile.observationCount === 0
                ? "Nothing logged yet."
                : `${profile.observationCount} logged so far.`
            } Below is what an understanding will look like.`}
            action="Teach Ciatta something"
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
            Example understandings. They'll be replaced by your own as you teach Ciatta.
          </ExampleNote>
        )}
      </section>

      {/* Health */}
      <section className="mt-9 px-6">
        <SectionTitle>Health</SectionTitle>

        <p className="mt-4 mb-0 px-1 text-[13px] text-muted-foreground">
          Where your understanding stands
        </p>
        <Group>
          {profile.snapshot.map((s) => (
            <Row key={s.label} label={s.label} value={s.value} />
          ))}
        </Group>
        {!profile.hasData && (
          <ExampleNote>Each line fills in from what you log. Nothing here is estimated.</ExampleNote>
        )}

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          What Ciatta is learning, area by area
        </p>
        <Group>
          {profile.areas.map((a) => (
            <Row key={a.name} label={a.name} value={a.tier} />
          ))}
        </Group>

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          Where the understanding comes from
        </p>

        <Group>
          {profile.sources.map((s) => {
            const open = openSource === s.id;
            return (
              <div key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpenSource((cur) => (cur === s.id ? null : s.id))}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                >
                  <span className="text-[15px]">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-[13px] ${
                        s.active ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                    <Chevron open={open} />
                  </span>
                </button>

                <Reveal open={open}>
                  {s.id === "checkins" ? (
                    <CheckInForm />
                  ) : (
                    <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  )}
                </Reveal>
              </div>
            );
          })}
        </Group>

        <p className="mt-6 px-1 text-[13px] text-muted-foreground">
          How the understanding grew
        </p>
        {profile.timeline.length <= 1 ? (
          <Invitation
            line="Nothing to look back on yet."
            body="Each time Ciatta becomes more certain about something, that moment is recorded here."
            action="Teach Ciatta something"
          />

        ) : (
          <div className="mt-3 rounded-2xl bg-surface px-5 py-5">
            <ol className="space-y-5 border-l border-border pl-5">
              {profile.timeline.map((t) => (
                <li key={`${t.label}-${t.when}`} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute top-1.5 -left-[25px] h-[7px] w-[7px] rounded-full ${
                      t.current ? "bg-accent" : "bg-fog"
                    }`}
                  />
                  <p className={`text-[15px] ${t.current ? "text-accent" : ""}`}>{t.label}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{t.when}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="mt-9 px-6">
        <SectionTitle note="Tap to reorder">Preferences</SectionTitle>
        <p className="mt-3 px-1 text-[14px] leading-relaxed text-muted-foreground">
          Ciatta looks everywhere, but it looks hardest at what's near the top. Move a topic up and
          future insights will lean toward it.
        </p>

        <Group>
          {priorities.map((p, i) => (
            <div key={p} className="flex items-center gap-3 px-4 py-3.5 text-[15px]">
              <span className="w-4 text-[13px] text-fog tabular-nums">{i + 1}</span>
              <span className="flex-1">{p}</span>
              <span className="flex gap-4 text-[13px] text-muted-foreground">
                <button
                  type="button"
                  aria-label={`Move ${p} up`}
                  disabled={i === 0}
                  onClick={() => reorder(i, i - 1)}
                  className="disabled:opacity-25"
                >
                  {"\u2303"}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${p} down`}
                  disabled={i === priorities.length - 1}
                  onClick={() => reorder(i, i + 1)}
                  className="rotate-180 disabled:opacity-25"
                >
                  {"\u2303"}
                </button>
              </span>
            </div>
          ))}
        </Group>

        <Group>
          <LinkRow label="Notifications" detail="On" />
          <LinkRow label="Appearance" detail="Light" />
          <LinkRow label="Connected apps" detail="2" />
          <LinkRow label="Privacy" />
        </Group>
      </section>

      {/* Support */}
      <section className="mt-9 px-6">
        <SectionTitle>Support</SectionTitle>
        <Group>
          <LinkRow label="Help" />
          <LinkRow label="About Ciatta" />
          <LinkRow label="Legal" />
        </Group>
        <p className="mt-4 px-1 text-[13px] leading-relaxed text-muted-foreground">
          Your understanding belongs to you. It is never sold, and can always be exported or
          permanently deleted.
        </p>
      </section>
    </div>
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
