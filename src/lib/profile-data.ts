import { useMemo } from "react";

import { useCheckIns, useLearnedFacts, useMilestones, useQuickAddEvents } from "./ciatta-store";
import { useJourney } from "./journey-data";
import type { Discovery } from "./journey-content";

export type Understanding = {
  id: string;
  title: string;
  confidence: number;
  tier: string;
  summary: string;
  whyThisMatters: string;
  signals: string[];
  stillLearning: string;
};

export type Area = { name: string; confidence: number; tier: string };

export type SnapshotRow = { label: string; value: string };

export type SourceRow = {
  id: string;
  name: string;
  status: string;
  active: boolean;
  body: string;
};

export type TimelineStep = { label: string; when: string; current?: boolean };

export type ProfileView = {
  hydrated: boolean;
  /** False while Ciatta has too little evidence — sections show invitations instead. */
  hasData: boolean;
  /** How many logs the portrait is drawn from. */
  observationCount: number;
  understandings: Understanding[];
  story: string[];
  areas: Area[];
  snapshot: SnapshotRow[];
  sources: SourceRow[];
  timeline: TimelineStep[];
  defaultPriorities: string[];
};


/** Ciatta's confidence vocabulary — one tier label per confidence band. */
export function tierFor(v: number) {
  if (v >= 90) return "Very High Confidence";
  if (v >= 80) return "High Confidence";
  if (v >= 65) return "Growing Confidence";
  if (v >= 45) return "Learning";
  if (v >= 25) return "Early Understanding";
  return "Just Beginning";
}

/**
 * Descriptive, non-repeating status for an area of understanding.
 * Rank varies the wording so several quiet areas never read identically.
 */
export function areaStatus(v: number, rank: number) {
  if (v >= 85)
    return ["Well understood", "Reliably predictable", "Confirmed over time"][rank % 3];
  if (v >= 65)
    return ["Pattern holding", "Repeating consistently", "Taking clear shape"][rank % 3];
  if (v >= 45) return ["Connections forming", "Starting to line up", "A shape is emerging"][rank % 3];
  if (v >= 25)
    return ["First signals in", "Watching for repeats", "Early threads only"][rank % 3];
  return ["Listening, nothing yet", "Awaiting your first logs", "Not enough to say"][rank % 3];
}

const AREAS = ["Recovery", "Sleep", "Cycle", "Stress", "Nutrition", "Mood"];

/** Words in a signal that point an observation at a given area of understanding. */
const AREA_WORDS: Record<string, string[]> = {
  Recovery: ["recovery", "rest", "energy", "heart"],
  Sleep: ["sleep", "bed", "night"],
  Cycle: ["cycle", "period", "flow", "tampon", "pad", "cramp"],
  Stress: ["stress", "tension", "load", "work"],
  Nutrition: ["nutrition", "food", "meal", "hydration", "water", "coffee"],
  Mood: ["mood", "feeling", "brain fog", "low mood"],
};


function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function toUnderstanding(d: Discovery): Understanding {
  return {
    id: d.id,
    title: d.title,
    confidence: d.confidence,
    tier: tierFor(d.confidence),
    summary: d.whyWeNoticed,
    whyThisMatters: d.whyThisMatters[0] ?? d.whyWeNoticed,
    signals: d.signals,
    stillLearning:
      d.whyThisMatters[1] ??
      `We're continuing to understand what else shapes this relationship. ${d.whatToTry}`,
  };
}

