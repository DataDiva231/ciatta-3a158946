import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { today } from "@/lib/ciatta-data";
import { todayKey, useCheckIns, useLearnedFacts } from "@/lib/ciatta-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Ciatta" },
      {
        name: "description",
        content:
          "Your devices, your daily check-in, and everything Ciatta has learned about your body.",
      },
      { property: "og:title", content: "Profile — Ciatta" },
      {
        property: "og:description",
        content: "Manage your Ciatta earring, tampon, and daily check-in.",
      },
    ],
  }),
  component: ProfilePage,
});

const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Low mood", "Tender chest", "Brain fog"];
const MOODS = ["Flat", "Even", "Bright"];

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
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
                : "border-border bg-surface text-muted-foreground hover:border-fog"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  const { latest, saveCheckIn, hydrated } = useCheckIns();
  const { facts } = useLearnedFacts();

  const [sleepFelt, setSleepFelt] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState("Even");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [cycleStarted, setCycleStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = () => {
    saveCheckIn({ day: todayKey(), sleepFelt, energy, mood, symptoms, cycleStarted });
    setSaved(true);
  };

  return (
    <div className="px-6 pb-6 pt-10">
      <h1 className="font-serif text-[30px] leading-tight font-light">Jenny Okafor</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        34 · Cycle day {today.cycleDay} · With Ciatta for 4 months
      </p>

      <section className="mt-10">
        <p className="label-caps">Today's check-in</p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Your sensors know the numbers. This is where you tell Ciatta how it actually felt.
        </p>

        <div className="mt-6 space-y-6 rounded-3xl border border-border bg-surface p-5">
          <Scale label="How sleep felt" value={sleepFelt} onChange={setSleepFelt} />
          <Scale label="Energy right now" value={energy} onChange={setEnergy} />

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
                      : "border-border bg-surface text-muted-foreground hover:border-fog"
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
                  onClick={() => toggleSymptom(s)}
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
                className={`block h-5 w-5 rounded-full bg-surface transition-transform ${
                  cycleStarted ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <button
            type="button"
            onClick={submit}
            className="h-12 w-full rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Save check-in
          </button>

          {saved && (
            <p className="text-center text-[13px] text-moss">
              Saved. Today's read has been updated.
            </p>
          )}
          {hydrated && latest && !saved && (
            <p className="text-center text-[13px] text-muted-foreground">
              Last check-in saved {new Date(latest.savedAt).toLocaleString()}.
            </p>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <p className="label-caps">Your devices</p>
        <ul className="mt-5 space-y-5">
          <li className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[16px]">Ciatta Earring</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Continuous temperature, heart rate and HRV sensing.
              </p>
            </div>
            <span className="mt-1 flex shrink-0 items-center gap-2 text-[12px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-moss" aria-hidden="true" />
              Streaming
            </span>
          </li>
          <li className="flex items-start justify-between gap-4 border-t border-border pt-5">
            <div>
              <p className="text-[16px]">Ciatta Tampon</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Honeycomb sensing structure. Reads hormonal and inflammatory markers.
              </p>
            </div>
            <span className="mt-1 flex shrink-0 items-center gap-2 text-[12px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-fog" aria-hidden="true" />
              Synced 6d ago
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <p className="label-caps">What Ciatta knows about you</p>
        <ul className="mt-4 space-y-3">
          {facts.slice(0, 5).map((f) => (
            <li key={f.id} className="text-[15px] leading-relaxed text-muted-foreground">
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <p className="label-caps">Your data</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Everything in this preview stays on this device. Nothing is sold, nothing is shared,
          and you can delete all of it at any time.
        </p>
      </section>
    </div>
  );
}
