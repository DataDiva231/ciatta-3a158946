/**
 * Sessions, from the app's side.
 *
 * A subscription to the Session Service, for development diagnostics only.
 * User-facing session summaries belong to a later sprint.
 */
import { useEffect, useSyncExternalStore } from "react";

import { EMPTY_SESSION_SNAPSHOT, sessionService, type SessionSnapshot } from "./service";

export function useSessions(): SessionSnapshot {
  const snapshot = useSyncExternalStore(
    sessionService.subscribe,
    sessionService.getSnapshot,
    () => EMPTY_SESSION_SNAPSHOT,
  );

  useEffect(() => {
    sessionService.start();
  }, []);

  return snapshot;
}
