import { useMemo } from "react";

import type { OrbTone } from "@/components/ciatta/discovery-orb";
import { useCheckIns, useLearnedFacts, useQuickAddEvents } from "./ciatta-store";
import type { CheckIn, LearnedFact, QuickAddEvent } from "./ciatta-store";
import {
  emergingInsights as demoEmerging,
  journeyTimeline as demoTimeline,
  recentDiscoveries as demoRecent,
  todaysDiscovery as demoToday,
  understandingMilestone as demoMilestone,
  type Discovery,
} from "./journey-content";

export type EmergingInsight = {
  id: string;
  body: string;
  confidenceLabel: string;
  confidence: number;
  tone: OrbTone;
};

export type TimelineEntry = { month: string; note: string };

export type JourneyView = {
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  /** False when the user has taught Ciatta nothing yet — demo story is shown. */
  hasData: boolean;
  todaysDiscovery: Discovery;
  recentDiscoveries: Discovery[];
  emergingInsights: EmergingInsight[];
  milestone: { label: string; from: number; to: number; note: string };
  timeline: TimelineEntry[];
  /** How many logs Journey is reading from. */
  observationCount: number;
};

const TONES: OrbTone[] = ["iris", "clay", "moss", "stone-blue", "wheat"];

function toneFor(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i)) % 997;
  return TONES[n % TONES.length];
}

function confidenceLabel(v: number) {
  if (v >= 75) return "We're becoming confident.";
  if (v >= 55) return "We're seeing this repeat.";
  if (v >= 35) return "We're beginning to see.";
  return "We're still watching this.";
}

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long" });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

type Group = {
  category: string;
  events: QuickAddEvent[];
  days: Set<string>;
  values: Map<string, number>;
};

function groupByCategory(events: QuickAddEvent[]) {
  const map = new Map<string, Group>();
  for (const e of events) {
    let g = map.get(e.category);
    if (!g) {
      g = { category: e.category, events: [], days: new Set(), values: new Map() };
      map.set(e.category, g);
    }
    g.events.push(e);
    g.days.add(dayKey(e.timestamp));
    g.values.set(e.value, (g.values.get(e.value) ?? 0) + 1);
  }
  return [...map.values()].sort((a, b) => b.events.length - a.events.length);
}

function dominant(g: Group) {
  return [...g.values.entries()].sort((a, b) => b[1] - a[1])[0];
}

/** Confidence for a pattern grows with repetitions and the days it spans. */
function groupConfidence(g: Group) {
  const [, count] = dominant(g);
  const repeat = Math.min(count, 8) / 8;
  const spread = Math.min(g.days.size, 6) / 6;
  return Math.round(28 + repeat * 42 + spread * 25);
}

function signalsFor(g: Group) {
  const meta = new Set<string>();
  for (const e of g.events) for (const k of Object.keys(e.metadata ?? {})) meta.add(k);
  return [g.category, ...[...meta].slice(0, 3)];
}

function discoveryFromGroup(g: Group): Discovery {
  const [value, count] = dominant(g);
  const confidence = groupConfidence(g);
  const tone = toneFor(g.category);
  const label = g.category.toLowerCase();
  const last = g.events[0];
  return {
    id: `derived-${g.category}`,
    title:
      count > 1
        ? `${value} is becoming your usual ${label} pattern.`
        : `You started teaching Ciatta about ${label}.`,
    confidenceLabel: confidenceLabel(confidence),
    confidence,
    tone,
    whyWeNoticed:
      count > 1
        ? `You've logged ${label} ${plural(g.events.length, "time")} across ${plural(g.days.size, "day")}, and ${value.toLowerCase()} came up ${plural(count, "time")}.`
        : `You logged ${value.toLowerCase()} on ${new Date(last.timestamp).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. One more log and we can start looking for a pattern.`,
    signals: signalsFor(g),
    whyThisMatters: [
      count > 1
        ? `A repeating ${label} signal gives Ciatta something stable to compare each new day against.`
        : `Every ${label} log narrows what Ciatta has to guess about your body.`,
      ...(last.metadata && Object.keys(last.metadata).length
        ? [
            `Your last entry also carried ${Object.entries(last.metadata)
              .map(([k, v]) => `${k.toLowerCase()} ${v.toLowerCase()}`)
              .join(", ")}.`,
          ]
        : []),
    ],
    whatToTry:
      count > 1
        ? `Keep logging ${label} for a few more days so Ciatta can tie it to your recovery.`
        : `Log ${label} again next time it happens.`,
  };
}

