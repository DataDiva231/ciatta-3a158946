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
  body: string;
  unlock: string;
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
  month: string;
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
};

const CHAPTER_TONES: OrbTone[] = ["stone-blue", "clay", "moss"];

/** The topic a discovery is really about — its strongest contributing signal. */
function topicOf(signals: string[]) {
  return (signals[0] ?? "Your body").replace(/-/g, " ");
}

/** The accented tail of the statement: the last few words carry the emphasis. */
function keywordOf(statement: string) {
  const words = statement.replace(/\.$/, "").split(" ");
  return words.slice(-2).join(" ");
}

function needFor(confidence: number) {
  if (confidence >= 70) return "3 more weeks of data would help";
  if (confidence >= 50) return "5 more observations would help";
  return "A few more logs would help";
}

export function useJourneyStory(): JourneyStory {
  const journey = useJourney();

  return useMemo(() => {
    const lead = journey.todaysDiscovery;
    const topic = topicOf(lead.signals);

    const shift: Shift = {
      statement: lead.title,
      keyword: keywordOf(lead.title),
      beforeLabel: "Three weeks ago",
      before: `${topic} was mostly unknown.`,
      todayLabel: "Today",
      today: `${topic} explains much more of your recovery.`,
    };

    const why: WhyItChanged = {
      body: lead.whyWeNoticed,
      unlock: lead.whatToTry,
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
        body: i.body,
        confidence: i.confidence,
        tone: i.tone,
        need: needFor(i.confidence),
      }));

    const chapters: Chapter[] = journey.timeline
      .slice(0, 3)
      .reverse()
      .map((t, index) => ({
        id: `${t.month}-${index}`,
        month: t.month,
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
    };
  }, [journey]);
}
