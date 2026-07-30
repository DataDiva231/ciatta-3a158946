import { useCallback, useEffect, useState } from "react";

export type CheckIn = {
  /** ISO date string, e.g. 2026-07-29 */
  day: string;
  sleepFelt: number; // 1-5
  energy: number; // 1-5
  mood: string;
  symptoms: string[];
  cycleStarted: boolean;
  savedAt: string;
};

export type LearnedFact = {
  id: string;
  text: string;
  savedAt: string;
};

/** A structured Quick Add log entry — the unit Today and Journey read from. */
export type QuickAddEvent = {
  id: string;
  /** Event type discriminator, so other loggers can share the same stream. */
  type: "quick_add";
  /** Top-level thing being taught, e.g. "Period Product". */
  category: string;
  /** Primary value for the category, e.g. "Tampon". */
  value: string;
  /** When the event actually happened (may be backdated by the timing step). */
  timestamp: string;
  /** When the entry was written. */
  createdAt: string;
  /** Optional extra fields, e.g. { Absorbency: "Super", Flow: "Heavy" }. */
  metadata?: Record<string, string>;
};

const CHECKIN_KEY = "ciatta.checkins.v1";
const FACTS_KEY = "ciatta.facts.v1";
const EVENTS_KEY = "ciatta.events.v1";
const SYNC_EVENT = "ciatta:store-change";


export const SEED_FACTS: LearnedFact[] = [
  { id: "seed-1", text: "Migraines usually arrive two days before your period.", savedAt: "" },
  { id: "seed-2", text: "Coffee after 2pm keeps you awake past midnight.", savedAt: "" },
  { id: "seed-3", text: "You feel strongest on the days right after your period ends.", savedAt: "" },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the demo still works in memory */
  }
  // Let every mounted reader of this key refresh immediately.
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
}

/** Hydration-safe: starts at the fallback on both server and first client render. */
function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);

    const sync = (e: Event) => {
      const changed = (e as CustomEvent<string>).detail;
      if (changed && changed !== key) return;
      setValue(read<T>(key, fallback));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read<T>(key, fallback));
    };
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      write(key, next);
    },
    [key],
  );

  return { value, update, hydrated };
}


export function useCheckIns() {
  const { value, update, hydrated } = usePersistentState<CheckIn[]>(CHECKIN_KEY, []);

  const saveCheckIn = useCallback(
    (entry: Omit<CheckIn, "savedAt">) => {
      const withMeta: CheckIn = { ...entry, savedAt: new Date().toISOString() };
      const next = [withMeta, ...value.filter((c) => c.day !== entry.day)];
      update(next);
    },
    [value, update],
  );

  return { checkIns: value, latest: value[0] ?? null, saveCheckIn, hydrated };
}

export function useLearnedFacts() {
  const { value, update, hydrated } = usePersistentState<LearnedFact[]>(FACTS_KEY, SEED_FACTS);

  const addFact = useCallback(
    (text: string) => {
      const fact: LearnedFact = {
        id: `fact-${Date.now()}`,
        text,
        savedAt: new Date().toISOString(),
      };
      update([fact, ...value]);
    },
    [value, update],
  );

  const removeFact = useCallback(
    (id: string) => update(value.filter((f) => f.id !== id)),
    [value, update],
  );

  return { facts: value, addFact, removeFact, hydrated };
}

export function todayKey() {
  return "2026-07-29";
}