function checkInDiscovery(checkIns: CheckIn[]): Discovery | null {
  if (checkIns.length < 2) return null;
  const recent = checkIns.slice(0, 7);
  const avgSleep = recent.reduce((a, c) => a + c.sleepFelt, 0) / recent.length;
  const avgEnergy = recent.reduce((a, c) => a + c.energy, 0) / recent.length;
  const aligned = recent.filter((c) => Math.sign(c.sleepFelt - avgSleep) === Math.sign(c.energy - avgEnergy)).length;
  const confidence = Math.round(35 + (aligned / recent.length) * 50);
  return {
    id: "derived-checkin",
    title:
      aligned / recent.length >= 0.6
        ? "Your energy tends to follow how you slept."
        : "Your energy doesn't always track your sleep.",
    confidenceLabel: confidenceLabel(confidence),
    confidence,
    tone: "iris",
    whyWeNoticed: `Across your last ${plural(recent.length, "check-in")}, sleep and energy moved together on ${aligned} of them.`,
    signals: ["Check-ins", "Sleep", "Energy", "Mood"],
    whyThisMatters: [
      "How you feel in the morning is one of the strongest signals Ciatta has about recovery.",
    ],
    whatToTry: "Keep checking in each morning — the relationship sharpens with every day.",
  };
}

function buildTimeline(events: QuickAddEvent[], checkIns: CheckIn[]): TimelineEntry[] {
  const months = new Map<string, { count: number; categories: Set<string>; time: number }>();
  const add = (iso: string, category: string) => {
    const key = monthLabel(iso);
    const m = months.get(key) ?? { count: 0, categories: new Set<string>(), time: 0 };
    m.count += 1;
    m.categories.add(category);
    m.time = Math.max(m.time, new Date(iso).getTime());
    months.set(key, m);
  };
  for (const e of events) add(e.timestamp, e.category);
  for (const c of checkIns) add(c.savedAt || `${c.day}T09:00:00.000Z`, "Check-in");

  return [...months.entries()]
    .sort((a, b) => b[1].time - a[1].time)
    .map(([month, m]) => ({
      month,
      note: `${plural(m.count, "observation")} across ${[...m.categories].slice(0, 3).join(", ").toLowerCase()}.`,
    }));
}

function factInsights(facts: LearnedFact[]): EmergingInsight[] {
  return facts
    .filter((f) => f.savedAt)
    .slice(0, 3)
    .map((f) => ({
      id: `fact-${f.id}`,
      body: f.text,
      confidenceLabel: "You taught us this.",
      confidence: 50,
      tone: toneFor(f.id),
    }));
}

/** Journey read live from ciatta.events.v1, check-ins and taught facts. */
export function useJourney(): JourneyView {
  const { events, hydrated: eventsReady } = useQuickAddEvents();
  const { checkIns, hydrated: checkInsReady } = useCheckIns();
  const { facts, hydrated: factsReady } = useLearnedFacts();
  const hydrated = eventsReady && checkInsReady && factsReady;

  return useMemo(() => {
    const observationCount = events.length + checkIns.length;
    const hasData = observationCount > 0;

    if (!hasData) {
      return {
        hydrated,
        hasData: false,
        todaysDiscovery: demoToday,
        recentDiscoveries: demoRecent,
        emergingInsights: demoEmerging as EmergingInsight[],
        milestone: demoMilestone,
        timeline: demoTimeline,
        observationCount: 0,
      };
    }

    const groups = groupByCategory(events);
    const derived: Discovery[] = groups.map(discoveryFromGroup);
    const ci = checkInDiscovery(checkIns);
    if (ci) derived.push(ci);
    derived.sort((a, b) => b.confidence - a.confidence);

    const confident = derived.filter((d) => d.confidence >= 45);
    const early = derived.filter((d) => d.confidence < 45);

    const lead = confident[0] ?? derived[0];
    const recent = (confident.length > 1 ? confident.slice(1) : derived.slice(1)).slice(0, 5);

    const emerging: EmergingInsight[] = [
      ...early.map((d) => ({
        id: d.id,
        body: d.title,
        confidenceLabel: d.confidenceLabel,
        confidence: d.confidence,
        tone: d.tone,
      })),
      ...factInsights(facts),
    ].slice(0, 4);

    const overall = Math.min(
      97,
      Math.round(derived.reduce((a, d) => a + d.confidence, 0) / Math.max(derived.length, 1)),
    );
    const from = Math.max(10, overall - Math.min(20, observationCount * 3));

    return {
      hydrated,
      hasData: true,
      todaysDiscovery: lead,
      recentDiscoveries: recent,
      emergingInsights: emerging,
      milestone: {
        label: "Understanding of you",
        from,
        to: overall,
        note: `Built from ${plural(observationCount, "observation")} you've taught Ciatta so far.`,
      },
      timeline: buildTimeline(events, checkIns),
      observationCount,
    };
  }, [events, checkIns, facts, hydrated]);
}
