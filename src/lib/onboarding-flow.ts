import type { Onboarding } from "./onboarding-store";

/**
 * Ciatta's onboarding is a conversation, not a form.
 *
 * Every node declares when it is relevant. The runtime walks the graph and only
 * ever surfaces the next question that still matters given what Ciatta already
 * knows — so two people take two different paths through this file.
 */

export type Answers = Record<string, string[]>;

export type Choice = { value: string; hint?: string };

export type NodeKind =
  | "intro"
  | "text"
  | "birth"
  | "body"
  | "single"
  | "multi"
  | "connect"
  | "notifications"
  | "building"
  | "summary";

export type FlowNode = {
  id: string;
  kind: NodeKind;
  /** Gate — the question only appears when Ciatta still needs it. */
  when?: (d: Onboarding) => boolean;
  /** The question itself, in Ciatta's voice. */
  ask?: (d: Onboarding) => string;
  /** A short line above the question that shows Ciatta was listening. */
  lead?: (d: Onboarding) => string | undefined;
  why?: (d: Onboarding) => string | undefined;
  options?: (d: Onboarding) => Choice[];
  /** Answer key inside `answers`; core fields use dedicated handling. */
  key?: string;
  /** For multi selects: cap so lists stay short. */
  max?: number;
  optional?: boolean;
  /** Ciatta's immediate response to what was just said. */
  reflect?: (d: Onboarding) => string | undefined;
};

/* ------------------------------------------------------------------ helpers */

export const a = (d: Onboarding, key: string): string[] => d.answers?.[key] ?? [];
export const one = (d: Onboarding, key: string): string => a(d, key)[0] ?? "";
const has = (d: Onboarding, key: string, v: string) => a(d, key).includes(v);

const stage = (d: Onboarding) => d.lifeStage;
const isCycling = (d: Onboarding) => stage(d) === "Cycling";
const isTTC = (d: Onboarding) => stage(d) === "Trying to conceive";
const isPregnant = (d: Onboarding) => stage(d) === "Pregnant or postpartum";
const isMeno = (d: Onboarding) =>
  stage(d) === "Perimenopause" || stage(d) === "Menopause";

const takesMeds = (d: Onboarding) => one(d, "meds_gate") === "Yes, a few";
const onGLP1 = (d: Onboarding) => has(d, "meds", "GLP-1");
const hasConditions = (d: Onboarding) => one(d, "conditions_gate") === "Yes";
const connected = (d: Onboarding) => d.appleHealthConnected;

const weightRelevant = (d: Onboarding) =>
  onGLP1(d) ||
  one(d, "glp1_purpose") === "Weight management" ||
  d.primaryGoal === "Lose weight" ||
  has(d, "conditions", "Type 2 diabetes") ||
  has(d, "conditions", "Prediabetes");

/* -------------------------------------------------------------------- graph */

