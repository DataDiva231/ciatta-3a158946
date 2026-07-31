import { useMemo } from "react";

import { useCheckIns, useLearnedFacts, useMilestones, useQuickAddEvents } from "./ciatta-store";
import { useJourney } from "./journey-data";
import type { Discovery } from "./journey-data";

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

export type Area = {
  name: string;
  confidence: number;
  tier: string;
  /** What Ciatta currently understands about this area. */
  detail: string;
  /** The most recent movement in this area. */
  recentChange: string;
  /** Observations that feed this area. */
  evidence: string[];
};

export type SnapshotRow = {
  /** URL-safe id, used by the metric detail screen. */
  id: string;
  label: string;
  value: string;
  /** Longer explanation shown on the metric detail screen. */
  detail: string;
  /** Supporting lines for the detail screen. */
  notes: string[];
};

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
  /** Living one-liner about progress, used instead of a raw count. */
  observationSummary: string;
  understandings: Understanding[];
  story: string[];
  areas: Area[];
  snapshot: SnapshotRow[];

  sources: SourceRow[];
  timeline: TimelineStep[];
  defaultPriorities: string[];
};


/** Ciatta's learning vocabulary — one plain-language state per band. */
export function tierFor(v: number) {
  if (v >= 90) return "Clear to me";
  if (v >= 80) return "Well understood";
  if (v >= 65) return "Becoming clearer";
  if (v >= 45) return "Still learning";
  if (v >= 25) return "Beginning to notice";
  return "Just listening";
}

/**
 * Descriptive, non-repeating state for an area of understanding.
 * Rank varies the wording so several quiet areas never read identically.
 */
