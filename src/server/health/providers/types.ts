/**
 * The provider interface. Every connected source implements exactly this, and
 * nothing about a source may leak past it: the rest of Ciatta only sees
 * Observations flowing into the Learning Loop.
 */
import type { ObservationInput } from "@/lib/engine-types";
import type { SourceAuthKind, SourceId } from "@/lib/health-sources";

import type { ProviderCredentials } from "../connections.server";

export type AuthorizationStart = {
  /** Where the person is sent to authorize, or null for native sources. */
  url: string | null;
  /** Opaque value echoed back on the callback. */
  state: string;
  scopes: string[];
};

export type HealthProvider = {
  id: SourceId;
  auth: SourceAuthKind;
  scopes: string[];
  /** False until API credentials for this source are configured. */
  configured(): boolean;
  /** OAuth sources only. */
  beginAuthorization?(args: { redirectUri: string; state: string }): AuthorizationStart;
  exchangeCode?(args: { code: string; redirectUri: string }): Promise<ProviderCredentials>;
  /** Refreshes an expiring token. Returns null when nothing needed changing. */
  refresh?(credentials: ProviderCredentials): Promise<ProviderCredentials | null>;
  /** Pulls anything new since a point in time, already mapped to Observations. */
  fetchObservations(args: {
    credentials: ProviderCredentials;
    since: string;
  }): Promise<{ observations: ObservationInput[]; cursor?: string }>;
  /**
   * Native sources are pushed to instead of pulled from: the device hands over
   * samples and the provider maps them under the granted scopes.
   */
  ingest?(payload: unknown, granted: readonly string[]): ObservationInput[];
};
