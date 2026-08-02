/**
 * Sync — the one path every source takes into the Learning Loop.
 *
 * Read what's new, hand it over as Observations, record how it went. Failures
 * land on the connection as a sync error rather than disappearing, because the
 * person deserves to know a source has gone quiet.
 */
import type { SourceId } from "@/lib/health-sources";

import {
  readCredentials,
  saveConnection,
  readConnection,
  type ProviderCredentials,
} from "./connections.server";
import { provider as providerFor } from "./providers";

/** How far back a first sync reaches. */
const FIRST_SYNC_DAYS = 30;

export type SyncOutcome = { imported: number; status: "connected" | "sync_error" };

export async function syncProvider(
  userId: string,
  subjectId: string,
  id: SourceId,
): Promise<SyncOutcome> {
  const impl = providerFor(id);
  const connection = await readConnection(subjectId, id);
  if (connection.status === "not_connected") return { imported: 0, status: "sync_error" };

  // Native sources are pushed to by the device; nothing to pull here.
  if (impl.auth === "native") return { imported: 0, status: "connected" };

  let credentials = await readCredentials(subjectId, id);
  if (!credentials?.accessToken) {
    await saveConnection(subjectId, id, {
      status: "sync_error",
      error: "This source needs to be reconnected.",
    });
    return { imported: 0, status: "sync_error" };
  }

  try {
    const refreshed = impl.refresh ? await impl.refresh(credentials) : null;
    if (refreshed) {
      credentials = refreshed satisfies ProviderCredentials;
      await saveConnection(subjectId, id, { credentials });
    }

    const since =
      credentials.cursor ??
      new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000).toISOString();

    const { observations, cursor } = await impl.fetchObservations({ credentials, since });

    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    await runLearningLoop(userId, observations);

    await saveConnection(subjectId, id, {
      status: "connected",
      error: null,
      markSynced: true,
      credentials: { ...credentials, cursor: cursor ?? since },
    });
    return { imported: observations.length, status: "connected" };
  } catch (e) {
    const reason =
      e instanceof Error && e.message === "authorization_expired"
        ? "Access has expired. Reconnect to keep learning from it."
        : "I couldn't reach this source just now. I'll try again.";
    await saveConnection(subjectId, id, { status: "sync_error", error: reason });
    return { imported: 0, status: "sync_error" };
  }
}
