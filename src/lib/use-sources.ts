/**
 * Connected sources, from the app's side.
 *
 * One hook for every source. Native sources ask the device for consent first;
 * hosted sources open their authorization page in a window and wait for the
 * callback to report back. Everything after that is identical.
 */
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  APPLE_HEALTH_METRICS,
  appleHealthAvailable,
  requestAppleHealthConsent,
} from "./apple-health";
import { SOURCES, sourceById, type SourceId, type SourceState } from "./health-sources";
import {
  beginSourceAuthorization,
  connectNativeSource,
  disconnectSource,
  listSources,
  syncSource,
} from "./health-sources.functions";
import { useSession } from "./session";
import { useAppleHealth } from "./use-apple-health";

const IDLE: SourceState[] = SOURCES.map((s) => ({
  id: s.id,
  status: "not_connected",
  lastSyncAt: null,
  connectedAt: null,
  error: null,
  unavailableReason: null,
}));

export function useSources() {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const health = useAppleHealth();
  const [busy, setBusy] = useState<SourceId | null>(null);
  const [message, setMessage] = useState<{ id: SourceId; text: string } | null>(null);

  const read = useServerFn(listSources);
  const begin = useServerFn(beginSourceAuthorization);
  const native = useServerFn(connectNativeSource);
  const drop = useServerFn(disconnectSource);
  const sync = useServerFn(syncSource);

  const sources = useQuery({
    queryKey: ["sources", userId],
    queryFn: () => read(),
    enabled: ready && Boolean(userId),
  });

  const nativeAvailable = useQuery({
    queryKey: ["native-health-available"],
    queryFn: () => appleHealthAvailable(),
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["sources", userId] });
    await queryClient.invalidateQueries({ queryKey: ["apple-health", userId] });
    await queryClient.invalidateQueries({ queryKey: ["engine"] });
  }, [queryClient, userId]);

  const connect = useCallback(
    async (id: SourceId) => {
      const descriptor = sourceById(id);
      if (!descriptor) return;
      setBusy(id);
      setMessage(null);
      try {
        if (descriptor.auth === "native") {
          if (!nativeAvailable.data) {
            setMessage({ id, text: "Apple Health is available in the iPhone app." });
            return;
          }
          const granted = await requestAppleHealthConsent(APPLE_HEALTH_METRICS);
          if (!granted.length) {
            setMessage({ id, text: "No permissions were granted." });
            return;
          }
          await native({ data: { provider: id, scopes: [...granted] } });
          await health.sync(granted);
          await refresh();
          return;
        }

        const started = await begin({
          data: {
            provider: id,
            redirectUri: `${window.location.origin}/connections/${id}/callback`,
          },
        });
        if (!started.url) {
          setMessage({
            id,
            text: "This connection isn't open yet. I'll let you know when it is.",
          });
          await refresh();
          return;
        }
        window.location.href = started.url;
      } catch (e) {
        console.error(e);
        setMessage({ id, text: "That didn't connect. Try once more." });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [begin, health, native, nativeAvailable.data, refresh],
  );

  const disconnect = useCallback(
    async (id: SourceId) => {
      setBusy(id);
      try {
        if (id === "apple_health") await health.disconnect();
        await drop({ data: { provider: id } });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [drop, health, refresh],
  );

  const resync = useCallback(
    async (id: SourceId) => {
      setBusy(id);
      try {
        await sync({ data: { provider: id } });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh, sync],
  );

  return {
    sources: sources.data ?? IDLE,
    loading: sources.isPending,
    nativeAvailable: nativeAvailable.data ?? false,
    nativeReady: nativeAvailable.isSuccess,
    busy,
    message,
    connect,
    disconnect,
    resync,
  };
}
