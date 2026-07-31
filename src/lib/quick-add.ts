/**
 * Quick Add flow definition + branching logic.
 *
 * The step list is always derived from the answers given so far, so changing an
 * earlier answer immediately re-shapes every later step (and the progress total).
 */

export type QuickAddOption = {
  label: string;
  note?: string;
  glyph?: string;
  icon?: "tampon" | "pad" | "cup" | "disc" | "underwear" | "none";
  /** Minutes ago, used to derive the event timestamp. */
  minutesAgo?: number;
  /** Opens a native date/time picker instead of advancing straight away. */
  custom?: boolean;
};

export type QuickAddStep = {
  key: string;
  title: string;
  sub: string;
  layout: "list" | "grid";
  options: QuickAddOption[];
};

export const CATEGORY_STEP: QuickAddStep = {
  key: "category",
  title: "Quick Add",
  sub: "One tap teaches Ciatta something new.",
  layout: "list",
  options: [
    { label: "Period Product" },
    { label: "Flow" },
    { label: "Symptoms" },
    { label: "Sleep" },
    { label: "Medication" },
    { label: "Nutrition" },
    { label: "Activity" },
    { label: "Something Else" },
  ],
};

const PRODUCT_STEP: QuickAddStep = {
  key: "product",
  title: "What are you using?",
  sub: "Choose the product that's right for you.",
  layout: "grid",
  options: [
    { label: "Tampon", icon: "tampon" },
    { label: "Pad", icon: "pad" },
    { label: "Menstrual Cup", icon: "cup" },
    { label: "Disc", icon: "disc" },
    { label: "Period Underwear", icon: "underwear" },
    { label: "Nothing Right Now", icon: "none" },
  ],
};

const ABSORBENCY_STEP: QuickAddStep = {
  key: "absorbency",
  title: "Which absorbency?",
  sub: "Choose the one that's right for you.",
  layout: "list",
  options: [
    { label: "Light", glyph: "◊" },
    { label: "Regular", glyph: "◊◊" },
    { label: "Super", glyph: "◊◊◊" },
    { label: "Super+", glyph: "◊◊◊◊" },
    { label: "Ultra", glyph: "◊◊◊◊◊" },
  ],
};

const INTENSITY_STEP: QuickAddStep = {
  key: "intensity",
  title: "How is your flow right now?",
  sub: "This helps Ciatta understand today's intensity.",
  layout: "list",
  options: [
    { label: "Light", note: "Lighter than usual" },
    { label: "Medium", note: "Moderate flow" },
    { label: "Heavy", note: "Heavier than usual" },
    { label: "Spotting", note: "Very light spotting" },
  ],
};

/** Preset offsets for the inline time chip (timing is no longer its own step). */
export const TIME_PRESETS: { label: string; minutesAgo: number }[] = [
  { label: "Just now", minutesAgo: 0 },
  { label: "30 min ago", minutesAgo: 30 },
  { label: "1 hr ago", minutesAgo: 60 },
  { label: "2 hr ago", minutesAgo: 120 },
];

