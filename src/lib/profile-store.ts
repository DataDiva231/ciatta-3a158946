import { useCallback } from "react";

import { usePersistentState } from "./ciatta-store";

export type Identity = {
  name: string;
  /** Data URL of the chosen photo, or "" for the monogram. */
  photo: string;
  lifeStage: string;
  goals: string[];
  interests: string[];
};

export const LIFE_STAGES = [
  "Cycling",
  "Trying to conceive",
  "Pregnant",
  "Postpartum",
  "Perimenopause",
  "Menopause",
];

export const GOALS = [
  "Sleep better",
  "Recover well",
  "Understand my cycle",
  "Steadier energy",
  "Train harder",
  "Lower stress",
];

export const INTERESTS = [
  "Hormones",
  "Nutrition",
  "Fertility",
  "Mental health",
  "Movement",
  "Skin",
  "Gut health",
];

export const DEFAULT_IDENTITY: Identity = {
  name: "",
  photo: "",
  lifeStage: "",
  goals: [],
  interests: [],
};

export function useIdentity() {
  const { value, update, hydrated } = usePersistentState<Identity>(
    "ciatta.identity.v1",
    DEFAULT_IDENTITY,
  );
  const save = useCallback(
    (next: Partial<Identity>) => update({ ...value, ...next }),
    [value, update],
  );
  return { identity: value, save, hydrated };
}

export type Settings = {
  notifications: {
    dailyRead: boolean;
    newUnderstanding: boolean;
    cycleShifts: boolean;
    weeklySummary: boolean;
    quietHours: boolean;
  };
  appearance: "light" | "dark" | "system";
  /** Connected app ids that are switched on. */
  apps: string[];
  privacy: {
    onDeviceOnly: boolean;
    improveCiatta: boolean;
    research: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  notifications: {
    dailyRead: true,
    newUnderstanding: true,
    cycleShifts: true,
    weeklySummary: false,
    quietHours: true,
  },
  appearance: "light",
  apps: [],
  privacy: { onDeviceOnly: true, improveCiatta: false, research: false },
};

export function useSettings() {
  const { value, update, hydrated } = usePersistentState<Settings>(
    "ciatta.settings.v1",
    DEFAULT_SETTINGS,
  );
  const save = useCallback(
    (next: Partial<Settings>) => update({ ...value, ...next }),
    [value, update],
  );
  return { settings: value, save, hydrated };
}

export const CONNECTED_APPS = [
  {
    id: "apple-health",
    name: "Apple Health",
    body: "Sleep timing, heart rate, HRV and movement.",
  },
  { id: "calendar", name: "Calendar", body: "Travel and late nights, for context only." },
  { id: "strava", name: "Strava", body: "Training load and session intensity." },
  { id: "oura", name: "Oura", body: "Nightly readiness and temperature." },
];
