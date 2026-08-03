/**
 * Stage: persist.
 *
 * The Feature Store: the single place extracted features live, and the single
 * place downstream layers read them from. Append-only, capped per session,
 * with queries by feature type, session and time range.
 */
import type { FeatureType, PhysiologicalFeature } from "./model";

const INDEX_KEY = "ciatta.features.sessions";
const LOG_KEY = (sessionId: string) => `ciatta.features.log.${sessionId}`;
const MAX_PER_SESSION = 1000;
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
const buffers = new Map<string, PhysiologicalFeature[]>();

export type FeatureQuery = {
  sessionId?: string;
  featureTypes?: FeatureType[];
  from?: number;
  to?: number;
  limit?: number;
};

export const featureStore = {
  listSessions(): string[] {
    return readJson<string[]>(INDEX_KEY, []);
  },

  read(sessionId: string): PhysiologicalFeature[] {
    const buffered = buffers.get(sessionId);
    if (buffered) return buffered;
    const stored = readJson<PhysiologicalFeature[]>(LOG_KEY(sessionId), []);
    buffers.set(sessionId, stored);
    return stored;
  },

  /** Append-only. Returns exactly what was written. */
  append(features: PhysiologicalFeature[]): PhysiologicalFeature[] {
    if (!features.length) return [];
    const sessionId = features[0]!.sessionId;
    const next = [...featureStore.read(sessionId), ...features]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_PER_SESSION);
    buffers.set(sessionId, next);
    writeJson(LOG_KEY(sessionId), next);

    const sessions = [sessionId, ...featureStore.listSessions().filter((id) => id !== sessionId)];
    for (const dropped of sessions.slice(MAX_SESSIONS)) {
      storage()?.removeItem(LOG_KEY(dropped));
      buffers.delete(dropped);
    }
    writeJson(INDEX_KEY, sessions.slice(0, MAX_SESSIONS));
    return features;
  },

  /** Retrieval by feature type, session and time range. */
  query(filter?: FeatureQuery): PhysiologicalFeature[] {
    const sessionIds = filter?.sessionId ? [filter.sessionId] : featureStore.listSessions();
    const types = filter?.featureTypes ? new Set(filter.featureTypes) : null;
    const found = sessionIds
      .flatMap((id) => featureStore.read(id))
      .filter((feature) => {
        if (types && !types.has(feature.featureType)) return false;
        if (filter?.from !== undefined && feature.timestamp < filter.from) return false;
        if (filter?.to !== undefined && feature.timestamp > filter.to) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    return filter?.limit ? found.slice(-filter.limit) : found;
  },

  /** Most recent value per feature type. */
  latestByType(sessionId?: string): Partial<Record<FeatureType, PhysiologicalFeature>> {
    const latest: Partial<Record<FeatureType, PhysiologicalFeature>> = {};
    for (const feature of featureStore.query({ sessionId })) {
      latest[feature.featureType] = feature;
    }
    return latest;
  },

  clear(): void {
    const store = storage();
    for (const sessionId of featureStore.listSessions()) store?.removeItem(LOG_KEY(sessionId));
    store?.removeItem(INDEX_KEY);
    buffers.clear();
  },
};
