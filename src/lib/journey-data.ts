import { useEffect, useMemo } from "react";

import type { OrbTone } from "@/components/ciatta/discovery-orb";
import {
  useCheckIns,
  useLearnedFacts,
  useMilestones,
  useQuickAddEvents,
} from "./ciatta-store";
import type { CheckIn, LearnedFact, Milestone, QuickAddEvent } from "./ciatta-store";
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

export type MilestoneView = {
  label: string;
  from: number;
  to: number;
  note: string;
};

export type JourneyView = {
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  /** False while the user has taught Ciatta too little — the demo story stands in. */
  hasData: boolean;
  todaysDiscovery: Discovery;
  recentDiscoveries: Discovery[];
  emergingInsights: EmergingInsight[];
  milestone: MilestoneView;
  timeline: TimelineEntry[];
  /** How many logs Journey is reading from. */
  observationCount: number;
};

/** Below this, there isn't enough evidence to generate an honest story. */
const MIN_OBSERVATIONS = 3;
/** Confidence a pattern must reach before it counts as a discovery. */
const DISCOVERY_THRESHOLD = 45;
/** Understanding levels that become milestones the first time they're crossed. */
const MILESTONE_THRESHOLDS = [40, 60, 75, 90];
const UNDERSTANDING_LABEL = "Understanding of you";

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

function monthKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long" });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function list(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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

/** Confidence grows with repetition, how many days it spans, and how recent it is. */
function groupConfidence(g: Group) {
  const [, count] = dominant(g);
  const repeat = Math.min(count, 8) / 8;
  const spread = Math.min(g.days.size, 6) / 6;
  const consistency = count / g.events.length;
  const newest = Math.max(...g.events.map((e) => new Date(e.timestamp).getTime()));
  const ageDays = (Date.now() - newest) / 86_400_000;
  const recency = ageDays <= 2 ? 1 : ageDays <= 7 ? 0.6 : 0.25;
  const raw = 20 + repeat * 36 + spread * 22 + consistency * 12 + recency * 7;
  return Math.max(12, Math.min(97, Math.round(raw)));
}

function signalsFor(g: Group) {
  const meta = new Set<string>();
  for (const e of g.events) for (const k of Object.keys(e.metadata ?? {})) meta.add(k);
  return [g.category, ...[...meta].slice(0, 3)];
}

