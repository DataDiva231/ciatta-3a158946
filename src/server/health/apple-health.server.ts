/**
 * Apple Health Adapter — turns HealthKit samples into Ciatta Observations.
 *
 * Apple Health is not a special case anywhere downstream: it produces
 * Observations and nothing else, so it flows through the same Learning Loop as
 * a voice memo or a check-in. Consent is recorded here and enforced here — a
 * sample for a metric the person did not grant is dropped, not stored.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  APPLE_HEALTH_METRICS,
  type AppleHealthMetric,
  type AppleHealthSample,
} from "@/lib/apple-health";
import type { ObservationInput } from "@/lib/engine-types";

export const PROVIDER = "apple_health";

export type HealthConnection = {
  connected: boolean;
  metrics: AppleHealthMetric[];
  connectedAt: string | null;
  lastImportAt: string | null;
};

const NONE: HealthConnection = {
  connected: false,
  metrics: [],
  connectedAt: null,
  lastImportAt: null,
};

function sanitiseMetrics(metrics: readonly string[]): AppleHealthMetric[] {
  const allowed = new Set<string>(APPLE_HEALTH_METRICS);
  return [...new Set(metrics.filter((m) => allowed.has(m)))] as AppleHealthMetric[];
}

export async function readConnection(subjectId: string): Promise<HealthConnection> {
  const { data, error } = await supabaseAdmin
    .from("health_connections")
    .select("metrics, connected_at, disconnected_at, last_import_at")
    .eq("subject_id", subjectId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.connected_at || data.disconnected_at) return NONE;
  return {
    connected: true,
    metrics: sanitiseMetrics(data.metrics ?? []),
    connectedAt: data.connected_at,
    lastImportAt: data.last_import_at,
  };
}

/** Records explicit consent for a set of metrics. Nothing is read before this. */
export async function grantConnection(
  subjectId: string,
  metrics: readonly string[],
): Promise<HealthConnection> {
  const granted = sanitiseMetrics(metrics);
  if (!granted.length) return NONE;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("health_connections").upsert(
    {
      subject_id: subjectId,
      provider: PROVIDER,
      metrics: granted,
      scopes: granted,
      status: "connected",
      last_error: null,
      connected_at: now,
      disconnected_at: null,
    },
    { onConflict: "subject_id,provider" },
  );
  if (error) throw error;
  return { connected: true, metrics: granted, connectedAt: now, lastImportAt: null };
}

/** Withdraws consent. Future reads stop immediately. */
export async function revokeConnection(subjectId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("health_connections")
    .update({ disconnected_at: new Date().toISOString(), metrics: [] })
    .eq("subject_id", subjectId)
    .eq("provider", PROVIDER);
  if (error) throw error;
}

export async function markImported(subjectId: string): Promise<void> {
  await supabaseAdmin
    .from("health_connections")
    .update({ last_import_at: new Date().toISOString() })
    .eq("subject_id", subjectId)
    .eq("provider", PROVIDER);
}

/* ------------------------------------------------------------------ mapping */

const round = (n: number, places = 0) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

function hoursAndMinutes(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Canonical units expected from the bridge:
 * sleep — hours, heart rate / resting heart rate — bpm, hrv — ms,
 * steps — count, walking distance — km, active energy — kcal,
 * workouts — minutes, menstrual cycle — flow level 0–3.
 */
function describe(sample: AppleHealthSample): { category: string; value: string } | null {
  switch (sample.metric) {
    case "sleep":
      return { category: "Sleep", value: hoursAndMinutes(sample.value) };
    case "heart_rate":
      return { category: "Heart rate", value: `${round(sample.value)} bpm` };
    case "resting_heart_rate":
      return { category: "Resting heart rate", value: `${round(sample.value)} bpm` };
    case "hrv":
      return { category: "Heart rate variability", value: `${round(sample.value)} ms` };
    case "steps":
      return { category: "Steps", value: `${round(sample.value)} steps` };
    case "walking_distance":
      return { category: "Movement", value: `${round(sample.value, 2)} km walked` };
    case "active_energy":
      return { category: "Activity", value: `${round(sample.value)} kcal active` };
    case "workouts": {
      const kind = sample.context?.["workoutType"] ?? "Workout";
      return { category: "Workout", value: `${kind}, ${Math.max(1, round(sample.value))} min` };
    }
    case "menstrual_cycle": {
      const flow = ["No flow", "Light", "Medium", "Heavy"][Math.round(sample.value)] ?? "Light";
      return { category: "Cycle", value: flow };
    }
    default:
      return null;
  }
}

/**
 * Converts granted samples into Observations. Anything unsupported, ungranted,
 * malformed or in the future is discarded silently — the record must stay clean.
 */
export function toObservations(
  samples: readonly AppleHealthSample[],
  granted: readonly AppleHealthMetric[],
): ObservationInput[] {
  const allowed = new Set<string>(granted);
  const tomorrow = Date.now() + 86_400_000;
  const out: ObservationInput[] = [];

  for (const sample of samples) {
    if (!sample || !allowed.has(sample.metric)) continue;
    if (typeof sample.value !== "number" || !Number.isFinite(sample.value)) continue;

    const at = new Date(sample.start);
    if (Number.isNaN(at.getTime()) || at.getTime() > tomorrow) continue;

    const described = describe(sample);
    if (!described) continue;

    out.push({
      externalId: `apple:${sample.metric}:${sample.uuid ?? at.toISOString()}`,
      occurredAt: at.toISOString(),
      source: "apple_health",
      category: described.category,
      value: described.value,
      context: {
        ...(sample.context ?? {}),
        metric: sample.metric,
        ...(sample.end ? { endedAt: sample.end } : {}),
        ...(sample.unit ? { unit: sample.unit } : {}),
      },
      // Measured, not remembered: device readings start out trusted.
      confidence: 0.92,
    });
  }

  // A single import is capped so one client cannot flood the record.
  return out.slice(0, 2000);
}
