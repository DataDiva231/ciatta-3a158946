/**
 * Apple Health — client-safe contract.
 *
 * A browser cannot read HealthKit. Ciatta reads it through the native shell
 * (the iOS app hosting this experience), which exposes a small bridge on
 * `window.ciattaHealth`. This module is the only place the app talks to it: it
 * asks for consent, collects samples, and hands them to the server, which turns
 * them into Observations.
 */

export const APPLE_HEALTH_METRICS = [
  // Reproductive health
  "menstrual_cycle",
  "basal_body_temperature",
  "wrist_temperature",
  // Sleep
  "sleep",
  // Cardiovascular
  "heart_rate",
  "resting_heart_rate",
  "hrv",
  "walking_heart_rate_average",
  "vo2_max",
  // Respiratory
  "respiratory_rate",
  "blood_oxygen",
  // Activity
  "steps",
  "walking_distance",
  "active_energy",
  "workouts",
  "exercise_minutes",
  "standing_time",
  "flights_climbed",
  // Body measurements
  "body_weight",
  "body_fat_percentage",
  // Nutrition & hydration
  "water_intake",
  // Mental wellbeing
  "mindful_minutes",
  // Clinical (standard HealthKit quantity types — not Apple's separate,
  // specially-gated Clinical Health Records/FHIR feature)
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "blood_glucose",
] as const;

export type AppleHealthMetric = (typeof APPLE_HEALTH_METRICS)[number];

export const APPLE_HEALTH_LABELS: Record<AppleHealthMetric, string> = {
  menstrual_cycle: "Menstrual cycle",
  basal_body_temperature: "Basal body temperature",
  wrist_temperature: "Wrist temperature",
  sleep: "Sleep",
  heart_rate: "Heart rate",
  resting_heart_rate: "Resting heart rate",
  hrv: "Heart rate variability",
  walking_heart_rate_average: "Walking heart rate average",
  vo2_max: "VO₂ max",
  respiratory_rate: "Respiratory rate",
  blood_oxygen: "Blood oxygen",
  steps: "Steps",
  walking_distance: "Walking distance",
  active_energy: "Active energy",
  workouts: "Workouts",
  exercise_minutes: "Exercise minutes",
  standing_time: "Standing time",
  flights_climbed: "Flights climbed",
  body_weight: "Body weight",
  body_fat_percentage: "Body fat percentage",
  water_intake: "Water intake",
  mindful_minutes: "Mindful minutes",
  blood_pressure_systolic: "Blood pressure (systolic)",
  blood_pressure_diastolic: "Blood pressure (diastolic)",
  blood_glucose: "Blood glucose",
};

/** One HealthKit sample, normalised by the native bridge. */
export type AppleHealthSample = {
  metric: AppleHealthMetric;
  /** Stable HealthKit UUID, so re-importing the same sample changes nothing. */
  uuid?: string;
  start: string;
  end?: string;
  /** Numeric value in the metric's canonical unit (see the server mapper). */
  value: number;
  unit?: string;
  /** Extra fields the source carries: workout type, sleep stage, flow level. */
  context?: Record<string, string>;
};

type Bridge = {
  isAvailable?: () => boolean | Promise<boolean>;
  requestAuthorization: (metrics: readonly AppleHealthMetric[]) => Promise<AppleHealthMetric[]>;
  readSamples: (
    metrics: readonly AppleHealthMetric[],
    since: string,
  ) => Promise<AppleHealthSample[]>;
};

function bridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { ciattaHealth?: Bridge }).ciattaHealth;
  return candidate && typeof candidate.requestAuthorization === "function" ? candidate : null;
}

/** True only where HealthKit can actually be reached. */
export async function appleHealthAvailable(): Promise<boolean> {
  const b = bridge();
  if (!b) return false;
  if (!b.isAvailable) return true;
  try {
    return (await b.isAvailable()) === true;
  } catch {
    return false;
  }
}

/**
 * Asks the person, through iOS, for the metrics we support. Returns exactly
 * what they granted — never more. No consent, no read.
 */
export async function requestAppleHealthConsent(
  metrics: readonly AppleHealthMetric[] = APPLE_HEALTH_METRICS,
): Promise<AppleHealthMetric[]> {
  const b = bridge();
  if (!b) return [];
  const granted = await b.requestAuthorization(metrics);
  return (granted ?? []).filter((m): m is AppleHealthMetric =>
    (APPLE_HEALTH_METRICS as readonly string[]).includes(m),
  );
}

/** Reads granted metrics since a point in time. Nothing else is touched. */
export async function readAppleHealthSamples(
  metrics: readonly AppleHealthMetric[],
  since: string,
): Promise<AppleHealthSample[]> {
  const b = bridge();
  if (!b || !metrics.length) return [];
  const samples = await b.readSamples(metrics, since);
  return (samples ?? []).filter((s) =>
    (metrics as readonly string[]).includes(s?.metric as string),
  );
}
