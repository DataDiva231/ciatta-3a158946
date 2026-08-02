import { useCallback } from "react";

import { usePersistentState } from "./ciatta-store";

export const TOUR_KEY = "ciatta.tour.v1";

export type TourState = {
  /** True once the tour has been finished or skipped. */
  seen: boolean;
  /** Set when the user restarts the tour from Settings. */
  requested: boolean;
};

export const DEFAULT_TOUR: TourState = { seen: false, requested: false };

export type TourStep = {
  /** data-tour value of the element to highlight. */
  target: string;
  title: string;
  body: string;
  /** Where the card sits relative to the highlight. */
  place: "above" | "below";
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "today",
    title: "Today",
    body: "Your daily understanding begins here. Ciatta brings together the signals your body is sending and highlights what matters most today.",
    place: "above",
  },
  {
    target: "teach",
    title: "Teach",
    body: "Teach Ciatta through everyday moments. Log symptoms, period products, sleep, medications, activity, and other experiences so your understanding becomes more personal over time.",
    place: "above",
  },
  {
    target: "journey",
    title: "Journey",
    body: "Explore how your body changes over time. Discover patterns across your cycle, lifestyle, and different stages of life.",
    place: "above",
  },
  {
    target: "profile",
    title: "Profile",
    body: "Manage your account, connect wearable devices, adjust preferences, and personalize how Ciatta learns from your health information.",
    place: "below",
  },
];

export function useTour() {
  const { value, update, hydrated } = usePersistentState<TourState>(TOUR_KEY, DEFAULT_TOUR);
  const save = useCallback(
    (next: Partial<TourState>) => update({ ...DEFAULT_TOUR, ...value, ...next }),
    [value, update],
  );
  return { tour: { ...DEFAULT_TOUR, ...value }, save, hydrated };
}

/** Restarts the tour from Settings. */
export function requestTour() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOUR_KEY, JSON.stringify({ seen: true, requested: true }));
  window.dispatchEvent(new CustomEvent("ciatta:store-change", { detail: TOUR_KEY }));
}
