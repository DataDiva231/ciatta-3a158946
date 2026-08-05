import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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


function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns whether the write actually reached storage — callers use this to tell a real save from a silent one. */
function write(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return true;
  let ok = true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (quota, private mode) — the in-memory state below
    // still updates, so this session keeps working; the caller decides
    // whether a failed write here is worth telling the person about.
    ok = false;
  }
  // Let every mounted reader of this key refresh immediately.
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
  return ok;
}

/** Hydration-safe: starts at the fallback on both server and first client render. */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  // Mirrors `value` outside React state so update()/updateWith() can read
  // and chain against the latest write synchronously, without routing it
  // through a setState functional updater — see the note on updateWith.
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const initial = read<T>(key, fallback);
    valueRef.current = initial;
    setValue(initial);
    setHydrated(true);

    const sync = (e: Event) => {
      const changed = (e as CustomEvent<string>).detail;
      if (changed && changed !== key) return;
      const next = read<T>(key, fallback);
      valueRef.current = next;
      setValue(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      const next = read<T>(key, fallback);
      valueRef.current = next;
      setValue(next);
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
    (next: T): boolean => {
      valueRef.current = next;
      const ok = write(key, next);
      setValue(next);
      return ok;
    },
    [key],
  );

  /**
   * Merge against the very latest value — safe for rapid successive writes.
   *
   * This used to compute `next` and call write() from inside setValue's own
   * functional updater. write() dispatches SYNC_EVENT synchronously, which
   * every other mounted usePersistentState(key) instance listens for and
   * reacts to with its own setValue call — so a second component (anything
   * subscribed to the same key, e.g. ProductTour reading onboarding state)
   * ended up having its state set while React was still rendering this
   * component's update. React warns on that as "Cannot update a component
   * while rendering a different component," and rightly so — a functional
   * updater must stay pure. Reading/writing through the ref instead keeps
   * the same-tick chaining guarantee without nesting a side effect inside it.
   */
  const updateWith = useCallback(
    (fn: (prev: T) => T): boolean => {
      const next = fn(valueRef.current);
      valueRef.current = next;
      const ok = write(key, next);
      setValue(next);
      return ok;
    },
    [key],
  );

  return { value, update, updateWith, hydrated };
}

export function useCheckIns() {
  const { value, update, hydrated } = usePersistentState<CheckIn[]>(CHECKIN_KEY, []);

  const saveCheckIn = useCallback(
    (entry: Omit<CheckIn, "savedAt">): boolean => {
      const withMeta: CheckIn = { ...entry, savedAt: new Date().toISOString() };
      const next = [withMeta, ...value.filter((c) => c.day !== entry.day)];
      return update(next);
    },
    [value, update],
  );

  return { checkIns: value, latest: value[0] ?? null, saveCheckIn, hydrated };
}

/**
 * "Facts" used to be their own store (`ciatta.facts.v1`), written only by
 * Talk. Everywhere else — Teach's free-text box, First Observation — wrote
 * the same kind of thing (something said in your own words, not picked from
 * a list) as a `QuickAddEvent` with category "Note". That split meant a
 * symptom mentioned in conversation and the same symptom typed into Teach
 * were two disconnected records — and Talk's notes never reached the server
 * engine at all, since it only ever reads from events. `useLearnedFacts` now
 * reads and writes through `useQuickAddEvents` instead of its own store, so
 * every screen shares one record of what Ciatta has been told, regardless
 * of which screen it arrived through. (Depends on useQuickAddEvents below —
 * hoisting makes the call order fine, this comment is just for the reader.)
 */
export function useLearnedFacts() {
  const { events, addEvent, removeEvent, hydrated } = useQuickAddEvents();

  // One-time migration for anyone with facts still in the old store.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    let legacy: LearnedFact[];
    try {
      const raw = window.localStorage.getItem(FACTS_KEY);
      if (!raw) return;
      legacy = JSON.parse(raw) as LearnedFact[];
    } catch {
      return;
    }
    window.localStorage.removeItem(FACTS_KEY);
    for (const fact of legacy) {
      addEvent({
        category: "Note",
        value: fact.text,
        timestamp: fact.savedAt,
        metadata: { Note: fact.text },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const facts: LearnedFact[] = useMemo(
    () =>
      events
        .filter((e) => e.category === "Note")
        .map((e) => ({ id: e.id, text: e.value, savedAt: e.timestamp })),
    [events],
  );

  const addFact = useCallback(
    (text: string): boolean => {
      const { saved } = addEvent({
        category: "Note",
        value: text,
        timestamp: new Date().toISOString(),
        metadata: { Note: text },
      });
      return saved;
    },
    [addEvent],
  );

  const removeFact = useCallback((id: string): boolean => removeEvent(id), [removeEvent]);

  return { facts, addFact, removeFact, hydrated };
}

export function useQuickAddEvents() {
  const { value, update, hydrated } = usePersistentState<QuickAddEvent[]>(EVENTS_KEY, []);

  const addEvent = useCallback(
    (entry: Omit<QuickAddEvent, "id" | "type" | "createdAt">): { event: QuickAddEvent; saved: boolean } => {
      const event: QuickAddEvent = {
        id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "quick_add",
        createdAt: new Date().toISOString(),
        ...entry,
      };
      const saved = update([event, ...value]);
      return { event, saved };
    },
    [value, update],
  );

  const removeEvent = useCallback(
    (id: string): boolean => update(value.filter((e) => e.id !== id)),
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
