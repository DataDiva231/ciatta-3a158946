/**
 * Today's subscription to the Intelligence Store.
 *
 * The only thing the Today screen imports from the engine. It subscribes to
 * published intelligence, keeps the latest object per domain, and hands the
 * screen one ranked understanding plus a state. It never reaches into
 * evidence, features, observations or Bluetooth.
 */
import { useEffect, useMemo, useState } from "react";

import type { Intelligence, IntelligenceDomain } from "./model";
import { selectTodayIntelligence, type TodayIntelligence } from "./presentation";
import { intelligenceService } from "./service";
import { intelligenceStore } from "./store";

/** How often the view re-evaluates freshness with no new intelligence. */
const TICK_MS = 30_000;

function activeFromStore(): Intelligence[] {
  const sessionId = intelligenceStore.listSessions()[0];
  if (!sessionId) return [];
  return Object.values(intelligenceStore.latestByDomain(sessionId)).filter(
    (item): item is Intelligence => Boolean(item),
  );
}

export function useTodayIntelligence(): TodayIntelligence {
  const [active, setActive] = useState<Intelligence[]>([]);
  const [tick, setTick] = useState(0);
  const [hasSession, setHasSession] = useState(false);

  // Hydrate from the store, then follow published updates. Merging by domain
  // keeps the screen stable: an unchanged domain keeps its object identity, so
  // React re-renders text that actually changed and nothing else flickers.
  useEffect(() => {
    intelligenceService.start();
    setActive(activeFromStore());
    setHasSession(intelligenceStore.listSessions().length > 0);

    const unsubscribe = intelligenceService.subscribeIntelligence((published) => {
      setHasSession(true);
      setActive((current) => {
        const byDomain = new Map<IntelligenceDomain, Intelligence>(
          current.map((item) => [item.domain, item]),
        );
        let changed = false;
        for (const item of published) {
          const existing = byDomain.get(item.domain);
          if (existing && existing.id === item.id) continue;
          byDomain.set(item.domain, item);
          changed = true;
        }
        return changed ? [...byDomain.values()] : current;
      });
    });

    const timer = window.setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  return useMemo(
    () => selectTodayIntelligence(active, { hasSession }),
    // `tick` re-evaluates freshness and the "updated" label over time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, hasSession, tick],
  );
}