const GENERIC_STEPS: Record<string, QuickAddStep> = {
  Flow: INTENSITY_STEP,
  Symptoms: {
    key: "symptom",
    title: "What are you feeling?",
    sub: "Pick the one that stands out most right now.",
    layout: "list",
    options: [
      { label: "Cramps", note: "Lower abdomen" },
      { label: "Headache", note: "Dull or sharp" },
      { label: "Bloating", note: "Fullness or pressure" },
      { label: "Fatigue", note: "Low energy" },
      { label: "Mood shift", note: "Irritable or low" },
    ],
  },
  Sleep: {
    key: "sleep",
    title: "How did you sleep?",
    sub: "Your own read matters as much as the sensor's.",
    layout: "list",
    options: [
      { label: "Deep", note: "Woke up rested" },
      { label: "Okay", note: "A little broken" },
      { label: "Restless", note: "Woke several times" },
      { label: "Barely slept", note: "Long night" },
    ],
  },
  Medication: {
    key: "medication",
    title: "What did you take?",
    sub: "Ciatta will treat this as context, not a deviation.",
    layout: "list",
    options: [
      { label: "Pain relief", note: "Ibuprofen, paracetamol" },
      { label: "Hormonal", note: "Pill, patch, IUD" },
      { label: "Supplement", note: "Iron, magnesium, vitamin D" },
      { label: "Something else", note: "Tell Ciatta later" },
    ],
  },
  Nutrition: {
    key: "nutrition",
    title: "How have you eaten today?",
    sub: "Rough is fine — patterns matter more than precision.",
    layout: "list",
    options: [
      { label: "Balanced", note: "Regular meals" },
      { label: "Light", note: "Skipped a meal" },
      { label: "Heavy", note: "Larger than usual" },
      { label: "Craving-led", note: "Sugar or salt" },
    ],
  },
  Activity: {
    key: "activity",
    title: "What did your body do?",
    sub: "Ciatta reads effort against recovery, not the calendar.",
    layout: "list",
    options: [
      { label: "Rest", note: "Nothing structured" },
      { label: "Easy movement", note: "Walk, mobility, yoga" },
      { label: "Moderate", note: "Steady session" },
      { label: "Hard", note: "Intervals or heavy lifting" },
    ],
  },
  "Something Else": {
    key: "other",
    title: "What should Ciatta know?",
    sub: "Anything your sensors can't see.",
    layout: "list",
    options: [
      { label: "Travel", note: "Time zone or altitude" },
      { label: "Illness", note: "Cold, fever, infection" },
      { label: "Stress", note: "Work or life load" },
      { label: "Alcohol", note: "Last night" },
    ],
  },
};

/** Categories where absorbency is a meaningful question. */
const ABSORBENT_PRODUCTS = ["Tampon", "Pad", "Period Underwear"];

export type Answers = Record<string, string>;

/**
 * Derives the full step list for the branch implied by the answers so far.
 * The returned length is the real total for the progress indicator.
 */
export function buildSteps(answers: Answers): QuickAddStep[] {
  const category = answers.category;
  if (!category) return [CATEGORY_STEP];

  if (category === "Period Product") {
    const product = answers.product;
    const steps: QuickAddStep[] = [CATEGORY_STEP, PRODUCT_STEP];
    // Before a product is picked, assume the fullest branch so the total is stable.
    if (!product || ABSORBENT_PRODUCTS.includes(product)) steps.push(ABSORBENCY_STEP);
    if (product === "Nothing Right Now") return steps;
    steps.push(INTENSITY_STEP);
    return steps;
  }

  const step = GENERIC_STEPS[category] ?? INTENSITY_STEP;
  return [CATEGORY_STEP, step];
}

export function findOption(step: QuickAddStep, label: string) {
  return step.options.find((o) => o.label === label);
}

export const LOGGED_LABEL: Record<string, string> = {
  category: "Noted",
  product: "Noted",
  absorbency: "Noted",
  intensity: "Flow",
  timing: "When",
  symptom: "Noted",
  sleep: "Sleep",
  medication: "Noted",
  nutrition: "Noted",
  activity: "Noted",
  other: "Noted",
};
/** Short past-tense lines shown on the "Understanding updated" moment. */
export const CONFIRM_LABEL: Record<string, string> = {
  product: "I'll remember this",
  absorbency: "I'll remember this",
  intensity: "Flow noted",
  timing: "I remember this now",
  symptom: "Noted",
  sleep: "Sleep noted",
  medication: "Noted",
  nutrition: "Noted",
  activity: "Noted",
  other: "Noted",
};

/** Human field name used inside event metadata. */
export const META_LABEL: Record<string, string> = {
  product: "Product",
  absorbency: "Absorbency",
  intensity: "Flow",
  timing: "Logged for",
  symptom: "Symptom",
  sleep: "Sleep",
  medication: "Medication",
  nutrition: "Nutrition",
  activity: "Activity",
  other: "Context",
};

/** The step whose answer becomes the event's primary `value`. */
const VALUE_KEY_BY_CATEGORY: Record<string, string> = {
  "Period Product": "product",
  Flow: "intensity",
  Symptoms: "symptom",
  Sleep: "sleep",
  Medication: "medication",
  Nutrition: "nutrition",
  Activity: "activity",
  "Something Else": "other",
};

export function valueKeyFor(category: string) {
  return VALUE_KEY_BY_CATEGORY[category] ?? "intensity";
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Value for an <input type="datetime-local"> in local time. */
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
