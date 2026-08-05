/**
 * Registers the native CiattaHealth Capacitor plugin (ios/App/App/
 * CiattaHealthPlugin.swift) and exposes it as `window.ciattaHealth`, the
 * plain bridge shape `src/lib/apple-health.ts` already expects.
 *
 * Exported as a function and explicitly called from routes/__root.tsx,
 * rather than run as a bare side-effect import — package.json declares
 * `"sideEffects": false` for the whole project, so a side-effect-only
 * import with no consumed export gets silently tree-shaken out of every
 * bundle. A called, named export survives that.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

import type { AppleHealthMetric, AppleHealthSample } from "@/lib/apple-health";

interface CiattaHealthNativePlugin {
  isAvailable(): Promise<{ value: boolean }>;
  requestAuthorization(options: { metrics: string[] }): Promise<{ granted: string[] }>;
  readSamples(options: {
    metrics: string[];
    since: string;
  }): Promise<{ samples: AppleHealthSample[] }>;
}

export function registerCiattaHealthPlugin(): void {
  if (!Capacitor.isNativePlatform()) return;

  const native = registerPlugin<CiattaHealthNativePlugin>("CiattaHealth");

  (window as unknown as { ciattaHealth: unknown }).ciattaHealth = {
    isAvailable: async () => (await native.isAvailable()).value,
    requestAuthorization: async (metrics: readonly AppleHealthMetric[]) =>
      (await native.requestAuthorization({ metrics: [...metrics] }))
        .granted as AppleHealthMetric[],
    readSamples: async (metrics: readonly AppleHealthMetric[], since: string) =>
      (await native.readSamples({ metrics: [...metrics], since })).samples,
  };
}
