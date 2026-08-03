/**
 * Features, from the app's side.
 *
 * A subscription to the Feature Service. No pipeline logic lives here.
 */
import { useEffect, useSyncExternalStore } from "react";

import { PROCESSING_VERSION } from "./model";
import { featureService, type FeatureSnapshot } from "./service";

const SERVER_SNAPSHOT: FeatureSnapshot = {
  sessionId: null,
  featureCount: 0,
  passCount: 0,
  latest: {},
  lastExtractedAt: null,
  extractionRate: null,
  lastLatencyMs: null,
  averageLatencyMs: null,
  averageQuality: null,
  averageConfidence: null,
  processingVersion: PROCESSING_VERSION,
};

export function useFeatures() {
  const snapshot = useSyncExternalStore(
    featureService.subscribe,
    featureService.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    featureService.start();
  }, []);

  return snapshot;
}
