import {
  phaseForDay,
  recentShift,
  signals,
  today,
  type CyclePhase,
} from "./ciatta-data";
import type { CheckIn } from "./ciatta-store";

export type NarrativeLine = {
  label: string;
  /** Sentence split into plain and accented fragments. */
  parts: { text: string; accent?: boolean }[];
};

export type Narrative = {
  headline: { text: string; accent?: boolean }[];
  lines: NarrativeLine[];
  guidance: { lead: string; rest: string; support: string };
};

type State = "recover" | "steady" | "strong";

function resolveState(checkIn: CheckIn | null): State {
  const sleepDrop = recentShift("sleepQuality");
  const felt = checkIn ? (checkIn.sleepFelt + checkIn.energy) / 2 : null;

  if (felt !== null && felt >= 4 && sleepDrop > -8) return "strong";
  if (felt !== null && felt <= 2) return "recover";
  if (sleepDrop <= -10) return "recover";
  return "steady";
}

export function buildNarrative(checkIn: CheckIn | null): Narrative {
  const state = resolveState(checkIn);
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
