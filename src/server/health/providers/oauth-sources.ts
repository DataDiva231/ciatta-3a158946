/**
 * Oura, Whoop and Fitbit — declared, not coded.
 *
 * Each entry says where the source lives, what Ciatta asks permission for, and
 * how one row of its data reads as a sentence. When credentials are not yet
 * configured the authorization flow is a placeholder: the source is offered,
 * the connection simply cannot complete yet.
 */
import { createOAuthProvider, hoursAndMinutes, numberAt, str } from "./oauth";
import type { HealthProvider } from "./types";

const at = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = str(row[k]);
    if (v) return v;
  }
  return null;
};

export const ouraProvider: HealthProvider = createOAuthProvider({
  id: "oura",
  authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
  tokenUrl: "https://api.ouraring.com/oauth/token",
  apiBaseUrl: "https://api.ouraring.com",
  scopes: ["personal", "daily", "heartrate", "workout"],
  clientIdEnv: "OURA_CLIENT_ID",
  clientSecretEnv: "OURA_CLIENT_SECRET",
  datasets: [
    {
      path: "/v2/usercollection/daily_sleep?start_date={since}",
      collection: "data",
      map: (row) => {
        const occurredAt = at(row, ["day"]);
        const score = numberAt(row["score"]);
        if (!occurredAt || score === null) return null;
        return {
          externalId: `oura:daily_sleep:${occurredAt}`,
          occurredAt: new Date(`${occurredAt}T07:00:00Z`).toISOString(),
          category: "Sleep quality",
          value: `${Math.round(score)} out of 100`,
          confidence: 0.9,
        };
      },
    },
    {
      path: "/v2/usercollection/daily_readiness?start_date={since}",
      collection: "data",
      map: (row) => {
        const occurredAt = at(row, ["day"]);
        const score = numberAt(row["score"]);
        if (!occurredAt || score === null) return null;
        return {
          externalId: `oura:readiness:${occurredAt}`,
          occurredAt: new Date(`${occurredAt}T07:00:00Z`).toISOString(),
          category: "Readiness",
          value: `${Math.round(score)} out of 100`,
          confidence: 0.9,
        };
      },
    },
  ],
});

export const whoopProvider: HealthProvider = createOAuthProvider({
  id: "whoop",
  authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
  tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
  apiBaseUrl: "https://api.prod.whoop.com/developer",
  scopes: ["read:recovery", "read:sleep", "read:cycles", "read:workout"],
  clientIdEnv: "WHOOP_CLIENT_ID",
  clientSecretEnv: "WHOOP_CLIENT_SECRET",
  datasets: [
    {
      path: "/v1/recovery?start={since}",
      collection: "records",
      map: (row) => {
        const occurredAt = at(row, ["created_at", "updated_at"]);
        const score = (row["score"] ?? {}) as Record<string, unknown>;
        const recovery = numberAt(score["recovery_score"]);
        if (!occurredAt || recovery === null) return null;
        return {
          externalId: `whoop:recovery:${occurredAt}`,
          occurredAt: new Date(occurredAt).toISOString(),
          category: "Recovery",
          value: `${Math.round(recovery)}%`,
          confidence: 0.9,
        };
      },
    },
    {
      path: "/v1/activity/sleep?start={since}",
      collection: "records",
      map: (row) => {
        const occurredAt = at(row, ["start"]);
        const score = (row["score"] ?? {}) as Record<string, unknown>;
        const stage = (score["stage_summary"] ?? {}) as Record<string, unknown>;
        const asleepMs = numberAt(stage["total_in_bed_time_milli"]);
        if (!occurredAt || asleepMs === null) return null;
        return {
          externalId: `whoop:sleep:${occurredAt}`,
          occurredAt: new Date(occurredAt).toISOString(),
          category: "Sleep",
          value: hoursAndMinutes(asleepMs / 1000),
          confidence: 0.9,
        };
      },
    },
  ],
});

export const fitbitProvider: HealthProvider = createOAuthProvider({
  id: "fitbit",
  authorizeUrl: "https://www.fitbit.com/oauth2/authorize",
  tokenUrl: "https://api.fitbit.com/oauth2/token",
  apiBaseUrl: "https://api.fitbit.com",
  scopes: ["sleep", "activity", "heartrate", "profile"],
  clientIdEnv: "FITBIT_CLIENT_ID",
  clientSecretEnv: "FITBIT_CLIENT_SECRET",
  datasets: [
    {
      path: "/1.2/user/-/sleep/list.json?afterDate={since}&sort=asc&limit=100&offset=0",
      collection: "sleep",
      map: (row) => {
        const occurredAt = at(row, ["startTime", "dateOfSleep"]);
        const minutes = numberAt(row["minutesAsleep"]);
        if (!occurredAt || minutes === null) return null;
        return {
          externalId: `fitbit:sleep:${occurredAt}`,
          occurredAt: new Date(occurredAt).toISOString(),
          category: "Sleep",
          value: hoursAndMinutes(minutes * 60),
          confidence: 0.88,
        };
      },
    },
    {
      path: "/1/user/-/activities/steps/date/{since}/today.json",
      collection: "activities-steps",
      map: (row) => {
        const occurredAt = at(row, ["dateTime"]);
        const steps = Number(str(row["value"]) ?? "");
        if (!occurredAt || !Number.isFinite(steps)) return null;
        return {
          externalId: `fitbit:steps:${occurredAt}`,
          occurredAt: new Date(`${occurredAt}T20:00:00Z`).toISOString(),
          category: "Steps",
          value: `${Math.round(steps)} steps`,
          confidence: 0.88,
        };
      },
    },
  ],
});
