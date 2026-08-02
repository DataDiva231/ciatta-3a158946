/**
 * Connected sources — the client-safe contract.
 *
 * Every external source Ciatta can learn from is described here in exactly the
 * same shape, whatever it happens to be underneath: a native permission sheet
 * (Apple Health) or a hosted authorization page (Oura, Whoop, Fitbit). Screens
 * render this list; they never know how a source works.
 */

export const SOURCE_IDS = ["apple_health", "oura", "whoop", "fitbit"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

/** The only four states a source can be in, from the person's point of view. */
export type SourceStatus = "not_connected" | "connecting" | "connected" | "sync_error";

/** How authorization happens. Nothing else about a source differs to the UI. */
export type SourceAuthKind = "native" | "oauth";

export type SourceDescriptor = {
  id: SourceId;
  name: string;
  /** One calm line about what this source lets Ciatta see. */
  body: string;
  auth: SourceAuthKind;
  /** Plain-language list of what gets read. */
  reads: string[];
};

export const SOURCES: SourceDescriptor[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    body: "Sleep, heart rate, movement and cycle, straight from your iPhone.",
    auth: "native",
    reads: ["Sleep", "Heart rate", "Movement", "Cycle"],
  },
  {
    id: "oura",
    name: "Oura",
    body: "Nightly readiness, sleep stages and body temperature.",
    auth: "oauth",
    reads: ["Sleep", "Readiness", "Temperature", "Activity"],
  },
  {
    id: "whoop",
    name: "Whoop",
    body: "Recovery, strain and the nights behind them.",
    auth: "oauth",
    reads: ["Recovery", "Strain", "Sleep", "Workouts"],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    body: "Steps, sleep and resting heart rate over time.",
    auth: "oauth",
    reads: ["Steps", "Sleep", "Resting heart rate"],
  },
];

export function sourceById(id: string): SourceDescriptor | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** What a screen needs to draw one source card. */
export type SourceState = {
  id: SourceId;
  status: SourceStatus;
  lastSyncAt: string | null;
  connectedAt: string | null;
  /** Present only when status is sync_error. */
  error: string | null;
  /** True when the source can't be reached from this device or isn't set up yet. */
  unavailableReason: string | null;
};

export function statusLabel(status: SourceStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "sync_error":
      return "Sync error";
    default:
      return "Not connected";
  }
}
