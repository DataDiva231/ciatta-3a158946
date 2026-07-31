import { useMemo } from "react";

import type { OrbTone } from "@/components/ciatta/discovery-orb";
import { useJourney } from "./journey-data";

/**
 * Journey as an edited narrative, not a feed.
 *
 * Four acts, derived from the same live data the rest of Ciatta reads:
 *   1. Something became clearer   (the biggest shift since the last visit)
 *   2. Why it changed             (the evidence, and what it unlocks)
 *   3. What's becoming clearer next (what Ciatta is close to understanding)
 *   4. Your story                 (only the moments that mattered)
 */

export type Shift = {
  statement: string;
  /** The few words inside the statement that carry the accent. */
  keyword: string;
  beforeLabel: string;
  before: string;
  todayLabel: string;
  today: string;
};

export type WhyItChanged = {
  /** What changed. */
  what: string;
  /** Why it happened — in plain, human language. */
  why: string;
  /** Why it matters for what comes next. */
  matters: string;
};

export type NextUnderstanding = {
  id: string;
  body: string;
  confidence: number;
  tone: OrbTone;
  need: string;
};

export type Chapter = {
  id: string;
  /** A narrative chapter name, not a calendar month. */
  chapter: string;
  note: string;
  tone: OrbTone;
};

export type JourneyStory = {
  hydrated: boolean;
  hasData: boolean;
  shift: Shift;
  why: WhyItChanged;
  next: NextUnderstanding[];
  chapters: Chapter[];
  understanding: number;
  closing: string;
};

const CHAPTER_TONES: OrbTone[] = ["stone-blue", "clay", "moss", "wheat"];

/** Chapters of understanding, oldest first. */
const CHAPTER_NAMES = [
  "First clue",
  "First connection",
  "Turning point",
  "New understanding",
  "Growing clearer",
];


/** The topic a discovery is really about — its strongest contributing signal. */
function topicOf(signals: string[]) {
  return (signals[0] ?? "your body").replace(/-/g, " ").toLowerCase();
}

/** The accented tail of the statement: the last few words carry the emphasis. */
function keywordOf(statement: string) {
  const words = statement.replace(/\.$/, "").split(" ");
  return words.slice(-3).join(" ");
}

function needFor(confidence: number) {
  if (confidence >= 70) return "A few more weeks and this will settle";
  if (confidence >= 50) return "A handful more days will tell me more";
  return "Still early — I'm listening";
}

/** Curiosity, not a task — one short sentence about the relationship itself. */
function curiosityOf(body: string) {
  const clean = body.replace(/\.$/, "").trim();

  const pair = clean.match(/between\s+(.+?)\s+and\s+(.+)$/i);
  if (pair) {
    const [, a, b] = pair;
    return `I'm beginning to see how ${a.toLowerCase()} shapes ${b
      .toLowerCase()
      .replace(/^(your|the|how you|how your)\s+/, "your ")}.`;
  }

  const stripped = clean.replace(
    /^((?:we|i)(?:'re|'m| am| are)\s+(?:beginning to\s+)?(?:notice|noticing|see|seeing|understand|understanding)\s+)/i,
    "",
  );
  const lowered = stripped.charAt(0).toLowerCase() + stripped.slice(1);
  return `I'm beginning to see ${lowered}.`;
}

export function useJourneyStory(): JourneyStory {
  const journey = useJourney();

  return useMemo(() => {
    const lead = journey.todaysDiscovery;
    const topic = topicOf(lead.signals);

    const statement = `Your ${topic} is becoming easier to understand.`;

    const shift: Shift = {
      statement,
      keyword: keywordOf(statement),
      beforeLabel: "Before",
      before: `${topic.charAt(0).toUpperCase()}${topic.slice(1)} felt unpredictable — it was hard to tell what made a difference.`,
      todayLabel: "Today",
      today: `You can begin to recognise what your ${topic} responds to.`,
    };

    const why: WhyItChanged = {
      what: lead.title,
      why: lead.whyWeNoticed,
      matters: `Future ${topic} guidance will now become more personal.`,
    };

    const next: NextUnderstanding[] = (
      journey.emergingInsights.length
        ? journey.emergingInsights
        : journey.recentDiscoveries.map((d) => ({
            id: d.id,
            body: d.title,
            confidenceLabel: d.confidenceLabel,
            confidence: d.confidence,
            tone: d.tone,
          }))
    )
      .slice(0, 2)
      .map((i) => ({
        id: i.id,
        body: curiosityOf(i.body),
        confidence: i.confidence,
        tone: i.tone,
        need: needFor(i.confidence),
      }));

    const entries = journey.timeline.slice(0, 4).reverse();
    const chapters: Chapter[] = entries.map((t, index) => ({
      id: `${t.month}-${index}`,
      chapter:
        CHAPTER_NAMES[
          Math.min(
            CHAPTER_NAMES.length - 1,
            index + Math.max(0, CHAPTER_NAMES.length - entries.length - 1),
          )
        ],
      note: t.note,
      tone: CHAPTER_TONES[index % CHAPTER_TONES.length],
    }));

    return {
      hydrated: journey.hydrated,
      hasData: journey.hasData,
      shift,
      why,
      next,
      chapters,
      understanding: journey.milestone.to,
      closing: journey.hasData
        ? "Your story is still unfolding. I'll tell you when something becomes clearer."
        : "Every new understanding makes your body a little easier to recognise.",
    };
  }, [journey]);
}

