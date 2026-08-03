/**
 * Stage: persist.
 *
 * The Session Store: the single place biological sessions live. Sessions hold
 * references and rollups only, so the log stays small and can be shipped to a
 * server later without touching the layers below.
 */
import { isoDate, type BiologicalSession, type SessionQuery } from "./model";

const LOG_KEY = "ciatta.sessions.log";
const MAX_SESSIONS = 40;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the in-memory buffer still serves this session */
  }
}

/** Mirror of the persisted log, newest last. */
let buffer: BiologicalSession[] | null = null;

const completedListeners = new Set<(session: BiologicalSession) => void>();

function all(): BiologicalSession[] {
  buffer ??= readJson<BiologicalSession[]>(LOG_KEY, []);
  return buffer;
}

export const sessionStore = {
  list(): BiologicalSession[] {
    return [...all()].sort((a, b) => a.startedAt - b.startedAt);
  },

  read(sessionId: string): BiologicalSession | null {
    return all().find((session) => session.id === sessionId) ?? null;
  },

  /** Insert or replace a session by id. Returns the stored value. */
  upsert(session: BiologicalSession): BiologicalSession {
    const next = [...all().filter((item) => item.id !== session.id), session]
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(-MAX_SESSIONS);
    buffer = next;
    writeJson(LOG_KEY, next);
    return session;
  },

  /** Stage: publish. Completed sessions are announced exactly once. */
  subscribeCompleted(listener: (session: BiologicalSession) => void): () => void {
    completedListeners.add(listener);
    return () => {
      completedListeners.delete(listener);
    };
  },

  publishCompleted(session: BiologicalSession): void {
    for (const listener of completedListeners) listener(session);
  },

  /** Retrieval by date, time range, duration, quality and lifecycle. */
  query(filter?: SessionQuery): BiologicalSession[] {
    const lifecycles = filter?.lifecycle ? new Set(filter.lifecycle) : null;
    const found = sessionStore.list().filter((session) => {
      if (filter?.date && isoDate(session.startedAt) !== filter.date) return false;
      if (filter?.from !== undefined && session.startedAt < filter.from) return false;
      if (filter?.to !== undefined && session.startedAt > filter.to) return false;
      if (filter?.minDurationMs !== undefined && session.durationMs < filter.minDurationMs)
        return false;
      if (filter?.maxDurationMs !== undefined && session.durationMs > filter.maxDurationMs)
        return false;
      if (filter?.minQuality !== undefined && session.quality.score < filter.minQuality)
        return false;
      if (lifecycles && !lifecycles.has(session.lifecycle)) return false;
      return true;
    });
    return filter?.limit ? found.slice(-filter.limit) : found;
  },

  byDate(date: string): BiologicalSession[] {
    return sessionStore.query({ date });
  },

  clear(): void {
    buffer = [];
    storage()?.removeItem(LOG_KEY);
  },
};
