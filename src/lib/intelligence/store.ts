/**
 * Stage: persist.
 *
 * The Intelligence Store: the single place intelligence lives, and the single
 * place downstream consumers read it from. Append-only, capped per session,
 * with queries by domain, confidence, learning state, session and time range.
 */
import type { Intelligence, IntelligenceDomain, IntelligenceQuery } from "./model";

const INDEX_KEY = "ciatta.intelligence.sessions";
const LOG_KEY = (sessionId: string) => `ciatta.intelligence.log.${sessionId}`;
const MAX_PER_SESSION = 400;
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
const buffers = new Map<string, Intelligence[]>();

export const intelligenceStore = {
  listSessions(): string[] {
    return readJson<string[]>(INDEX_KEY, []);
  },

  read(sessionId: string): Intelligence[] {
    const buffered = buffers.get(sessionId);
    if (buffered) return buffered;
    const stored = readJson<Intelligence[]>(LOG_KEY(sessionId), []);
    buffers.set(sessionId, stored);
    return stored;
  },

  /** Append-only. Returns exactly what was written. */
  append(intelligence: Intelligence[]): Intelligence[] {
    if (!intelligence.length) return [];
    const sessionId = intelligence[0]!.sessionId;
    const next = [...intelligenceStore.read(sessionId), ...intelligence]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_PER_SESSION);
    buffers.set(sessionId, next);
    writeJson(LOG_KEY(sessionId), next);

    const sessions = [
      sessionId,
      ...intelligenceStore.listSessions().filter((id) => id !== sessionId),
    ];
    for (const dropped of sessions.slice(MAX_SESSIONS)) {
      storage()?.removeItem(LOG_KEY(dropped));
      buffers.delete(dropped);
    }
    writeJson(INDEX_KEY, sessions.slice(0, MAX_SESSIONS));
    return intelligence;
  },

  /** Retrieval by domain, learning state, confidence, session and time range. */
  query(filter?: IntelligenceQuery): Intelligence[] {
    const sessionIds = filter?.sessionId
      ? [filter.sessionId]
      : intelligenceStore.listSessions();
    const domains = filter?.domains ? new Set(filter.domains) : null;
    const statuses = filter?.statuses ? new Set(filter.statuses) : null;
    const found = sessionIds
      .flatMap((id) => intelligenceStore.read(id))
      .filter((item) => {
        if (domains && !domains.has(item.domain)) return false;
        if (statuses && !statuses.has(item.status)) return false;
        if (filter?.minConfidence !== undefined && item.confidence < filter.minConfidence)
          return false;
        if (filter?.from !== undefined && item.timestamp < filter.from) return false;
        if (filter?.to !== undefined && item.timestamp > filter.to) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    return filter?.limit ? found.slice(-filter.limit) : found;
  },

  /** Most recent intelligence per domain. */
  latestByDomain(sessionId?: string): Partial<Record<IntelligenceDomain, Intelligence>> {
    const latest: Partial<Record<IntelligenceDomain, Intelligence>> = {};
    for (const item of intelligenceStore.query({ sessionId })) latest[item.domain] = item;
    return latest;
  },

  clear(): void {
    const store = storage();
    for (const sessionId of intelligenceStore.listSessions())
      store?.removeItem(LOG_KEY(sessionId));
    store?.removeItem(INDEX_KEY);
    buffers.clear();
  },
};
