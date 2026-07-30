import { useCallback } from "react";

import { usePersistentState } from "./ciatta-store";

export type Onboarding = {
  /** Index of the furthest step the user reached, so progress resumes. */
  step: number;
  completed: boolean;
  name: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  lifeStage: string;
  conditions: string[];
  medications: string[];
  supplements: string[];
  priorities: string[];
  primaryGoal: string;
  appleHealth: string[];
  appleHealthConnected: boolean;
  notifications: "allow" | "later" | "";
  /** Adaptive conversation answers, keyed by question id. */
  answers: Record<string, string[]>;
  /** Ordered ids of the questions Ciatta actually asked this user. */
  path: string[];
};

export const ONBOARDING_KEY = "ciatta.onboarding.v1";

export const DEFAULT_ONBOARDING: Onboarding = {
  step: 0,
  completed: false,
  name: "",
  birthMonth: "July",
  birthDay: "30",
  birthYear: "1992",
  heightFt: "5",
  heightIn: "6",
  weight: "",
  lifeStage: "",
  conditions: [],
  medications: [],
  supplements: [],
  priorities: [],
  primaryGoal: "",
  appleHealth: ["Sleep", "Heart Rate", "Activity", "Workouts", "Recovery"],
  appleHealthConnected: false,
  notifications: "",
  answers: {},
  path: [],
};

export function useOnboarding() {
  const { value, updateWith, hydrated } = usePersistentState<Onboarding>(
    ONBOARDING_KEY,
    DEFAULT_ONBOARDING,
  );
  const save = useCallback(
    (next: Partial<Onboarding>) =>
      updateWith((prev) => ({ ...DEFAULT_ONBOARDING, ...prev, ...next })),
    [updateWith],
  );
  return { data: { ...DEFAULT_ONBOARDING, ...value }, save, hydrated };
}

export const LIFE_STAGE_OPTIONS = [
  "Cycling",
  "Trying to Conceive",
  "Pregnant",
  "Postpartum",
  "Perimenopause",
  "Menopause",
  "Prefer not to say",
];

export const CONDITION_OPTIONS = [
  "PCOS",
  "Endometriosis",
  "Diabetes",
  "Prediabetes",
  "Thyroid",
  "Hypertension",
  "High Cholesterol",
  "Anxiety",
  "Depression",
];

export const MEDICATION_OPTIONS = [
  "GLP-1",
  "Metformin",
  "Birth Control",
  "Levothyroxine",
  "Sertraline",
  "Insulin",
  "Spironolactone",
  "Progesterone",
];

export const SUPPLEMENT_OPTIONS = [
  "Magnesium",
  "Iron",
  "Vitamin D",
  "Creatine",
  "Omega-3",
  "Protein",
  "Probiotics",
  "Folate",
];

export const PRIORITY_OPTIONS = [
  "Cycle",
  "Hormones",
  "Sleep",
  "Recovery",
  "Symptoms",
  "Mood",
  "Nutrition",
  "Metabolic Health",
  "Weight Management",
  "Longevity",
  "Menopause",
];

export const GOAL_OPTIONS = [
  "Improve Sleep",
  "Increase Energy",
  "Understand Symptoms",
  "Lose Weight",
  "Improve Recovery",
  "Prepare for Pregnancy",
  "Manage Menopause",
  "Feel Healthier",
  "Other",
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
