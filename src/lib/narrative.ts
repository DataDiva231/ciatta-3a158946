import {
  phaseForDay,
  recentShift,
  signals,
  today,
  type CyclePhase,
} from "./ciatta-data";
import type { CheckIn, QuickAddEvent } from "./ciatta-store";

export type NarrativeLine = {
  label: string;
  /** Sentence split into plain and accented fragments. */
  parts: { text: string; accent?: boolean }[];
};

/** What the most recent Quick Add changed about today's read. */
export type NarrativeImpact = {
  /** One sentence naming the shift Ciatta just made. */
  text: string;
  /** The Quick Add that caused it, e.g. "Tampon · Super · Heavy". */
  source: string;
};

export type Narrative = {
  headline: { text: string; accent?: boolean }[];
  lines: NarrativeLine[];
  guidance: { lead: string; rest: string; support: string };
  impact: NarrativeImpact | null;
  /** 0–100 read of how well Ciatta understands today, and how much it just moved. */
  confidence: { value: number; delta: number };
};

type State = "recover" | "steady" | "strong";

/** Quick Add entries logged in the last 24 hours, newest first. */
function recentEvents(events: QuickAddEvent[]) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

function eventsSince(events: QuickAddEvent[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

const FLOW_WEIGHT: Record<string, number> = { Light: 1, Medium: 2, Heavy: 3 };

/** Reads the flow intensity carried by an event, from either its value or metadata. */
function flowOf(e: QuickAddEvent): number | null {
  const raw = e.metadata?.Flow ?? (e.category === "Flow" ? e.value : undefined);
  return raw ? (FLOW_WEIGHT[raw] ?? null) : null;
}

/** Compares today's logged flow with the average of the days before it. */
function flowShift(events: QuickAddEvent[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const todays: number[] = [];
  const prior: number[] = [];
  for (const e of events) {
    const w = flowOf(e);
    if (w === null) continue;
    const age = now - new Date(e.timestamp).getTime();
    if (age <= day) todays.push(w);
    else if (age <= 14 * day) prior.push(w);
  }
  if (!todays.length) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const current = avg(todays);
  const baseline = prior.length ? avg(prior) : 2;
  return { current, baseline, todaysCount: todays.length };
}

function eventBias(events: QuickAddEvent[]): State | null {
  for (const e of recentEvents(events)) {
    if (e.category === "Sleep" && (e.value === "Barely slept" || e.value === "Restless"))
      return "recover";
    if (e.category === "Sleep" && e.value === "Deep") return "strong";
    if (e.category === "Symptoms") return "recover";
    if (e.metadata?.Flow === "Heavy" || (e.category === "Flow" && e.value === "Heavy"))
      return "recover";
    if (e.category === "Activity" && e.value === "Hard") return "recover";
  }
  return null;
}

function resolveState(checkIn: CheckIn | null, events: QuickAddEvent[]): State {
  const bias = eventBias(events);
  if (bias) return bias;

  const sleepDrop = recentShift("sleepQuality");
  const felt = checkIn ? (checkIn.sleepFelt + checkIn.energy) / 2 : null;

  if (felt !== null && felt >= 4 && sleepDrop > -8) return "strong";
  if (felt !== null && felt <= 2) return "recover";
  if (sleepDrop <= -10) return "recover";
  return "steady";
}

/** Describes the shift the newest Quick Add caused in today's reasoning. */
function buildImpact(events: QuickAddEvent[]): NarrativeImpact | null {
  const last = recentEvents(events)[0];
  if (!last) return null;

  const source = [
    last.value,
    ...Object.entries(last.metadata ?? {})
      .filter(([k]) => k !== "Logged for")
      .map(([, v]) => v),
  ]
    .filter(Boolean)
    .join(" · ");

  const flow = flowShift(events);
  if (flow) {
    if (flow.current > flow.baseline + 0.3)
      return { text: "Your flow appears heavier than your recent average.", source };
    if (flow.current < flow.baseline - 0.3)
      return { text: "Your flow is running lighter than your recent average.", source };
    if (flow.todaysCount >= 3)
      return { text: "You're changing more often than usual today.", source };
    return { text: "Your flow is tracking with your recent average.", source };
  }

  if (last.category === "Sleep")
    return { text: "Ciatta re-read tonight's recovery against how you slept.", source };
  if (last.category === "Symptoms")
    return { text: "Ciatta is weighing this symptom against your cycle phase.", source };
  if (last.category === "Activity")
    return { text: "Ciatta adjusted today's load expectation for this session.", source };

  return { text: "Today's understanding confidence increased.", source };
}

/** Confidence grows with how much Ciatta has been taught, most heavily by today's logs. */
function buildConfidence(checkIn: CheckIn | null, events: QuickAddEvent[]) {
  const week = eventsSince(events, 7).length;
  const todayCount = recentEvents(events).length;
  const value = Math.min(
    97,
    58 + (checkIn ? 6 : 0) + Math.min(18, week * 3) + Math.min(15, todayCount * 5),
  );
  const delta = todayCount ? Math.min(15, todayCount * 5) : 0;
  return { value, delta };
}


export function buildNarrative(
  checkIn: CheckIn | null,
  events: QuickAddEvent[] = [],
): Narrative {
  const state = resolveState(checkIn, events);

  const phase: CyclePhase = phaseForDay(today.cycleDay);
  const sleepDrop = Math.abs(recentShift("sleepQuality"));
  const hrShift = recentShift("restingHr");
  const hrvShift = recentShift("hrv");

  const headline =
    state === "recover"
      ? [
          { text: "Your body is asking for " },
          { text: "more recovery", accent: true },
          { text: " today." },
        ]
      : state === "strong"
        ? [
            { text: "You have " },
            { text: "room to push", accent: true },
            { text: " today." },
          ]
        : [
            { text: "You're " },
            { text: "holding steady", accent: true },
            { text: " today." },
          ];

  const lines: NarrativeLine[] = [
    {
      label: "Sleep quality",
      parts: [
        { text: "Sleep quality dropped " },
        { text: `${sleepDrop}%`, accent: true },
        { text: " over the past 3 nights." },
      ],
    },
    {
      label: "Resting heart rate",
      parts: [
        { text: "Your resting heart rate is " },
        {
          text: hrShift >= 3 ? "slightly elevated." : "right where it usually sits.",
          accent: hrShift >= 3,
        },
      ],
    },
    {
      label: "Recovery",
      parts: [
        { text: "Heart rate variability is " },
        {
          text: hrvShift <= -5 ? `down ${Math.abs(hrvShift)}%` : "close to your baseline",
          accent: hrvShift <= -5,
        },
        { text: " compared with your last four weeks." },
      ],
    },
    {
      label: "Cycle",
      parts: [
        { text: `Day ${today.cycleDay}. You're in your ` },
        { text: `${phase.toLowerCase()} phase`, accent: true },
        {
          text:
            phase === "Luteal"
              ? ", when your body naturally runs warmer and rests lighter."
              : ".",
        },
      ],
    },
    {
      label: "Temperature",
      parts: [
        { text: "Core temperature is " },
        { text: `${today.tempDelta > 0 ? "+" : ""}${today.tempDelta.toFixed(2)}°C`, accent: true },
        { text: " against your own baseline." },
      ],
    },
  ];

  if (checkIn?.symptoms.length) {
    lines.push({
      label: "What you told Ciatta",
      parts: [
        { text: "You logged " },
        { text: checkIn.symptoms.join(", ").toLowerCase(), accent: true },
        { text: " this morning. Ciatta is watching how it moves with your cycle." },
      ],
    });
  }

  const lastEvent = recentEvents(events)[0];
  if (lastEvent) {
    const detail = Object.entries(lastEvent.metadata ?? {})
      .filter(([k]) => k !== "Logged for")
      .map(([, v]) => v)
      .join(", ");
    lines.push({
      label: "Quick Add",
      parts: [
        { text: `You logged ${lastEvent.category.toLowerCase()} — ` },
        { text: [lastEvent.value, detail].filter(Boolean).join(", ").toLowerCase(), accent: true },
        { text: ". Ciatta folded it into today's read." },
      ],
    });
  }



  const guidance =
    state === "recover"
      ? {
          lead: "Prioritize",
          rest: "8+ hours of sleep tonight.",
          support: "Quality sleep is the fastest way to support your body today.",
        }
      : state === "strong"
        ? {
            lead: "Use it.",
            rest: "Today is a good day for your hardest session.",
            support: "Your recovery signals can carry the extra load.",
          }
        : {
            lead: "Keep it simple.",
            rest: "Hold your usual rhythm and eat earlier tonight.",
            support: "Nothing needs changing. Ciatta will tell you when it does.",
          };

  return { headline, lines, guidance };
}

export const emergingPatterns = [
  {
    title: "Sleep dips before your period",
    body: "For three cycles running, your sleep quality falls in the two days before bleeding starts. It recovers by day 3.",
  },
  {
    title: "Warmer nights, lighter sleep",
    body: "When your core temperature runs above +0.25°C, you wake an average of 1.4 more times a night.",
  },
  {
    title: "Recovery follows your cycle, not your week",
    body: `Your heart rate variability peaks in your follicular phase — around day ${
      signals.find((d) => d.cycleDay === 9)?.cycleDay ?? 9
    } — regardless of how you trained.`,
  },
];