function discoveryFromGroup(g: Group): Discovery {
  const [value, count] = dominant(g);
  const confidence = groupConfidence(g);
  const label = g.category.toLowerCase();
  const last = g.events[0];
  const lastDate = new Date(last.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return {
    id: `derived-${g.category}`,
    title:
      count > 1
        ? `${value} is becoming your usual ${label} pattern.`
        : `You started teaching Ciatta about ${label}.`,
    confidenceLabel: confidenceLabel(confidence),
    confidence,
    tone: toneFor(g.category),
    whyWeNoticed:
      count > 1
        ? `You've logged ${label} ${plural(g.events.length, "time")} across ${plural(g.days.size, "day")}, and ${value.toLowerCase()} came up ${plural(count, "time")}.`
        : `You logged ${value.toLowerCase()} on ${lastDate}. One more log and Ciatta can start looking for a pattern.`,
    signals: signalsFor(g),
    whyThisMatters: [
      count > 1
        ? `A repeating ${label} signal gives Ciatta something stable to compare each new day against.`
        : `Every ${label} log narrows what Ciatta has to guess about your body.`,
      ...(last.metadata && Object.keys(last.metadata).length
        ? [
            `Your most recent entry also carried ${list(
              Object.entries(last.metadata).map(
                ([k, v]) => `${k.toLowerCase()} ${v.toLowerCase()}`,
              ),
            )}.`,
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
  const aligned = recent.filter(
    (c) => Math.sign(c.sleepFelt - avgSleep) === Math.sign(c.energy - avgEnergy),
  ).length;
  const ratio = aligned / recent.length;
  const confidence = Math.max(12, Math.min(97, Math.round(30 + ratio * 55 + recent.length * 2)));
  return {
    id: "derived-checkin",
    title:
      ratio >= 0.6
        ? "Your energy tends to follow how you slept."
        : "Your energy doesn't always track your sleep.",
    confidenceLabel: confidenceLabel(confidence),
    confidence,
    tone: "iris",
    whyWeNoticed: `Across your last ${plural(recent.length, "check-in")}, sleep and energy moved together on ${aligned} of them.`,
    signals: ["Check-ins", "Sleep", "Energy", "Mood"],
    whyThisMatters: [
      "How you feel in the morning is one of the strongest signals Ciatta has about recovery.",
      ratio >= 0.6
        ? "Protecting sleep is likely the fastest lever you have on how the day feels."
        : "Something other than sleep is shaping your energy — Ciatta is looking for it.",
    ],
    whatToTry: "Keep checking in each morning — the relationship sharpens with every day.",
  };
}

function symptomDiscovery(checkIns: CheckIn[]): Discovery | null {
  const counts = new Map<string, number>();
  for (const c of checkIns) for (const s of c.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;
  const [symptom, n] = top;
  const confidence = Math.max(12, Math.min(97, Math.round(30 + (n / checkIns.length) * 55)));
  return {
    id: `derived-symptom-${symptom}`,
    title: `${symptom} is showing up repeatedly.`,
    confidenceLabel: confidenceLabel(confidence),
    confidence,
    tone: toneFor(symptom),
    whyWeNoticed: `${symptom} appeared in ${n} of your last ${plural(checkIns.length, "check-in")}.`,
    signals: ["Check-ins", "Symptoms", "Cycle"],
    whyThisMatters: [
      "A symptom that repeats is usually tied to something rhythmic — your cycle, your sleep, or your load.",
    ],
    whatToTry: `Note what the day looked like the next time ${symptom.toLowerCase()} appears.`,
  };
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

function buildTimeline(
  events: QuickAddEvent[],
  checkIns: CheckIn[],
  facts: LearnedFact[],
  milestones: Milestone[],
): TimelineEntry[] {
  type Bucket = { count: number; categories: Set<string>; milestones: Milestone[]; time: number };
  const months = new Map<string, Bucket>();
  const bucket = (iso: string) => {
    const key = monthKey(iso);
    const b = months.get(key) ?? {
      count: 0,
      categories: new Set<string>(),
      milestones: [],
      time: new Date(iso).getTime(),
    };
    b.time = Math.max(b.time, new Date(iso).getTime());
    months.set(key, b);
    return b;
  };

  for (const e of events) {
    const b = bucket(e.timestamp);
    b.count += 1;
    b.categories.add(e.category.toLowerCase());
  }
  for (const c of checkIns) {
    const b = bucket(c.savedAt || `${c.day}T09:00:00.000Z`);
    b.count += 1;
    b.categories.add("check-ins");
  }
  for (const f of facts) {
    if (!f.savedAt) continue;
    const b = bucket(f.savedAt);
    b.count += 1;
    b.categories.add("things you taught us");
  }
  for (const m of milestones) bucket(m.reachedAt).milestones.push(m);

  return [...months.entries()]
    .sort((a, b) => b[1].time - a[1].time)
    .map(([key, b]) => {
      const parts: string[] = [];
      for (const m of b.milestones.sort((x, y) => y.threshold - x.threshold)) {
        parts.push(`${m.label} reached ${m.to}%`);
      }
      if (b.count) {
        parts.push(
          `${plural(b.count, "observation")} across ${list([...b.categories].slice(0, 3))}`,
        );
      }
      return { month: monthLabel(key), note: `${parts.join(". ")}.` };
    });
}

/** Journey read live from ciatta.events.v1, check-ins, taught facts and milestones. */
export function useJourney(): JourneyView {
  const { events, hydrated: eventsReady } = useQuickAddEvents();
  const { checkIns, hydrated: checkInsReady } = useCheckIns();
  const { facts, hydrated: factsReady } = useLearnedFacts();
  const { milestones, recordMilestone, hydrated: milestonesReady } = useMilestones();
  const hydrated = eventsReady && checkInsReady && factsReady && milestonesReady;

  const derived = useMemo(() => {
    const observationCount =
      events.length + checkIns.length + facts.filter((f) => f.savedAt).length;

    const discoveries: Discovery[] = groupByCategory(events).map(discoveryFromGroup);
    const ci = checkInDiscovery(checkIns);
    if (ci) discoveries.push(ci);
    const sym = symptomDiscovery(checkIns);
    if (sym) discoveries.push(sym);
    discoveries.sort((a, b) => b.confidence - a.confidence);

    const overall = discoveries.length
      ? Math.min(
          97,
          Math.round(
            discoveries.reduce((a, d) => a + d.confidence, 0) / discoveries.length +
              Math.min(observationCount, 20) * 0.4,
          ),
        )
      : 0;

    return { observationCount, discoveries, overall };
  }, [events, checkIns, facts]);

  // Milestones are written the first time understanding crosses a threshold.
  useEffect(() => {
    if (!hydrated || derived.observationCount < MIN_OBSERVATIONS) return;
    const crossed = MILESTONE_THRESHOLDS.filter((t) => derived.overall >= t);
    const highest = crossed[crossed.length - 1];
    if (!highest) return;
    if (milestones.some((m) => m.threshold === highest && m.label === UNDERSTANDING_LABEL)) return;
    const previous = milestones[0]?.to ?? Math.max(0, derived.overall - 20);
    recordMilestone({
      label: UNDERSTANDING_LABEL,
      threshold: highest,
      from: previous,
      to: derived.overall,
      note: `Enough consistent evidence arrived for Ciatta to pass ${highest}% understanding.`,
    });
  }, [hydrated, derived.overall, derived.observationCount, milestones, recordMilestone]);

  return useMemo(() => {
    const { observationCount, discoveries, overall } = derived;
    const hasData = observationCount >= MIN_OBSERVATIONS && discoveries.length > 0;

    if (!hasData) {
      return {
        hydrated,
        hasData: false,
        todaysDiscovery: demoToday,
        recentDiscoveries: demoRecent,
        emergingInsights: demoEmerging as EmergingInsight[],
        milestone: demoMilestone,
        timeline: demoTimeline,
        observationCount,
      };
    }

    const confident = discoveries.filter((d) => d.confidence >= DISCOVERY_THRESHOLD);
    const early = discoveries.filter((d) => d.confidence < DISCOVERY_THRESHOLD);

    const lead = confident[0] ?? discoveries[0];
    const recent = (confident.length ? confident : discoveries).filter((d) => d.id !== lead.id);

    const emerging: EmergingInsight[] = [
      ...early
        .filter((d) => d.id !== lead.id)
        .map((d) => ({
          id: d.id,
          body: d.title,
          confidenceLabel: d.confidenceLabel,
          confidence: d.confidence,
          tone: d.tone,
        })),
      ...factInsights(facts),
    ].slice(0, 4);

    const latest = milestones[0];
    const milestone: MilestoneView = latest
      ? { label: latest.label, from: latest.from, to: overall, note: latest.note }
      : {
          label: UNDERSTANDING_LABEL,
          from: Math.max(0, overall - Math.min(20, observationCount * 3)),
          to: overall,
          note: `Built from ${plural(observationCount, "observation")} you've taught Ciatta so far.`,
        };

    return {
      hydrated,
      hasData: true,
      todaysDiscovery: lead,
      recentDiscoveries: recent.slice(0, 5),
      emergingInsights: emerging,
      milestone,
      timeline: buildTimeline(events, checkIns, facts, milestones),
      observationCount,
    };
  }, [derived, hydrated, events, checkIns, facts, milestones]);
}
