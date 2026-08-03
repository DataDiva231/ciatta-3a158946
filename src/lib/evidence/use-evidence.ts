/**
 * Evidence, from the app's side.
 *
 * A subscription to the Evidence Service, for development diagnostics only.
 * Evidence is never rendered to users directly.
 */
import { useEffect, useSyncExternalStore } from "react";

import { evidenceService, EMPTY_EVIDENCE_SNAPSHOT, type EvidenceSnapshot } from "./service";

export function useEvidence(): EvidenceSnapshot {
  const snapshot = useSyncExternalStore(
    evidenceService.subscribe,
    evidenceService.getSnapshot,
    () => EMPTY_EVIDENCE_SNAPSHOT,
  );

  useEffect(() => {
    evidenceService.start();
  }, []);

  return snapshot;
}
