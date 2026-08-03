/**
 * Stage: persist locally.
 *
 * An append-only log, organised by session and kept in timestamp order. No
 * cloud, no mutation: writes only ever add. Storage is capped per session so a
 * long stream can't exhaust the browser quota — the oldest entries drop first.
 */
import type { BiologicalObservation, ObservationSession, SensorType } from "./model";

const SESSIONS_KEY = "ciatta.observations.sessions";
const LOG_KEY = (sessionId: string) => `ciatta.observations.log.${sessionId}`;
const MAX_PER_SESSION = 2000;
const MAX_SESSIONS = 20;

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

/** Mirror of the persisted log, so reads stay cheap while streaming. */
const buffers = new Map<string, BiologicalObservation[]>();

export const observationStore = {
  listSessions(): ObservationSession[] {
    return readJson<ObservationSession[]>(SESSIONS_KEY, []);
  },

  openSession(session: ObservationSession): void {
    const sessions = [session, ...observationStore.listSessions().filter((s) => s.id !== session.id)];
    const kept = sessions.slice(0, MAX_SESSIONS);
    for (const dropped of sessions.slice(MAX_SESSIONS)) {
      storage()?.removeItem(LOG_KEY(dropped.id));
      buffers.delete(dropped.id);
    }
    writeJson(SESSIONS_KEY, kept);
    buffers.set(session.id, []);
  },

  touchSession(sessionId: string, at: number): void {
    const sessions = observationStore.listSessions().map((session) =>
      session.id === sessionId ? { ...session, lastObservationAt: at } : session,
    );
    writeJson(SESSIONS_KEY, sessions);
  },

  /** Append-only. Returns what was written, unmodified. */
  append(observations: BiologicalObservation[]): BiologicalObservation[] {
    if (!observations.length) return [];
    const sessionId = observations[0]!.sessionId;
    const existing = observationStore.read(sessionId);
    const next = [...existing, ...observations]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_PER_SESSION);
    buffers.set(sessionId, next);
    writeJson(LOG_KEY(sessionId), next);
    observationStore.touchSession(sessionId, observations[observations.length - 1]!.timestamp);
    return observations;
  },

  read(sessionId: string): BiologicalObservation[] {
    const buffered = buffers.get(sessionId);
    if (buffered) return buffered;
    const stored = readJson<BiologicalObservation[]>(LOG_KEY(sessionId), []);
    buffers.set(sessionId, stored);
    return stored;
  },

  /** Retrieval by sensor type and time range, across one session or all of them. */
  query(filter?: {
    sessionId?: string;
    sensorTypes?: SensorType[];
    from?: number;
    to?: number;
    limit?: number;
  }): BiologicalObservation[] {
    const sessionIds = filter?.sessionId
      ? [filter.sessionId]
      : observationStore.listSessions().map((session) => session.id);
    const all = sessionIds.flatMap((id) => observationStore.read(id));
    const types = filter?.sensorTypes ? new Set(filter.sensorTypes) : null;
    const found = all
      .filter((observation) => {
        if (types && !types.has(observation.sensorType)) return false;
        if (filter?.from !== undefined && observation.timestamp < filter.from) return false;
        if (filter?.to !== undefined && observation.timestamp > filter.to) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    return filter?.limit ? found.slice(-filter.limit) : found;
  },

  clear(): void {
    const store = storage();
    for (const session of observationStore.listSessions()) {
      store?.removeItem(LOG_KEY(session.id));
    }
    store?.removeItem(SESSIONS_KEY);
    buffers.clear();
  },
};
