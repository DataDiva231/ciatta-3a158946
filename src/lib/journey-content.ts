import type { OrbTone } from "@/components/ciatta/discovery-orb";

export type Discovery = {
  id: string;
  title: string;
  confidenceLabel: string;
  confidence: number;
  tone: OrbTone;
  whyWeNoticed: string;
  signals: string[];
  whyThisMatters: string[];
  whatToTry: string;
};

export const todaysDiscovery: Discovery = {
  id: "sleep-consistency",
  title: "Recovery may depend more on sleep consistency than sleep duration.",
  confidenceLabel: "We're becoming confident.",
  confidence: 82,
  tone: "iris",
  whyWeNoticed:
    "Over the past seven days, your highest recovery scores followed nights with consistent sleep timing.",
  signals: ["Sleep", "Heart Rate", "Activity", "Cycle"],
  whyThisMatters: [
    "Your body appears to recover better from consistency than occasional long nights.",
    "Keeping a steady sleep schedule may be more important for your recovery than simply getting more hours.",
  ],
  whatToTry: "Go to bed within 30 minutes of your usual bedtime tonight.",
};

export const recentDiscoveries: Discovery[] = [
  {
    id: "earlier-bedtimes",
    title: "Earlier bedtimes improve your morning energy.",
    confidenceLabel: "We're becoming confident.",
    confidence: 76,
    tone: "clay",
    whyWeNoticed:
      "Over the past twelve bedtimes, your morning energy tends to be higher after an earlier night.",
    signals: ["Sleep", "Heart Rate", "Activity", "Mood"],
    whyThisMatters: [
      "Your body appears well suited to consistent, earlier sleep patterns.",
    ],
    whatToTry: "Try going to bed 30 minutes earlier for the next three nights.",
  },
  {
    id: "heavy-flow-recovery",
    title: "Heavy flow days appear to reduce recovery.",
    confidenceLabel: "We're becoming confident.",
    confidence: 68,
    tone: "moss",
    whyWeNoticed: "Recovery scores are lower on the day after heavier flow.",
    signals: ["Cycle", "Sleep", "Heart Rate", "Activity"],
    whyThisMatters: ["Your body uses more energy during heavier flow days."],
    whatToTry: "Prioritize rest and hydration the day after heavy flow.",
  },
  {
    id: "hydration-headaches",
    title: "Hydration may reduce afternoon headaches.",
    confidenceLabel: "We're beginning to see.",
    confidence: 61,
    tone: "stone-blue",
    whyWeNoticed:
      "Afternoon headaches were less frequent on days with higher water intake.",
    signals: ["Hydration", "Activity", "Sleep", "Stress"],
    whyThisMatters: [
      "Hydration appears to play a role in managing afternoon headaches.",
    ],
    whatToTry: "Aim for 8+ cups of water today.",
  },
];

export const emergingInsights = [
  {
    id: "stress-sleep",
    body: "We're beginning to notice a relationship between stress and sleep quality.",
    confidenceLabel: "We're beginning to see.",
    confidence: 43,
    tone: "wheat" as OrbTone,
  },
];

export const understandingMilestone = {
  label: "Recovery Confidence",
  from: 63,
  to: 82,
  note: "We've observed enough consistent evidence to become highly confident.",
};

export const journeyTimeline = [
  { month: "July", note: "Recovery understanding improved." },
  { month: "June", note: "Cycle prediction became more accurate." },
  { month: "May", note: "Sleep relationship discovered." },
  { month: "April", note: "Baseline established." },
];
