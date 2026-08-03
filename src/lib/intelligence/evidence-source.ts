/**
 * Evidence-to-Intelligence adapter.
 *
 * The only seam between the Evidence Layer and the Intelligence Engine. It
 * exposes a subscription and a read interface shaped the way the engine wants
 * them, so the engine imports this — never the Feature Service, the Observation
 * pipeline or Bluetooth. Swapping the evidence source means editing this file
 * alone.
 */
import type { BiologicalEvidence } from "@/lib/evidence/model";
import { evidenceService } from "@/lib/evidence/service";

export type EvidenceSource = {
  /** Begin producing evidence, if it isn't already. Safe to call repeatedly. */
  start: () => void;
  /** Published evidence, in the order it was persisted. */
  subscribe: (listener: (evidence: BiologicalEvidence[]) => void) => () => void;
  /** Trailing read for one session window. */
  read: (input: { sessionId: string; from: number; to: number }) => BiologicalEvidence[];
};

export const evidenceSource: EvidenceSource = {
  start: () => evidenceService.start(),
  subscribe: (listener) => evidenceService.subscribeEvidence(listener),
  read: ({ sessionId, from, to }) => evidenceService.query({ sessionId, from, to }),
};
