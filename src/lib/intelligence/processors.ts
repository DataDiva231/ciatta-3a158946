/**
 * Domain processors — understanding only, no recommendations.
 *
 * Each processor reads one window of evidence and states, in plain language,
 * what it currently understands about its domain. Nothing here talks to the
 * UI, and nothing here advises the person.
 */
import type { BiologicalEvidence, EvidenceType } from "@/lib/evidence/model";

import type { IntelligenceProcessor, IntelligenceWindow } from "./model";

function samples(window: IntelligenceWindow, type: EvidenceType): BiologicalEvidence[] {
  return window.byType[type] ?? [];
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Cardiovascular evidence → how the heart is currently behaving. */
const cardiovascular: IntelligenceProcessor = {
  domain: "cardiovascular",
  requiredEvidence: ["cardiovascular"],
  idealEvidence: 6,
  changeThreshold: 0.12,
  understand: (window) => {
    const evidence = samples(window, "cardiovascular");
    if (!evidence.length) return null;
    const bpm = round(mean(evidence.map((item) => item.value)));
    const hrv = evidence
      .map((item) => item.components.heart_rate_variability)
      .filter((value): value is number => value !== undefined);
    const band = bpm < 60 ? "low and quiet" : bpm < 85 ? "settled" : "elevated";
    return {
      title: "Heart rhythm",
      summary: hrv.length
        ? `Heart rate is reading ${bpm} bpm — ${band} — with variability around ${round(mean(hrv))} ms.`
        : `Heart rate is reading ${bpm} bpm — ${band}.`,
      reason: `Fused ${evidence.length} cardiovascular evidence objects over this window.`,
      value: bpm,
      evidence,
    };
  },
};

/** Cardiovascular + motion at rest → how much recovery capacity is showing. */
const recovery: IntelligenceProcessor = {
  domain: "recovery",
  requiredEvidence: ["cardiovascular"],
  optionalEvidence: ["motion"],
  idealEvidence: 8,
  changeThreshold: 0.15,
  understand: (window) => {
    const cardio = samples(window, "cardiovascular");
    const hrv = cardio
      .map((item) => item.components.heart_rate_variability)
      .filter((value): value is number => value !== undefined);
    if (!hrv.length) return null;
    const motion = samples(window, "motion");
    const restful = motion.length ? mean(motion.map((item) => item.value)) < 0.25 : true;
    const value = round(mean(hrv));
    const band = value < 25 ? "narrow" : value < 55 ? "moderate" : "wide";
    return {
      title: "Recovery capacity",
      summary: restful
        ? `Variability is ${band} at rest (${value} ms), which is what I am reading recovery from.`
        : `Variability is ${band} (${value} ms), though movement in this window makes it a softer read.`,
      reason: `Read ${hrv.length} variability components${motion.length ? ` alongside ${motion.length} motion objects` : ""}.`,
      value,
      evidence: [...cardio, ...motion],
    };
  },
};

/** Thermal evidence → what skin temperature is doing. */
const thermal: IntelligenceProcessor = {
  domain: "thermal",
  requiredEvidence: ["thermal"],
  idealEvidence: 6,
  changeThreshold: 0.02,
  understand: (window, history) => {
    const evidence = samples(window, "thermal");
    if (!evidence.length) return null;
    const value = round(mean(evidence.map((item) => item.value)), 2);
    const drift =
      history.previous?.value !== null && history.previous?.value !== undefined
        ? round(value - history.previous.value, 2)
        : null;
    return {
      title: "Skin temperature",
      summary:
        drift === null || Math.abs(drift) < 0.05
          ? `Skin temperature is holding around ${value}°C.`
          : `Skin temperature has moved ${drift > 0 ? "up" : "down"} ${Math.abs(drift)}°C, now around ${value}°C.`,
      reason: `Averaged ${evidence.length} thermal evidence objects in this window.`,
      value,
      evidence,
    };
  },
};

/** Motion evidence → how much the body is moving. */
const activity: IntelligenceProcessor = {
  domain: "activity",
  requiredEvidence: ["motion"],
  idealEvidence: 8,
  changeThreshold: 0.2,
  understand: (window) => {
    const evidence = samples(window, "motion");
    if (!evidence.length) return null;
    const value = round(mean(evidence.map((item) => item.value)), 2);
    const band = value < 0.15 ? "still" : value < 0.5 ? "lightly active" : "actively moving";
    return {
      title: "Movement",
      summary: `Motion is reading ${value} — ${band} — across this window.`,
      reason: `Averaged ${evidence.length} motion evidence objects.`,
      value,
      evidence,
    };
  },
};

/** Sustained stillness with a settled heart → a sleep-shaped window. */
const sleep: IntelligenceProcessor = {
  domain: "sleep",
  requiredEvidence: ["motion", "cardiovascular"],
  idealEvidence: 10,
  changeThreshold: 0.2,
  understand: (window) => {
    const motion = samples(window, "motion");
    const cardio = samples(window, "cardiovascular");
    if (!motion.length || !cardio.length) return null;
    const stillness = round(1 - Math.min(1, mean(motion.map((item) => item.value))), 2);
    const bpm = round(mean(cardio.map((item) => item.value)));
    const restLike = stillness > 0.85 && bpm < 65;
    return {
      title: "Rest state",
      summary: restLike
        ? `Sustained stillness (${stillness}) with a heart rate of ${bpm} bpm reads like rest.`
        : `Stillness is ${stillness} with a heart rate of ${bpm} bpm — this window does not read like sleep.`,
      reason: `Combined ${motion.length} motion and ${cardio.length} cardiovascular evidence objects.`,
      value: stillness,
      evidence: [...motion, ...cardio],
    };
  },
};

/** Wear and signal quality → whether the device itself can be trusted. */
const deviceHealth: IntelligenceProcessor = {
  domain: "device_health",
  requiredEvidence: ["wear_quality"],
  optionalEvidence: ["signal_quality"],
  idealEvidence: 6,
  changeThreshold: 0.15,
  understand: (window) => {
    const wear = samples(window, "wear_quality");
    const signal = samples(window, "signal_quality");
    if (!wear.length) return null;
    const value = round(mean(wear.map((item) => item.value)), 2);
    const band = value > 0.8 ? "well seated" : value > 0.5 ? "loosely seated" : "poorly seated";
    return {
      title: "Device contact",
      summary: signal.length
        ? `Wear quality is ${value} — ${band} — with signal quality at ${round(mean(signal.map((item) => item.value)), 2)}.`
        : `Wear quality is ${value} — ${band}.`,
      reason: `Read ${wear.length} wear-quality${signal.length ? ` and ${signal.length} signal-quality` : ""} evidence objects.`,
      value,
      evidence: [...wear, ...signal],
    };
  },
};

/** Registry. New domains are added here and nowhere else. */
export const INTELLIGENCE_PROCESSORS: IntelligenceProcessor[] = [
  cardiovascular,
  recovery,
  thermal,
  activity,
  sleep,
  deviceHealth,
];
