/**
 * Today's subscription to the Intelligence Store.
 *
 * The only thing the Today screen imports from the engine. It subscribes once,
 * keeps the latest object per domain, and hands the screen one deterministic
 * understanding plus a state. It never reaches into evidence, features,
 * observations or Bluetooth.
 *
 * Stability is the point of this file: the subscription is created once, the
 * selection is memoised, and a new view-model object is only handed to React
 * when the signature — what the screen would actually show — changes. Live
 * intelligence can arrive as often as it likes without causing a flicker.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import type { Intelligence, IntelligenceDomain } from "./model";
import {
  selectTodayIntelligence,
  type TodayIntelligence,
  type TodayPhase,
} from "./presentation";
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

/** Merge published intelligence by domain, preserving identity where unchanged. */
function mergeByDomain(current: Intelligence[], published: Intelligence[]): Intelligence[] {
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
}

export function useTodayIntelligence(): TodayIntelligence {
  const [active, setActive] = useState<Intelligence[]>([]);
  const [tick, setTick] = useState(0);
  const [hasSession, setHasSession] = useState(false);
  const [phase, setPhase] = useState<TodayPhase>("initializing");

  // One subscription for the life of the screen. Any failure to reach or read
  // the store becomes an honest, user-facing state rather than a crash.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    try {
      intelligenceService.start();
      setActive(activeFromStore());
      setHasSession(intelligenceStore.listSessions().length > 0);

      unsubscribe = intelligenceService.subscribeIntelligence((published) => {
        if (cancelled) return;
        try {
          setHasSession(true);
          setActive((current) => mergeByDomain(current, published));
        } catch {
          setPhase("failed");
        }
      });

      setPhase("live");
    } catch {
      setPhase("failed");
    }

    const timer = window.setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.clearInterval(timer);
    };
  }, []);

  const selected = useMemo(
    () => selectTodayIntelligence(active, { hasSession, phase }),
    // `tick` re-evaluates freshness and the "updated" label over time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, hasSession, phase, tick],
  );

  // Change detection: hold the previous view-model while the screen would look
  // identical, so nothing downstream re-renders on a no-op update.
  const held = useRef<TodayIntelligence>(selected);
  if (held.current.signature !== selected.signature) held.current = selected;
  return held.current;
}
