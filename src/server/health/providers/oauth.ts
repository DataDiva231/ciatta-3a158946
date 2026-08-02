/**
 * One OAuth implementation, configured per source.
 *
 * Oura, Whoop and Fitbit differ only in endpoints, scopes and how their JSON
 * describes a day. That difference is data, declared below by each source, so
 * there is no provider-specific code path anywhere.
 */
import type { ObservationInput } from "@/lib/engine-types";
import type { SourceId } from "@/lib/health-sources";

import type { ProviderCredentials } from "../connections.server";
import type { AuthorizationStart, HealthProvider } from "./types";

/** One dataset the source exposes, and how a row of it reads in plain English. */
export type Dataset = {
  /** Path appended to apiBaseUrl. `{since}` is replaced with an ISO date. */
  path: string;
  /** Where the rows live in the response body. */
  collection: string;
  map: (row: Record<string, unknown>) => Omit<ObservationInput, "source"> | null;
};

export type OAuthProviderConfig = {
  id: SourceId;
  authorizeUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  datasets: Dataset[];
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export const hoursAndMinutes = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const numberAt = num;

export function createOAuthProvider(config: OAuthProviderConfig): HealthProvider {
  const credentialsFromEnv = () => ({
    clientId: process.env[config.clientIdEnv],
    clientSecret: process.env[config.clientSecretEnv],
  });

  return {
    id: config.id,
    auth: "oauth",
    scopes: config.scopes,

    configured() {
      const { clientId, clientSecret } = credentialsFromEnv();
      return Boolean(clientId && clientSecret);
    },

    beginAuthorization({ redirectUri, state }): AuthorizationStart {
      const { clientId } = credentialsFromEnv();
      if (!clientId) return { url: null, state, scopes: config.scopes };
      const url = new URL(config.authorizeUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", config.scopes.join(" "));
      url.searchParams.set("state", state);
      return { url: url.toString(), state, scopes: config.scopes };
    },

    async exchangeCode({ code, redirectUri }): Promise<ProviderCredentials> {
      const { clientId, clientSecret } = credentialsFromEnv();
      if (!clientId || !clientSecret) throw new Error("not_configured");
      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) throw new Error(`token_exchange_failed:${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      return {
        accessToken: str(body["access_token"]) ?? undefined,
        refreshToken: str(body["refresh_token"]) ?? undefined,
        expiresAt: num(body["expires_in"])
          ? new Date(Date.now() + (num(body["expires_in"]) as number) * 1000).toISOString()
          : undefined,
        scopes: config.scopes,
        externalAccountId: str(body["user_id"]) ?? undefined,
      };
    },

    async refresh(credentials): Promise<ProviderCredentials | null> {
      const { clientId, clientSecret } = credentialsFromEnv();
      if (!credentials.refreshToken || !clientId || !clientSecret) return null;
      const soon = Date.now() + 5 * 60_000;
      if (credentials.expiresAt && new Date(credentials.expiresAt).getTime() > soon) return null;
      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: credentials.refreshToken,
        }),
      });
      if (!res.ok) throw new Error(`token_refresh_failed:${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      return {
        ...credentials,
        accessToken: str(body["access_token"]) ?? credentials.accessToken,
        refreshToken: str(body["refresh_token"]) ?? credentials.refreshToken,
        expiresAt: num(body["expires_in"])
          ? new Date(Date.now() + (num(body["expires_in"]) as number) * 1000).toISOString()
          : credentials.expiresAt,
      };
    },

    async fetchObservations({ credentials, since }) {
      if (!credentials.accessToken) return { observations: [] };
      const day = since.slice(0, 10);
      const out: ObservationInput[] = [];

      for (const dataset of config.datasets) {
        const res = await fetch(
          `${config.apiBaseUrl}${dataset.path.replaceAll("{since}", day)}`,
          { headers: { authorization: `Bearer ${credentials.accessToken}` } },
        );
        if (res.status === 401 || res.status === 403) throw new Error("authorization_expired");
        if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
        const body = (await res.json()) as Record<string, unknown>;
        const rows = body[dataset.collection];
        if (!Array.isArray(rows)) continue;
        for (const row of rows.slice(0, 500)) {
          const mapped = dataset.map(row as Record<string, unknown>);
          if (mapped) out.push({ ...mapped, source: config.id });
        }
      }

      return { observations: out.slice(0, 2000), cursor: new Date().toISOString() };
    },
  };
}
