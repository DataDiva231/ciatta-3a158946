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
const MILESTONE_KEY = "ciatta.milestones.v1";

export const SYNC_EVENT = "ciatta:store-change";

/** Every key Ciatta owns — used by export and delete. */
export const ALL_KEYS = [
  CHECKIN_KEY,
  FACTS_KEY,
  EVENTS_KEY,
  MILESTONE_KEY,
  "ciatta.priorities.v1",
  "ciatta.identity.v1",
  "ciatta.settings.v1",
];

/** Nothing is known in advance. Facts only exist once the user teaches them. */
export const SEED_FACTS: LearnedFact[] = [];

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
export function usePersistentState<T>(key: string, fallback: T) {
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

  /** Merge against the very latest value — safe for rapid successive writes. */
  const updateWith = useCallback(
    (fn: (prev: T) => T) => {
      setValue((prev) => {
        const next = fn(prev);
        write(key, next);
        return next;
      });
    },
    [key],
  );

  return { value, update, updateWith, hydrated };
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

export function useQuickAddEvents() {
  const { value, update, hydrated } = usePersistentState<QuickAddEvent[]>(EVENTS_KEY, []);

  const addEvent = useCallback(
    (entry: Omit<QuickAddEvent, "id" | "type" | "createdAt">) => {
      const event: QuickAddEvent = {
        id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "quick_add",
        createdAt: new Date().toISOString(),
        ...entry,
      };
      update([event, ...value]);
      return event;
    },
    [value, update],
  );

  const removeEvent = useCallback(
    (id: string) => update(value.filter((e) => e.id !== id)),
    [value, update],
  );

  return { events: value, latest: value[0] ?? null, addEvent, removeEvent, hydrated };
}

/** A confidence threshold Ciatta crossed, recorded the moment it happened. */
export type Milestone = {
  id: string;
  label: string;
  from: number;
  to: number;
  /** Threshold that was crossed. */
  threshold: number;
  reachedAt: string;
  note: string;
};

export function useMilestones() {
  const { value, update, hydrated } = usePersistentState<Milestone[]>(MILESTONE_KEY, []);

  const recordMilestone = useCallback(
    (entry: Omit<Milestone, "id" | "reachedAt">) => {
      if (value.some((m) => m.threshold === entry.threshold && m.label === entry.label)) return;
      const milestone: Milestone = {
        id: `ms-${entry.label}-${entry.threshold}`,
        reachedAt: new Date().toISOString(),
        ...entry,
      };
      update([milestone, ...value]);
    },
    [value, update],
  );

  return { milestones: value, latest: value[0] ?? null, recordMilestone, hydrated };
}

export function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const PRIORITY_KEY = "ciatta.priorities.v1";

/** User-ordered health priorities Ciatta weighs when generating discoveries. */
export function usePriorities(defaults: string[]) {
  const { value, update, hydrated } = usePersistentState<string[]>(PRIORITY_KEY, []);

  // Keep stored order, append anything new, drop anything retired.
  const order = value.filter((p) => defaults.includes(p));
  const priorities = [...order, ...defaults.filter((d) => !order.includes(d))];

  const reorder = useCallback(
    (from: number, to: number) => {
      const next = [...priorities];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      update(next);
    },
    [priorities, update],
  );

  return { priorities, reorder, hydrated };
}

/** Everything Ciatta holds about you, as a JSON-serialisable object. */
export function exportAllData() {
  const data: Record<string, unknown> = {};
  for (const key of ALL_KEYS) {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return { exportedAt: new Date().toISOString(), app: "Ciatta", data };
}

/** Permanently forgets everything Ciatta has learned on this device. */
export function deleteAllData() {
  if (typeof window === "undefined") return;
  for (const key of ALL_KEYS) {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
  }
}
