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
    }).sort((a, b) => b.confidence - a.confidence);

    const confirmed = understandings.filter((u) => u.confidence >= 70).length;
    const focus = areas[areas.length - 1]?.name ?? "Recovery";

    const snapshot: SnapshotRow[] = [
      { label: "Tracking Since", value: first ? monthYear(first) : "Just started" },
      { label: "Current Life Stage", value: "Cycling" },
      { label: "Continuous Discoveries", value: String(understandings.length) },
      { label: "Emerging Insights", value: String(journey.emergingInsights.length) },
      { label: "Confirmed Understandings", value: String(confirmed) },
      { label: "Current Learning Focus", value: `${focus} & Recovery` },
    ];

    const sources: SourceRow[] = [
      {
        id: "teach",
        name: "Teach Ciatta",
        status: events.length || facts.some((f) => f.savedAt) ? "Connected" : "Ready",
        active: true,
        body: "Daily conversations, quick logs, and taught facts continuously improve your understanding.",
      },
      {
        id: "apple",
        name: "Apple Health",
        status: "Connected",
        active: true,
        body: "Sleep, activity, heart rate, and movement contribute to your personal understanding.",
      },
      {
        id: "checkins",
        name: "Daily Check-ins",
        status: checkIns.length ? "Active" : "Start today",
        active: true,
        body: "Your reflections help Ciatta connect how you feel with what your body experiences.",
      },
      {
        id: "arc",
        name: "Ciatta Arc\u2122",
        status: "Coming Soon",
        active: false,
        body: "Future wearable sensing will continuously deepen your understanding.",
      },
      {
        id: "webbee",
        name: "Webbee\u2122",
        status: "Coming Soon",
        active: false,
        body: "Future menstrual sensing will provide continuous biological insights.",
      },
    ];

    const timeline: TimelineStep[] = [];
    if (first) timeline.push({ label: "Started Learning", when: monthYear(first) });
    if (journey.observationCount >= 3 && times[2])
      timeline.push({ label: "Baseline Established", when: monthYear(times[2]) });
    const firstConfirmed = [...milestones].sort(
      (a, b) => new Date(a.reachedAt).getTime() - new Date(b.reachedAt).getTime(),
    );
    for (const m of firstConfirmed) {
      timeline.push({
        label: `${m.label} reached ${m.to}%`,
        when: monthYear(m.reachedAt),
      });
    }
    timeline.push({ label: "Current Understanding", when: "Today", current: true });

    const months = first
      ? Math.max(
          1,
          Math.round((Date.now() - new Date(first).getTime()) / (30 * 86_400_000)),
        )
      : 0;
    const story = [
      first
        ? `You've been teaching Ciatta for ${months} ${months === 1 ? "month" : "months"}. During that time we've made ${understandings.length} meaningful ${understandings.length === 1 ? "observation" : "observations"}, confirmed ${confirmed} long-term ${confirmed === 1 ? "relationship" : "relationships"}, and continue learning how ${focus.toLowerCase()} influences your cycle.`
        : "Your story is just beginning. Every log, check-in and conversation adds a line to it.",
      "Your understanding becomes more personalized every day.",
    ];

    return {
      hydrated: journey.hydrated,
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
