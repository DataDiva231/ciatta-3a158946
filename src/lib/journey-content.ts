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
  confidenceLabel: "This is becoming clear.",
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
    confidenceLabel: "This is becoming clear.",
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
    confidenceLabel: "This is becoming clear.",
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
    confidenceLabel: "I'm beginning to notice this.",
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
    body: "I'm beginning to notice a connection between stress and how you sleep.",
    confidenceLabel: "I'm beginning to notice this.",
    confidence: 43,
    tone: "wheat" as OrbTone,
  },
];

export const understandingMilestone = {
  label: "Recovery",
  from: 63,
  to: 82,
  note: "I've seen the same thing enough times that it's become clear.",
};

export const journeyTimeline = [
  { month: "July", note: "Your recovery became easier to understand." },
  { month: "June", note: "Your cycle became easier to recognise." },
  { month: "May", note: "I noticed how sleep connects to your days." },
  { month: "April", note: "I began learning your rhythm." },
];

