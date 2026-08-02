/**
 * Apple Health, from the app's side.
 *
 * Consent first (iOS asks, the person answers), then the granted metrics are
 * recorded on the server, then samples are read and handed to the engine. If the
 * native shell isn't there, nothing pretends to be connected.
 */
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  APPLE_HEALTH_METRICS,
  appleHealthAvailable,
  readAppleHealthSamples,
  requestAppleHealthConsent,
  type AppleHealthMetric,
} from "./apple-health";
import {
  appleHealthStatus,
  connectAppleHealth,
  disconnectAppleHealth,
  importAppleHealth,
} from "./apple-health.functions";
import { useSession } from "./session";

/** How far back a first import reaches. */
const HISTORY_DAYS = 30;

export function useAppleHealth() {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readStatus = useServerFn(appleHealthStatus);
  const grant = useServerFn(connectAppleHealth);
  const revoke = useServerFn(disconnectAppleHealth);
  const importSamples = useServerFn(importAppleHealth);

  const available = useQuery({
    queryKey: ["apple-health-available"],
    queryFn: () => appleHealthAvailable(),
  });

  const status = useQuery({
    queryKey: ["apple-health", userId],
    queryFn: () => readStatus(),
    // HealthKit is a native-only capability. Avoid creating an authenticated
    // server-function request on the web, where the result can only be unused.
    enabled: ready && Boolean(userId) && available.isSuccess && available.data === true,
    retry: false,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["apple-health", userId] });
    await queryClient.invalidateQueries({ queryKey: ["engine"] });
  }, [queryClient, userId]);

  /** Reads and imports everything currently granted. Safe to call repeatedly. */
  const sync = useCallback(
    async (metrics: readonly AppleHealthMetric[]) => {
      if (!metrics.length) return;
      const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
      const samples = await readAppleHealthSamples(metrics, since);
      if (samples.length) await importSamples({ data: { samples } });
      await refresh();
    },
    [importSamples, refresh],
  );

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const granted = await requestAppleHealthConsent(APPLE_HEALTH_METRICS);
      if (!granted.length) {
        setError("Apple Health isn't available here yet.");
        return false;
      }
      await grant({ data: { metrics: granted } });
      await sync(granted);
      return true;
    } catch (e) {
      console.error(e);
      setError("I couldn't reach Apple Health just now.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [grant, sync]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await revoke({ data: undefined });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [revoke, refresh]);

  return {
    connected: status.data?.connected ?? false,
    metrics: (status.data?.metrics ?? []) as AppleHealthMetric[],
    lastImportAt: status.data?.lastImportAt ?? null,
    available: available.data ?? false,
    /** False until the capability check has actually answered. */
    availabilityReady: available.isSuccess,
    busy,
    error,
    connect,
    disconnect,
    sync,
  };
}
