/**
 * The provider registry. Everything else asks for a provider by id.
 */
import type { SourceId } from "@/lib/health-sources";

import { appleHealthProvider } from "./apple-health";
import { fitbitProvider, ouraProvider, whoopProvider } from "./oauth-sources";
import type { HealthProvider } from "./types";

const REGISTRY: Record<SourceId, HealthProvider> = {
  apple_health: appleHealthProvider,
  oura: ouraProvider,
  whoop: whoopProvider,
  fitbit: fitbitProvider,
};

export function provider(id: SourceId): HealthProvider {
  return REGISTRY[id];
}

export const allProviders = (): HealthProvider[] => Object.values(REGISTRY);

export type { HealthProvider } from "./types";
