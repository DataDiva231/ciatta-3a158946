/**
 * Intelligence, from the app's side.
 *
 * A subscription to the Intelligence Service, for development diagnostics only.
 * Screen integration belongs to a later sprint.
 */
import { useEffect, useSyncExternalStore } from "react";

import {
  intelligenceService,
  EMPTY_INTELLIGENCE_SNAPSHOT,
  type IntelligenceSnapshot,
} from "./service";

export function useIntelligence(): IntelligenceSnapshot {
  const snapshot = useSyncExternalStore(
    intelligenceService.subscribe,
    intelligenceService.getSnapshot,
    () => EMPTY_INTELLIGENCE_SNAPSHOT,
  );

  useEffect(() => {
    intelligenceService.start();
  }, []);

  return snapshot;
}