export function areaStatus(v: number, rank: number) {
  if (v >= 85)
    return ["Well understood", "Clear to me", "Confirmed over time"][rank % 3];
  if (v >= 65)
    return ["Pattern holding", "Repeating consistently", "Taking clear shape"][rank % 3];
  if (v >= 45) return ["Connections forming", "Starting to line up", "A shape is emerging"][rank % 3];
  if (v >= 25)
    return ["Beginning to notice", "Watching for repeats", "Early threads only"][rank % 3];
  return ["Listening, nothing yet", "Waiting on your first stories", "I don't know enough yet"][rank % 3];
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
      `I'm still learning what else shapes this connection. ${d.whatToTry}`,
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
    const discoveries: Discovery[] = [
      ...(journey.todaysDiscovery ? [journey.todaysDiscovery] : []),
      ...journey.recentDiscoveries,
    ];
    const understandings = discoveries.map(toUnderstanding);

    // Every timestamp held, used for "learning since" and the timeline.
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
      const strongest = matches.sort((a, b) => b.confidence - a.confidence)[0];
      const evidence = [...new Set(matches.flatMap((d) => d.signals))].slice(0, 5);
      const detail = strongest
        ? strongest.whyWeNoticed
        : `I haven't seen enough of your ${name.toLowerCase()} yet to say anything honest about it. A few moments shared is usually all it takes.`;
      const recentChange = strongest
        ? strongest.whatToTry
        : `Nothing has moved here yet. The first ${name.toLowerCase()} log starts the picture.`;
      return { name, confidence: base, tier: tierFor(base), detail, recentChange, evidence };
    })
      .sort((a, b) => b.confidence - a.confidence)
      .map((a, i) => ({ ...a, tier: areaStatus(a.confidence, i) }));

    const confirmed = understandings.filter((u) => u.confidence >= 70).length;
    const forming = understandings.length - confirmed;
    const focus = areas[areas.length - 1]?.name ?? "Recovery";
    const strongest = areas[0];

    const snapshot: SnapshotRow[] = [
      {
        id: "learning-since",
        label: "Learning since",
        value: first ? monthYear(first) : "Today",
        detail: first
          ? `I've been building my understanding of you since ${monthYear(first)}. Everything here comes from what you've shared since then \u2014 nothing is assumed.`
          : "We started today. The first thing you share becomes the first line of your story.",
        notes: [
          `${journey.observationCount} observation${journey.observationCount === 1 ? "" : "s"} held so far.`,
          "Older logs still count. Recent ones simply count for more.",
        ],
      },
      {
        id: "life-stage",
        label: "Life stage",
        value: "Cycling",
        detail:
          "Your life stage tells me which rhythms to expect. Cycling means I read your days against a roughly monthly rhythm rather than a flat one.",
        notes: [
          "Change this any time from Edit profile.",
          "If this is wrong, everything I understand will be a little off.",
        ],
      },
      {
        id: "patterns-held",
        label: "Patterns held",
        value: confirmed ? `${confirmed} understood well` : "None settled yet",
        detail: confirmed
          ? `${confirmed} pattern${confirmed === 1 ? " has" : "s have"} repeated often enough that I'll act on ${confirmed === 1 ? "it" : "them"} without waiting to see more.`
          : "Nothing has repeated often enough for me to treat it as settled. I'd rather say nothing than guess.",
        notes: understandings.filter((u) => u.confidence >= 70).map((u) => u.title),
      },
      {
        id: "patterns-forming",
        label: "Patterns forming",
        value: forming ? `${forming} taking shape` : "Nothing forming yet",
        detail: forming
          ? "These have appeared more than once, but not often enough for me to lean on them yet. I'm listening for the next repeat."
          : "Nothing is forming yet. Two moments of the same kind is usually where a shape begins.",
        notes: understandings.filter((u) => u.confidence < 70).map((u) => u.title),

      },
      {
        id: "watching",
        label: "Quietly watching",
        value: journey.emergingInsights.length
          ? `${journey.emergingInsights.length} early threads`
          : "Listening",
        detail:
          "Early threads are things I've noticed once and am holding onto in case they repeat. I won't say more until they do.",
        notes: journey.emergingInsights.map((e) => e.body),
      },
      {
        id: "clearest-area",
        label: "Clearest area",
        value: strongest ? `${strongest.name} \u2014 ${strongest.tier.toLowerCase()}` : "Still forming",
        detail: strongest
          ? `${strongest.name} is where my understanding of you is clearest right now. ${strongest.detail}`
          : "No single area is clearer than the others yet.",
        notes: strongest ? strongest.evidence : [],
      },
      {
        id: "next",
        label: "Looking at next",
        value: focus,
        detail: `${focus} is the thinnest part of the portrait, so it's where the next few logs will make the biggest difference.`,
        notes: ["You can change what I lean toward under what matters most."],
      },
    ];

    const sources: SourceRow[] = [
      {
        id: "teach",
        name: "Teach me",
        status: events.length || facts.some((f) => f.savedAt) ? "Learning from it" : "Ready",
        active: true,
        body: "Anything you tell me directly — a moment, a voice note, something about your body — becomes part of how I understand the same day.",
      },
      {
        id: "apple",
        name: "Apple Health",
        status: "Learning from it",
        active: true,
        body: "Sleep timing, heart rate and movement give me the steady background rhythm I compare each new day against.",
      },
      {
        id: "checkins",
        name: "Daily Check-ins",
        status: checkIns.length ? "Learning from it" : "Not started",
        active: true,
        body: "How you felt is the one thing sensors can't measure. Check-ins let me connect what your body did with how the day actually landed.",
      },
      {
        id: "arc",
        name: "Ciatta Arc\u2122",
        status: "Coming soon",
        active: false,
        body: "Continuous wearable sensing. It will fill in the hours in between, so I have less to guess at.",
      },
      {
        id: "webbee",
        name: "Webbee\u2122",
        status: "Coming soon",
        active: false,
        body: "Menstrual sensing. It will let me follow your cycle from your body directly, instead of from what you tell me.",
      },
    ];

    const timeline: TimelineStep[] = [];
    if (first)
      timeline.push({ label: "I started listening", when: monthYear(first) });
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
            ? "This became clear enough for me to expect it"
            : m.to >= 75
              ? "The same pattern held across enough days"
              : m.to >= 60
                ? "The same connection kept repeating"
                : "The first real pattern took shape",
        when: monthYear(m.reachedAt),
      });
    }

    timeline.push({
      label: understandings.length
        ? `Currently learning how ${focus.toLowerCase()} moves with your cycle`
        : "Waiting on the first thing you share",
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
        ? `I've been learning you for ${months} ${months === 1 ? "month" : "months"}. ${
            confirmed
              ? `${confirmed} thing${confirmed === 1 ? " is" : "s are"} now understood well enough to act on`
              : "Nothing is settled yet"
          }, ${forming ? `${forming} more ${forming === 1 ? "is" : "are"} still taking shape` : "and the rest is still open"}. Right now I'm paying closest attention to ${focus.toLowerCase()}.`
        : "I don't know you yet. The first thing you share is where our understanding starts.",
      "Every moment you share leaves me less to guess at.",
    ];


    return {
      hydrated: journey.hydrated,
      hasData: journey.hasData,
      observationCount: journey.observationCount,
      observationSummary,
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
