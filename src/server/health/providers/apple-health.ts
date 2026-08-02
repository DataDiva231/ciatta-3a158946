/**
 * Apple Health, expressed as a provider.
 *
 * It is the one native source: iOS asks, the person answers, and the shell
 * pushes samples in. The mapping already lives in the Apple Health adapter, so
 * this file only adapts it to the shared interface.
 */
import type { AppleHealthMetric, AppleHealthSample } from "@/lib/apple-health";
import { APPLE_HEALTH_METRICS } from "@/lib/apple-health";

import { toObservations } from "../apple-health.server";
import type { HealthProvider } from "./types";

export const appleHealthProvider: HealthProvider = {
  id: "apple_health",
  auth: "native",
  scopes: [...APPLE_HEALTH_METRICS],

  // HealthKit needs no server credentials; iOS holds the consent.
  configured() {
    return true;
  },

  ingest(payload, granted) {
    const samples = Array.isArray(payload) ? (payload as AppleHealthSample[]) : [];
    return toObservations(samples, granted as readonly AppleHealthMetric[]);
  },

  // Nothing is pulled: the device pushes. Scheduled sync is a no-op here.
  async fetchObservations() {
    return { observations: [] };
  },
};