/** Profile read entirely from what Ciatta has been taught so far. */
export function useProfile(): ProfileView {
  const journey = useJourney();
  const { events } = useQuickAddEvents();
  const { checkIns } = useCheckIns();
  const { facts } = useLearnedFacts();
  const { milestones } = useMilestones();

  return useMemo(() => {
    const discoveries = [journey.todaysDiscovery, ...journey.recentDiscoveries];
    const understandings = discoveries.map(toUnderstanding);

    // Every timestamp Ciatta holds, used for "tracking since" and the timeline.
    const times = [
      ...events.map((e) => e.timestamp),
      ...checkIns.map((c) => c.savedAt || `${c.day}T09:00:00.000Z`),
      ...facts.filter((f) => f.savedAt).map((f) => f.savedAt),
    ]
      .filter(Boolean)
      .sort();
    const first = times[0];

    // An area's confidence is the strongest discovery whose signals mention it.
    const areas: Area[] = AREAS.map((name) => {
      const words = AREA_WORDS[name];
      const matches = discoveries.filter((d) =>
        [d.title, ...d.signals].some((s) =>
          words.some((w) => s.toLowerCase().includes(w)),
        ),
      );
      const base = matches.length
        ? Math.max(...matches.map((d) => d.confidence))
        : Math.min(24, journey.observationCount * 3);
      return { name, confidence: base, tier: tierFor(base) };
    })
      .sort((a, b) => b.confidence - a.confidence)
      .map((a, i) => ({ ...a, tier: areaStatus(a.confidence, i) }));

    const confirmed = understandings.filter((u) => u.confidence >= 70).length;
    const forming = understandings.length - confirmed;
    const focus = areas[areas.length - 1]?.name ?? "Recovery";
    const strongest = areas[0];

    const snapshot: SnapshotRow[] = [
      { label: "Learning since", value: first ? monthYear(first) : "Today" },
      { label: "Life stage", value: "Cycling" },
      {
        label: "Patterns held",
        value: confirmed
          ? `${confirmed} understood well`
          : "None settled yet",
      },
      {
        label: "Patterns forming",
        value: forming ? `${forming} taking shape` : "Nothing forming yet",
      },
      {
        label: "Quietly watching",
        value: journey.emergingInsights.length
          ? `${journey.emergingInsights.length} early threads`
          : "Listening",
      },
      {
        label: "Clearest area",
        value: strongest ? `${strongest.name} — ${strongest.tier.toLowerCase()}` : "Still forming",
      },
      { label: "Looking at next", value: focus },
    ];

    const sources: SourceRow[] = [
      {
        id: "teach",
        name: "Teach Ciatta",
        status: events.length || facts.some((f) => f.savedAt) ? "Learning from it" : "Ready",
        active: true,
        body: "Anything you tell Ciatta directly — a quick log, a voice note, a fact about your body — becomes context it reasons with the same day.",
      },
      {
        id: "apple",
        name: "Apple Health",
        status: "Learning from it",
        active: true,
        body: "Sleep timing, heart rate and movement give Ciatta the steady background rhythm it compares each new day against.",
      },
      {
        id: "checkins",
        name: "Daily Check-ins",
        status: checkIns.length ? "Learning from it" : "Not started",
        active: true,
        body: "How you felt is the one thing sensors can't measure. Check-ins let Ciatta connect what your body did with how the day actually landed.",
      },
      {
        id: "arc",
        name: "Ciatta Arc\u2122",
        status: "Coming soon",
        active: false,
        body: "Continuous wearable sensing. It will fill in the hours between logs, so Ciatta stops having to infer them.",
      },
      {
        id: "webbee",
        name: "Webbee\u2122",
        status: "Coming soon",
        active: false,
        body: "Menstrual sensing. It will let Ciatta read your cycle from your body directly, instead of from what you report.",
      },
    ];

    const timeline: TimelineStep[] = [];
    if (first)
      timeline.push({ label: "Ciatta started listening", when: monthYear(first) });
    if (journey.observationCount >= 3 && times[2])
      timeline.push({
        label: "First sense of your normal",
        when: monthYear(times[2]),
      });
    const firstConfirmed = [...milestones].sort(
      (a, b) => new Date(a.reachedAt).getTime() - new Date(b.reachedAt).getTime(),
    );
    for (const m of firstConfirmed) {
      timeline.push({
        label:
          m.to >= 90
            ? `Ciatta can now anticipate this — ${m.to}% sure`
            : m.to >= 75
              ? `Pattern confirmed across enough days — ${m.to}%`
              : m.to >= 60
                ? `The same relationship kept repeating — ${m.to}%`
                : `First real pattern took shape — ${m.to}%`,
        when: monthYear(m.reachedAt),
      });
    }
    timeline.push({
      label: understandings.length
        ? `Currently learning how ${focus.toLowerCase()} moves with your cycle`
        : "Waiting on your first observation",
      when: "Today",
      current: true,
    });

    const months = first
      ? Math.max(
          1,
          Math.round((Date.now() - new Date(first).getTime()) / (30 * 86_400_000)),
        )
      : 0;

    const observationSummary = !journey.observationCount
      ? "Nothing learned yet"
      : confirmed
        ? `${confirmed} pattern${confirmed === 1 ? "" : "s"} understood`
        : `${understandings.length} pattern${understandings.length === 1 ? "" : "s"} forming`;

    const story = [
      first
        ? `Ciatta has been learning you for ${months} ${months === 1 ? "month" : "months"}. ${
            confirmed
              ? `${confirmed} thing${confirmed === 1 ? " is" : "s are"} now understood well enough to act on`
              : "Nothing is settled yet"
          }, ${forming ? `${forming} more ${forming === 1 ? "is" : "are"} still taking shape` : "and the rest is still open"}. Right now it's paying closest attention to ${focus.toLowerCase()}.`
        : "Ciatta doesn't know you yet. The first log is where the understanding starts.",
      "Every log narrows what Ciatta has to guess.",
    ];


    return {
      hydrated: journey.hydrated,
      hasData: journey.hasData,
      observationCount: journey.observationCount,
      understandings,

      story,
      areas,
      snapshot,
      sources,
      timeline,
      defaultPriorities: areas.map((a) => a.name),
    };
  }, [journey, events, checkIns, facts, milestones]);
}
