/**
 * Stage: persist.
 *
 * The Evidence Store: the single place biological evidence lives, and the
 * single place the Intelligence Engine reads it from. Append-only, capped per
 * session, with queries by evidence type, session and time range.
 */
import type { BiologicalEvidence, EvidenceType } from "./model";

const INDEX_KEY = "ciatta.evidence.sessions";
const LOG_KEY = (sessionId: string) => `ciatta.evidence.log.${sessionId}`;
const MAX_PER_SESSION = 600;
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
const buffers = new Map<string, BiologicalEvidence[]>();

export type EvidenceQuery = {
  sessionId?: string;
  evidenceTypes?: EvidenceType[];
  from?: number;
  to?: number;
  limit?: number;
};

export const evidenceStore = {
  listSessions(): string[] {
    return readJson<string[]>(INDEX_KEY, []);
  },

  read(sessionId: string): BiologicalEvidence[] {
    const buffered = buffers.get(sessionId);
    if (buffered) return buffered;
    const stored = readJson<BiologicalEvidence[]>(LOG_KEY(sessionId), []);
    buffers.set(sessionId, stored);
    return stored;
  },

  /** Append-only. Returns exactly what was written. */
  append(evidence: BiologicalEvidence[]): BiologicalEvidence[] {
    if (!evidence.length) return [];
    const sessionId = evidence[0]!.sessionId;
    const next = [...evidenceStore.read(sessionId), ...evidence]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_PER_SESSION);
    buffers.set(sessionId, next);
    writeJson(LOG_KEY(sessionId), next);

    const sessions = [sessionId, ...evidenceStore.listSessions().filter((id) => id !== sessionId)];
    for (const dropped of sessions.slice(MAX_SESSIONS)) {
      storage()?.removeItem(LOG_KEY(dropped));
      buffers.delete(dropped);
    }
    writeJson(INDEX_KEY, sessions.slice(0, MAX_SESSIONS));
    return evidence;
  },

  /** Retrieval by evidence type, session and time range. */
  query(filter?: EvidenceQuery): BiologicalEvidence[] {
    const sessionIds = filter?.sessionId ? [filter.sessionId] : evidenceStore.listSessions();
    const types = filter?.evidenceTypes ? new Set(filter.evidenceTypes) : null;
    const found = sessionIds
      .flatMap((id) => evidenceStore.read(id))
      .filter((item) => {
        if (types && !types.has(item.evidenceType)) return false;
        if (filter?.from !== undefined && item.timestamp < filter.from) return false;
        if (filter?.to !== undefined && item.timestamp > filter.to) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    return filter?.limit ? found.slice(-filter.limit) : found;
  },

  /** Most recent evidence per type. */
  latestByType(sessionId?: string): Partial<Record<EvidenceType, BiologicalEvidence>> {
    const latest: Partial<Record<EvidenceType, BiologicalEvidence>> = {};
    for (const item of evidenceStore.query({ sessionId })) latest[item.evidenceType] = item;
    return latest;
  },

  clear(): void {
    const store = storage();
    for (const sessionId of evidenceStore.listSessions()) store?.removeItem(LOG_KEY(sessionId));
    store?.removeItem(INDEX_KEY);
    buffers.clear();
  },
};