export const FLOW: FlowNode[] = [
  { id: "welcome", kind: "intro" },
  { id: "privacy", kind: "intro" },
  { id: "session", kind: "intro" },

  {
    id: "name",
    kind: "text",
    ask: () => "What should I call you?",
    why: () => "I'll speak to you by name from here on.",
  },

  {
    id: "birth",
    kind: "birth",
    lead: (d) => (d.name.trim() ? `Good to meet you, ${first(d)}.` : undefined),
    ask: () => "When were you born?",
    why: () => "Age changes which patterns are worth watching.",
  },

  {
    id: "lifestage",
    kind: "single",
    key: "lifestage",
    ask: () => "Where are you in your reproductive life right now?",
    why: () => "This decides most of what I ask you next.",
    options: () => [
      { value: "Cycling", hint: "Still having periods" },
      { value: "Trying to conceive" },
      { value: "Pregnant or postpartum" },
      { value: "Perimenopause", hint: "Cycles shifting" },
      { value: "Menopause", hint: "A year or more without a period" },
      { value: "I'm not sure" },
    ],
    reflect: (d) =>
      isCycling(d)
        ? "Then I'll follow your cycle closely — it explains a lot of the rest."
        : isTTC(d)
          ? "I'll pay close attention to your fertile window and what shifts around it."
          : isPregnant(d)
            ? "I'll stay gentle here and follow sleep, energy and recovery."
            : isMeno(d)
              ? "Then fertility questions aren't useful to you. I'll focus on symptoms, sleep and recovery instead."
              : "That's fine. I'll learn the shape of it from your signals.",
  },

  /* --- cycling branch -------------------------------------------------- */
  {
    id: "cycle_regularity",
    kind: "single",
    key: "cycle_regularity",
    when: (d) => isCycling(d) || isTTC(d),
    ask: () => "How predictable are your cycles?",
    options: () => [
      { value: "Regular", hint: "Within a few days each month" },
      { value: "Irregular" },
      { value: "On hormonal birth control" },
      { value: "I don't track them" },
    ],
    reflect: (d) =>
      one(d, "cycle_regularity") === "Irregular"
        ? "Irregular is useful information, not a problem. Let me ask one thing about it."
        : one(d, "cycle_regularity") === "On hormonal birth control"
          ? "Then I'll read your rhythm from sleep and temperature rather than bleeding."
          : "Good — a steady rhythm gives me a baseline quickly.",
  },
  {
    id: "cycle_irregular",
    kind: "single",
    key: "cycle_irregular",
    when: (d) => one(d, "cycle_regularity") === "Irregular",
    ask: () => "Has that always been the case?",
    options: () => [
      { value: "Always been this way" },
      { value: "Changed in the last year" },
      { value: "Since stopping birth control" },
      { value: "Not sure" },
    ],
  },
  {
    id: "cycle_symptoms",
    kind: "multi",
    key: "cycle_symptoms",
    max: 3,
    when: (d) => (isCycling(d) || isTTC(d)) && one(d, "cycle_regularity") !== "",
    ask: () => "What shows up most around your period?",
    lead: () => "Pick up to three. I'll watch for these first.",
    options: () => [
      { value: "Cramps" },
      { value: "Migraines" },
      { value: "Mood shifts" },
      { value: "Exhaustion" },
      { value: "Heavy bleeding" },
      { value: "Nothing much" },
    ],
    optional: true,
    reflect: (d) =>
      has(d, "cycle_symptoms", "Migraines")
        ? "Migraines often track a hormone drop. I'll start watching the days before you bleed."
        : has(d, "cycle_symptoms", "Nothing much")
          ? "Then I'll keep this light and only flag it if something changes."
          : undefined,
  },

  /* --- trying to conceive ---------------------------------------------- */
  {
    id: "ttc_duration",
    kind: "single",
    key: "ttc_duration",
    when: isTTC,
    ask: () => "How long have you been trying?",
    options: () => [
      { value: "Just started" },
      { value: "Under 6 months" },
      { value: "6 to 12 months" },
      { value: "Over a year" },
    ],
    reflect: (d) =>
      one(d, "ttc_duration") === "Over a year"
        ? "I'll track ovulation signals carefully and flag anything worth taking to a clinician."
        : undefined,
  },

  /* --- pregnant / postpartum ------------------------------------------- */
  {
    id: "pregnancy_stage",
    kind: "single",
    key: "pregnancy_stage",
    when: isPregnant,
    ask: () => "Which part are you in?",
    options: () => [
      { value: "First trimester" },
      { value: "Second trimester" },
      { value: "Third trimester" },
      { value: "Postpartum" },
    ],
  },

  /* --- menopause branch ------------------------------------------------- */
  {
    id: "meno_symptoms",
    kind: "multi",
    key: "meno_symptoms",
    max: 3,
    when: isMeno,
    ask: () => "What's been most disruptive lately?",
    lead: () => "Up to three.",
    options: () => [
      { value: "Sleep waking" },
      { value: "Hot flashes" },
      { value: "Mood changes" },
      { value: "Brain fog" },
      { value: "Joint aches" },
      { value: "Nothing yet" },
    ],
    optional: true,
    reflect: (d) =>
      has(d, "meno_symptoms", "Sleep waking")
        ? "Night waking usually has a temperature signature. That's something I can see."
        : undefined,
  },
  {
    id: "meno_hrt",
    kind: "single",
    key: "meno_hrt",
    when: isMeno,
    ask: () => "Are you using hormone therapy?",
    options: () => [
      { value: "Yes, currently" },
      { value: "Considering it" },
      { value: "No" },
    ],
  },

  /* --- conditions ------------------------------------------------------- */
  {
    id: "conditions_gate",
    kind: "single",
    key: "conditions_gate",
    ask: () => "Is there anything ongoing I should hold in mind?",
    lead: () => "A diagnosis, or something you manage day to day.",
    options: () => [
      { value: "No, nothing ongoing" },
      { value: "Yes" },
      { value: "Rather not say" },
    ],
    reflect: (d) =>
      one(d, "conditions_gate") === "No, nothing ongoing"
        ? "Good. I'll skip the rest of that."
        : undefined,
  },
  {
    id: "conditions",
    kind: "multi",
    key: "conditions",
    max: 4,
    when: hasConditions,
    ask: () => "Which of these is closest?",
    options: (d) => {
      const shared = [
        { value: "Thyroid" },
        { value: "Anxiety or depression" },
        { value: "Prediabetes" },
        { value: "Type 2 diabetes" },
      ];
      if (isCycling(d) || isTTC(d))
        return [{ value: "PCOS" }, { value: "Endometriosis" }, ...shared, { value: "Something else" }];
      if (isMeno(d))
        return [
          { value: "High blood pressure" },
          { value: "High cholesterol" },
          ...shared,
          { value: "Something else" },
        ];
      return [...shared, { value: "High blood pressure" }, { value: "Something else" }];
    },
    reflect: (d) =>
      has(d, "conditions", "PCOS")
        ? "PCOS changes how I read cycle length and energy. I'll adjust for it."
        : has(d, "conditions", "Thyroid")
          ? "Thyroid affects temperature and resting heart rate. I'll account for that in your baseline."
          : undefined,
  },

  /* --- medications ------------------------------------------------------ */
  {
    id: "meds_gate",
    kind: "single",
    key: "meds_gate",
    ask: () => "Are you taking anything regularly?",
    options: () => [
      { value: "Nothing right now" },
      { value: "Yes, a few" },
    ],
    reflect: (d) =>
      one(d, "meds_gate") === "Nothing right now" ? "Then I'll leave that alone." : undefined,
  },
  {
    id: "meds",
    kind: "multi",
    key: "meds",
    max: 4,
    when: takesMeds,
    ask: () => "Which ones?",
    options: (d) => {
      const base: Choice[] = [{ value: "GLP-1" }, { value: "Thyroid medication" }, { value: "Antidepressant" }];
      if (isCycling(d) || isTTC(d)) base.unshift({ value: "Birth control" });
      if (isMeno(d)) base.unshift({ value: "Hormone therapy" });
      if (has(d, "conditions", "PCOS") || has(d, "conditions", "Type 2 diabetes"))
        base.push({ value: "Metformin" });
      return [...base, { value: "Something else" }];
    },
  },
  {
    id: "glp1_which",
    kind: "single",
    key: "glp1_which",
    when: onGLP1,
    lead: () => "A GLP-1 shifts appetite, digestion and resting heart rate.",
    ask: () => "Which one?",
    options: () => [
      { value: "Ozempic" },
      { value: "Wegovy" },
      { value: "Mounjaro" },
      { value: "Zepbound" },
      { value: "Another" },
    ],
  },
  {
    id: "glp1_purpose",
    kind: "single",
    key: "glp1_purpose",
    when: onGLP1,
    ask: () => "And what are you using it for?",
    options: (d) => {
      const opts = [{ value: "Weight management" }, { value: "Type 2 diabetes" }];
      if (has(d, "conditions", "PCOS")) opts.push({ value: "PCOS" });
      return [...opts, { value: "Something else" }];
    },
    reflect: () =>
      "Noted. I'll separate GLP-1 effects from your own signals so you don't misread them.",
  },

  /* --- body basics, only when it matters -------------------------------- */
  {
    id: "body",
    kind: "body",
    when: weightRelevant,
    lead: () => "Only because it changes how I read the numbers.",
    ask: () => "Roughly your height and weight?",
    optional: true,
  },

  /* --- signals ----------------------------------------------------------- */
  { id: "apple_health", kind: "connect" },
  {
    id: "sleep_self",
    kind: "single",
    key: "sleep_self",
    when: (d) => !connected(d),
    lead: () => "Since I can't read your sleep automatically yet.",
    ask: () => "How does sleep usually go?",
    options: () => [
      { value: "Solid most nights" },
      { value: "I wake up a lot" },
      { value: "Hard to fall asleep" },
      { value: "It varies wildly" },
    ],
  },
  {
    id: "activity_self",
    kind: "single",
    key: "activity_self",
    when: (d) => !connected(d),
    ask: () => "And how much do you move in a normal week?",
    options: () => [
      { value: "Barely" },
      { value: "A couple of times" },
      { value: "Most days" },
      { value: "Training hard" },
    ],
  },

  /* --- what matters to you ----------------------------------------------- */
  {
    id: "priorities",
    kind: "multi",
    key: "priorities",
    max: 3,
    lead: () => "Choose up to three. I'll look here first.",
    ask: () => "What do you want me to understand first?",
    options: (d) => {
      const out: Choice[] = [];
      if (isCycling(d) || isTTC(d)) out.push({ value: "Cycle" });
      if (isTTC(d)) out.push({ value: "Fertility" });
      if (isMeno(d)) out.push({ value: "Menopause symptoms" });
      if (isPregnant(d)) out.push({ value: "Recovery" });
      if (onGLP1(d) || weightRelevant(d)) out.push({ value: "Metabolic health" });
      if (a(d, "cycle_symptoms").length || a(d, "meno_symptoms").length)
        out.push({ value: "Symptoms" });
      out.push({ value: "Sleep" }, { value: "Energy" }, { value: "Mood" });
      return out.slice(0, 6);
    },
  },
  {
    id: "goal",
    kind: "single",
    key: "goal",
    ask: () => "And if one thing changed in three months, what would it be?",
    options: (d) => {
      const out: Choice[] = [];
      if (isTTC(d)) out.push({ value: "Conceive" });
      if (isMeno(d)) out.push({ value: "Fewer symptoms" });
      if (weightRelevant(d)) out.push({ value: "Lose weight" });
      if (a(d, "cycle_symptoms").length) out.push({ value: "Easier periods" });
      out.push({ value: "Sleep better" }, { value: "Steadier energy" }, { value: "Feel understood" });
      return out.slice(0, 5);
    },
    reflect: (d) => (d.primaryGoal ? `Then that's what I'll measure everything against.` : undefined),
  },

  { id: "notifications", kind: "notifications" },
  { id: "building", kind: "building" },
  { id: "summary", kind: "summary" },
];

export function first(d: Onboarding) {
  return d.name.trim().split(" ")[0] || "there";
}

/** The next node Ciatta still needs, given everything it has learned. */
export function nextNodeId(d: Onboarding, currentId: string): string | null {
  const i = FLOW.findIndex((n) => n.id === currentId);
  for (let j = i + 1; j < FLOW.length; j++) {
    const n = FLOW[j];
    if (!n.when || n.when(d)) return n.id;
  }
  return null;
}

export function nodeById(id: string) {
  return FLOW.find((n) => n.id === id);
}

/** How far through the conversation we are, recomputed as the path changes. */
export function progress(d: Onboarding, currentId: string) {
  const relevant = FLOW.filter((n) => !n.when || n.when(d));
  const idx = relevant.findIndex((n) => n.id === currentId);
  return { total: relevant.length, index: Math.max(0, idx) };
}
