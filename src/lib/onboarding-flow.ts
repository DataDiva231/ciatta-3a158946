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
const isMeno = (d: Onboarding) => stage(d) === "Perimenopause" || stage(d) === "Menopause";

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
  {
    id: "name",
    kind: "text",
    ask: () => "What should I call you?",
    why: () => "It's a small thing. But conversations are better when we know each other's names.",
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
    options: () => [{ value: "Yes, currently" }, { value: "Considering it" }, { value: "No" }],
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
        return [
          { value: "PCOS" },
          { value: "Endometriosis" },
          ...shared,
          { value: "Something else" },
        ];
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

  /* --- medications: category first, then the specific one --------------- */
  {
    id: "meds_gate",
    kind: "single",
    key: "meds_gate",
    ask: () => "Are you taking anything regularly?",
    options: () => [{ value: "Nothing right now" }, { value: "Yes, a few" }],
    reflect: (d) =>
      one(d, "meds_gate") === "Nothing right now" ? "Then I'll leave that alone." : undefined,
  },
  {
    id: "med_category",
    kind: "single",
    key: "med_category",
    when: takesMeds,
    ask: () => "What kind of thing, broadly?",
    lead: () => "Just the category — I'll narrow it from there.",
    options: (d) => {
      const out: Choice[] = [];
      if (isCycling(d) || isTTC(d))
        out.push({ value: "Hormonal", hint: "Birth control and similar" });
      if (isMeno(d)) out.push({ value: "Hormonal", hint: "Hormone therapy and similar" });
      out.push(
        { value: "Metabolic or weight" },
        { value: "Mood or sleep" },
        { value: "Thyroid" },
        { value: "Something else" },
      );
      return out;
    },
    reflect: (d) =>
      one(d, "med_category") === "Metabolic or weight"
        ? "That category changes appetite and heart rate, so it's worth one more question."
        : one(d, "med_category") === "Something else"
          ? "Fine — I don't need the name to be useful."
          : undefined,
  },
  {
    id: "meds",
    kind: "multi",
    key: "meds",
    max: 2,
    when: (d) =>
      takesMeds(d) && one(d, "med_category") !== "" && one(d, "med_category") !== "Something else",
    ask: () => "Which one is closest?",
    optional: true,
    options: (d) => {
      const cat = one(d, "med_category");
      if (cat === "Hormonal")
        return isMeno(d)
          ? [
              { value: "Hormone therapy" },
              { value: "Vaginal estrogen" },
              { value: "Something else" },
            ]
          : [{ value: "Birth control" }, { value: "Progesterone" }, { value: "Something else" }];
      if (cat === "Metabolic or weight")
        return [{ value: "GLP-1" }, { value: "Metformin" }, { value: "Something else" }];
      if (cat === "Mood or sleep")
        return [{ value: "Antidepressant" }, { value: "Sleep aid" }, { value: "Something else" }];
      return [{ value: "Thyroid medication" }, { value: "Something else" }];
    },
  },
  {
    id: "glp1_purpose",
    kind: "single",
    key: "glp1_purpose",
    when: onGLP1,
    lead: () => "A GLP-1 shifts appetite, digestion and resting heart rate.",
    ask: () => "What are you using it for?",
    options: (d) => {
      const opts = [{ value: "Weight management" }, { value: "Type 2 diabetes" }];
      if (has(d, "conditions", "PCOS")) opts.push({ value: "PCOS" });
      return [...opts, { value: "Something else" }];
    },
    reflect: () =>
      "Noted. I'll separate the medication's effects from your own signals so you don't misread them.",
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

  /* --- one broad focus, then goals that belong to it ---------------------- */
  {
    id: "focus",
    kind: "single",
    key: "focus",
    ask: () => "What would you most like to understand?",
    lead: () => "One area. I'll go deep there before anywhere else.",
    options: (d) => {
      const out: Choice[] = [];
      if (isTTC(d)) out.push({ value: "Fertility" });
      if (isCycling(d)) out.push({ value: "My cycle" });
      if (isMeno(d)) out.push({ value: "Menopause symptoms" });
      if (isPregnant(d)) out.push({ value: "Recovery" });
      if (weightRelevant(d)) out.push({ value: "Metabolic health" });
      out.push({ value: "Sleep" }, { value: "Energy and mood" });
      return out.slice(0, 5);
    },
    reflect: (d) => {
      const f = one(d, "focus");
      return f ? `${f} it is. Let me narrow that down to one thing.` : undefined;
    },
  },
  {
    id: "goal",
    kind: "single",
    key: "goal",
    ask: () => "If one thing changed in three months, what would it be?",
    options: (d) => {
      const f = one(d, "focus");
      const map: Record<string, Choice[]> = {
        Fertility: [
          { value: "Conceive" },
          { value: "Know when I ovulate" },
          { value: "Steadier cycles" },
        ],
        "My cycle": [
          { value: "Easier periods" },
          { value: "Predictable cycles" },
          { value: "Fewer symptom days" },
        ],
        "Menopause symptoms": [
          { value: "Fewer symptoms" },
          { value: "Sleep through the night" },
          { value: "Steadier mood" },
        ],
        Recovery: [
          { value: "Recover faster" },
          { value: "More energy" },
          { value: "Sleep better" },
        ],
        "Metabolic health": [
          { value: "Lose weight" },
          { value: "Steadier energy" },
          { value: "Better blood sugar" },
        ],
        Sleep: [
          { value: "Sleep better" },
          { value: "Wake up rested" },
          { value: "Fall asleep faster" },
        ],
        "Energy and mood": [
          { value: "Steadier energy" },
          { value: "Steadier mood" },
          { value: "Feel understood" },
        ],
      };
      return (
        map[f] ?? [
          { value: "Sleep better" },
          { value: "Steadier energy" },
          { value: "Feel understood" },
        ]
      );
    },
  },
  {
    id: "goal_blocker",
    kind: "single",
    key: "goal_blocker",
    ask: () => "What tends to get in the way of that?",
    lead: (d) => (d.primaryGoal ? `Last one about ${d.primaryGoal.toLowerCase()}.` : undefined),
    optional: true,
    options: (d) => {
      const g = d.primaryGoal;
      if (g === "Sleep better" || g === "Wake up rested" || g === "Fall asleep faster")
        return [
          { value: "A racing mind" },
          { value: "Waking in the night" },
          { value: "Late nights" },
          { value: "I don't know yet" },
        ];
      if (g === "Lose weight" || g === "Better blood sugar")
        return [
          { value: "Evening hunger" },
          { value: "Low energy to move" },
          { value: "Stress eating" },
          { value: "I don't know yet" },
        ];
      if (g === "Conceive" || g === "Know when I ovulate")
        return [
          { value: "Unclear timing" },
          { value: "Irregular cycles" },
          { value: "Stress" },
          { value: "I don't know yet" },
        ];
      return [
        { value: "Poor sleep" },
        { value: "Stress" },
        { value: "Symptoms getting in the way" },
        { value: "I don't know yet" },
      ];
    },
    reflect: (d) =>
      one(d, "goal_blocker") && one(d, "goal_blocker") !== "I don't know yet"
        ? "That's the thread I'll pull on first."
        : "Then finding it is my job, not yours.",
  },

  { id: "notifications", kind: "notifications" },
  { id: "building", kind: "building" },
  { id: "summary", kind: "summary" },
];

/* ------------------------------------------------------- conversational beats */

/**
 * Short acknowledgements Ciatta uses between questions when the node itself
 * has nothing specific to say. Never repeated within one session.
 */
const ACKS = [
  "Thank you — that helps.",
  "Got it. Let's build on that.",
  "That gives me useful context.",
  "Noted. I'll fold that in.",
  "Good to know.",
  "That tells me something.",
  "I'll remember that.",
  "Understood.",
];

export function ackFor(used: string[]): string {
  const left = ACKS.filter((x) => !used.includes(x));
  const pool = left.length ? left : ACKS;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
