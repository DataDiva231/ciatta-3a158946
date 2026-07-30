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
          "A living summary of what Ciatta has learned about your body: understandings, your story, areas of confidence, and how Ciatta learns you.",
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

function Eyebrow({ children }: { children: string }) {
  return <p className="label-caps">{children}</p>;
}

/** A quiet shimmering placeholder used while stored understanding is read. */
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
    <div className="mt-4 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-6">
          <Bar w={`${38 + ((i * 13) % 26)}%`} />
          <Bar w={`${22 + ((i * 7) % 14)}%`} h={12} />
        </div>
      ))}
    </div>
  );
}

/** Shown when a section has nothing honest to say yet. */
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
    <div className="mt-4 rounded-2xl bg-surface px-4 py-5">
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

/** A soft caption marking content Ciatta hasn't earned from real data yet. */
function ExampleNote({ children }: { children: string }) {
  return (
    <p className="mt-3 text-[13px] leading-relaxed text-fog italic">{children}</p>
  );
}


function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-3.5 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="text-[15px]">{label}</span>
      <span className="text-[14px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-1 shrink-0 text-[15px] leading-none text-muted-foreground transition-transform duration-300 ${
        open ? "-rotate-180" : ""
      }`}
    >
      {open ? "\u2303" : "\u203A"}
    </span>
  );
}

/** One health understanding that opens inline to reveal Ciatta's reasoning. */
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
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span>
          <span
            className={`block font-serif font-light leading-[1.25] tracking-[-0.01em] ${
              lead ? "text-[22px]" : "text-[19px]"
            }`}
          >
            {u.title}
          </span>
          <span className="mt-2 flex items-baseline justify-between gap-4">
            <span className="text-[13px] text-accent">{u.tier}</span>
            {lead && (
              <span className="text-[13px] text-muted-foreground">{u.confidence}%</span>
            )}
          </span>
          {!lead && (
            <span className="mt-1 block text-[13px] text-muted-foreground">
              {u.confidence}% confidence
            </span>
          )}
        </span>
        <Chevron open={open} />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mb-5 rounded-2xl bg-surface px-4 py-5">
            <p className="text-[15px] leading-relaxed">{u.summary}</p>

            <p className="mt-5 text-[14px] font-medium">Why this matters</p>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
              {u.whyThisMatters}
            </p>

            <p className="mt-5 text-[14px] font-medium">Signals contributing</p>
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

            <p className="mt-5 text-[14px] font-medium">Still learning</p>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
              {u.stillLearning}
            </p>

            <Link
              to="/teach"
              className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[15px] text-accent"
            >
              Teach Ciatta More
              <span aria-hidden="true">{"\u203A"}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The daily check-in, kept inline under its source row. */
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
    <div className="mb-5 space-y-5 rounded-2xl bg-surface px-4 py-5">
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

function ProfilePage() {
  const profile = useProfile();
  const { priorities, reorder } = usePriorities(profile.defaultPriorities);

  const [openUnderstanding, setOpenUnderstanding] = useState<string | null>(
    profile.understandings[0]?.id ?? null,
  );
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!profile.hydrated) return <ProfileSkeleton />;

  return (

    <div className="px-6 pt-10 pb-6">
      {/* Hero */}
      <header>
        <h1 className="font-serif text-[46px] leading-[1.05] font-light tracking-[-0.02em]">
          Profile
        </h1>
        <p className="mt-4 font-serif text-[22px] leading-[1.3] font-light">
          What Ciatta understands about you.
        </p>
        <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
          Every conversation, every check-in, every discovery, and every day helps Ciatta build a
          deeper understanding that's uniquely yours.
        </p>
      </header>

      {/* Your Understanding */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Your understanding</Eyebrow>
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
        <div className="mt-3">
          {profile.understandings.map((u, i) => (
            <UnderstandingBlock
              key={u.id}
              u={u}
              lead={i === 0}
              open={openUnderstanding === u.id}
              onToggle={() =>
                setOpenUnderstanding((cur) => (cur === u.id ? null : u.id))
              }
            />
          ))}
        </div>
        {!profile.hasData && (
          <ExampleNote>
            Example understandings. They'll be replaced by your own as you teach Ciatta.
          </ExampleNote>
        )}
      </section>

      {/* Your Story */}
      <section className="mt-10">
        <Eyebrow>Your story</Eyebrow>
        <h2 className="mt-3 font-serif text-[26px] leading-tight font-light">
          {profile.hasData ? "Your story so far" : "The first page is blank."}
        </h2>
        {profile.story.map((p) => (
          <p key={p} className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </section>

      {/* Areas of Understanding */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Areas of understanding</Eyebrow>
        <div className="mt-2">
          {profile.areas.map((a, i) => (
            <Row
              key={a.name}
              label={a.name}
              value={a.tier}
              last={i === profile.areas.length - 1}
            />
          ))}
        </div>
        {!profile.hasData && (
          <ExampleNote>
            Every area starts here. Confidence rises with each thing you log.
          </ExampleNote>
        )}
      </section>


      {/* Health Snapshot */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Health snapshot</Eyebrow>
        <div className="mt-2">
          {profile.snapshot.map((s, i) => (
            <Row
              key={s.label}
              label={s.label}
              value={s.value}
              last={i === profile.snapshot.length - 1}
            />
          ))}
        </div>
        {!profile.hasData && (
          <ExampleNote>
            These numbers fill in as Ciatta observes you. Nothing here is estimated.
          </ExampleNote>
        )}
      </section>


      {/* How Ciatta Learns You */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>How Ciatta learns you</Eyebrow>
        <div className="mt-2">
          {profile.sources.map((s) => {
            const open = openSource === s.id;
            return (
              <div key={s.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setOpenSource((cur) => (cur === s.id ? null : s.id))}
                  aria-expanded={open}
                  className="flex w-full items-start justify-between gap-4 py-4 text-left"
                >
                  <span className="max-w-[62%]">
                    <span className="block text-[16px]">{s.name}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                      {s.body}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-start gap-2">
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

                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {s.id === "checkins" ? (
                      <CheckInForm />
                    ) : (
                      <p className="mb-5 rounded-2xl bg-surface px-4 py-4 text-[14px] leading-relaxed text-muted-foreground">
                        {s.active
                          ? "This source is contributing to your understanding right now."
                          : "Not yet available. When it arrives, it will deepen your understanding automatically."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Understanding Timeline */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Understanding timeline</Eyebrow>
        <ol className="mt-5 space-y-6 border-l border-border pl-5">
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
        {profile.timeline.length <= 1 && (
          <Invitation
            line="Your timeline starts with one log."
            body="As understanding deepens, each milestone Ciatta crosses is recorded here, month by month."
            action="Add your first entry"
          />
        )}
      </section>


      {/* Intelligence Preferences */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Intelligence preferences</Eyebrow>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Choose what Ciatta prioritizes when generating discoveries. Drag to reorder.
        </p>
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border">
          {priorities.map((p, i) => (
            <li
              key={p}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) reorder(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-4 px-4 py-3.5 text-[15px] transition-colors ${
                i === priorities.length - 1 ? "" : "border-b border-border"
              } ${dragIndex === i ? "bg-surface" : ""}`}
            >
              <span
                aria-hidden="true"
                className="cursor-grab leading-none text-fog select-none active:cursor-grabbing"
              >
                {"\u2807"}
              </span>
              <span className="flex-1">{p}</span>
              <span className="flex gap-3 text-[13px] text-muted-foreground">
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
            </li>
          ))}
        </ul>
      </section>

      {/* Privacy & Intelligence */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Privacy &amp; intelligence</Eyebrow>
        <h2 className="mt-3 font-serif text-[24px] leading-tight font-light">
          Your understanding belongs to you.
        </h2>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          Everything Ciatta learns exists to build your personal understanding and improve your
          experience. Your information is never sold. Your understanding can always be exported or
          permanently deleted.
        </p>
        <div className="mt-5">
          {["Export My Data", "Download My Understanding", "Delete My Data", "Privacy Policy"].map(
            (label, i, arr) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center justify-between py-3 text-left text-[15px] text-accent ${
                  i === arr.length - 1 ? "" : "border-b border-border"
                }`}
              >
                {label}
                <span aria-hidden="true" className="text-muted-foreground">
                  {"\u203A"}
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      {/* Settings */}
      <section className="mt-10 border-t border-border pt-7">
        <Eyebrow>Settings</Eyebrow>
        <div className="mt-2">
          {["Notifications", "Appearance", "Units", "Language", "Support", "About Ciatta", "Legal"].map(
            (label, i, arr) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center justify-between py-3 text-left text-[15px] ${
                  i === arr.length - 1 ? "" : "border-b border-border"
                }`}
              >
                {label}
                <span aria-hidden="true" className="text-muted-foreground">
                  {"\u203A"}
                </span>
              </button>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
