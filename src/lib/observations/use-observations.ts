/**
 * Observations, from the app's side.
 *
 * A subscription to the Observation Service. No pipeline logic lives here.
 */
import { useEffect, useSyncExternalStore } from "react";

import { observationService, type ObservationSnapshot } from "./service";

const SERVER_SNAPSHOT: ObservationSnapshot = {
  session: null,
  observationCount: 0,
  packetsReceived: 0,
  rejectedCount: 0,
  latest: null,
  lastRejection: null,
  averageQuality: null,
};

export function useObservations() {
  const snapshot = useSyncExternalStore(
    observationService.subscribe,
    observationService.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    observationService.start();
  }, []);

  return snapshot;
}
