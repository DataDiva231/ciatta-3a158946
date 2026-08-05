import { useState } from "react";

import { todayKey, useCheckIns } from "@/lib/ciatta-store";

const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Low mood", "Tender chest", "Brain fog"];
const MOODS = ["Flat", "Even", "Bright"];

/** The one input sensors can't provide: how the day actually landed. */
export function CheckInForm() {
  const { saveCheckIn, latest, hydrated } = useCheckIns();
  const [sleepFelt, setSleepFelt] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState("Even");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [cycleStarted, setCycleStarted] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  const save = () => {
    setStatus("saving");
    const ok = saveCheckIn({ day: todayKey(), sleepFelt, energy, mood, symptoms, cycleStarted });
    setStatus(ok ? "saved" : "error");
  };

  return (
    <div className="space-y-5">
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
        onClick={save}
        disabled={status === "saving"}
        className="h-12 w-full rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "saving" ? "Saving\u2026" : "Save check-in"}
      </button>

      {status === "saved" ? (
        <p className="text-center text-[13px] text-moss">
          Saved. Your understanding has been updated.
        </p>
      ) : status === "error" ? (
        <p className="text-center text-[13px] text-accent">
          That didn't save. Try once more in a moment.
        </p>
      ) : hydrated && latest ? (
        <p className="text-center text-[13px] text-muted-foreground">
          Last check-in saved {new Date(latest.savedAt).toLocaleString()}.
        </p>
      ) : null}
    </div>
  );
}
