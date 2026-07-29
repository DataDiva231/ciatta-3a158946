// Deterministic simulated sensor baseline for the Ciatta MVP.
// Represents 84 days (12 weeks) of signals from the Ciatta earring and
// the honeycomb-structured tampon. No network, no randomness at runtime.

export type DaySignal = {
  /** 0 = today, 1 = yesterday, ... */
  daysAgo: number;
  date: Date;
  /** 0-100 */
  sleepQuality: number;
  /** hours */
  sleepHours: number;
  /** ms */
  hrv: number;
  /** bpm */
  restingHr: number;
  /** celsius deviation from personal baseline */
  tempDelta: number;
  /** day within the cycle, 1-indexed */
  cycleDay: number;
};

export const CYCLE_LENGTH = 29;
export const TODAY_CYCLE_DAY = 24;
export const TOTAL_DAYS = 84;

export type CyclePhase = "Menstrual" | "Follicular" | "Ovulatory" | "Luteal";

export function phaseForDay(cycleDay: number): CyclePhase {
  if (cycleDay <= 5) return "Menstrual";
  if (cycleDay <= 12) return "Follicular";
  if (cycleDay <= 16) return "Ovulatory";
  return "Luteal";
}

/** Small deterministic wobble so the data reads organic without randomness. */
function wobble(i: number, scale: number) {
  return (
    (Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.43) * 0.4 + Math.sin(i * 3.1) * 0.2) * scale
  );
}

function buildSignals(reference: Date): DaySignal[] {
  const days: DaySignal[] = [];
  for (let d = 0; d < TOTAL_DAYS; d++) {
    const cycleDay = ((TODAY_CYCLE_DAY - 1 - d) % CYCLE_LENGTH + CYCLE_LENGTH) % CYCLE_LENGTH + 1;
    const phase = phaseForDay(cycleDay);

    // Luteal drag: sleep and HRV soften, resting HR and temperature rise.
    const lutealPull = phase === "Luteal" ? (cycleDay - 16) / 13 : 0;
    const menstrualDip = phase === "Menstrual" ? 0.5 : 0;

    let sleepQuality = 82 - lutealPull * 16 - menstrualDip * 6 + wobble(d, 5);
    let hrv = 62 - lutealPull * 12 - menstrualDip * 5 + wobble(d + 11, 4);
    let restingHr = 58 + lutealPull * 6 + menstrualDip * 2 + wobble(d + 5, 1.6);
    let tempDelta = (phase === "Luteal" ? 0.28 : phase === "Ovulatory" ? 0.12 : -0.05) + wobble(d + 3, 0.06);

    // The last three nights are noticeably rougher — this is the story Today tells.
    if (d <= 2) {
      sleepQuality -= 14 - d * 3;
      hrv -= 9 - d * 2;
      restingHr += 4 - d;
    }

    const sleepHours = 6.4 + (sleepQuality - 70) / 22 + wobble(d + 7, 0.25);

    const date = new Date(reference);
    date.setDate(date.getDate() - d);

    days.push({
      daysAgo: d,
      date,
      sleepQuality: Math.round(Math.min(98, Math.max(38, sleepQuality))),
      sleepHours: Math.round(Math.min(9.2, Math.max(4.4, sleepHours)) * 10) / 10,
      hrv: Math.round(Math.min(88, Math.max(28, hrv))),
      restingHr: Math.round(Math.min(78, Math.max(48, restingHr))),
      tempDelta: Math.round(tempDelta * 100) / 100,
      cycleDay,
    });
  }
  return days;
}

/** Fixed reference date so server and client render identical data. */
export const REFERENCE_DATE = new Date("2026-07-29T08:00:00Z");

export const signals: DaySignal[] = buildSignals(REFERENCE_DATE);

export const today = signals[0];

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Percentage change of the last `n` days vs the preceding 4 weeks. */
export function recentShift(key: "sleepQuality" | "hrv" | "restingHr", n = 3) {
  const recent = average(signals.slice(0, n).map((d) => d[key]));
  const baseline = average(signals.slice(n, n + 28).map((d) => d[key]));
  if (!baseline) return 0;
  return Math.round(((recent - baseline) / baseline) * 100);
}

export function weeklySeries(key: "sleepQuality" | "hrv" | "restingHr") {
  const weeks: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const slice = signals.slice(w * 7, w * 7 + 7);
    weeks.push(Math.round(average(slice.map((d) => d[key]))));
  }
  return weeks;
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
