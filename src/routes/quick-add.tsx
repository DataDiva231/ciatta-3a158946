import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import orb from "@/assets/ciatta-orb.png";
import { useLearnedFacts } from "@/lib/ciatta-store";

export const Route = createFileRoute("/quick-add")({
  head: () => ({
    meta: [
      { title: "Quick Add — Ciatta" },
      {
        name: "description",
        content:
          "Teach Ciatta something new in under 30 seconds. Log your period product, flow, symptoms or sleep.",
      },
      { property: "og:title", content: "Quick Add — Ciatta" },
      {
        property: "og:description",
        content: "The fastest way to update your health understanding.",
      },
    ],
  }),
  component: QuickAddPage,
});

type Option = { label: string; note?: string; glyph?: string; icon?: "tampon" | "pad" | "cup" | "disc" | "underwear" | "none" };
type Step = {
  key: string;
  title: string;
  sub: string;
  layout: "list" | "grid";
  options: Option[];
};

const CATEGORY_STEP: Step = {
  key: "category",
  title: "Quick Add",
  sub: "Teach Ciatta something new in under 30 seconds.",
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

const PRODUCT_FLOW: Step[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    key: "timing",
    title: "When did you insert it?",
    sub: "This helps Ciatta understand your timeline.",
    layout: "list",
    options: [
      { label: "Just now", note: "0 min ago" },
      { label: "30 minutes ago", note: "30 min" },
      { label: "1 hour ago", note: "1 hr" },
      { label: "2 hours ago", note: "2 hr" },
      { label: "Custom time", note: "Choose exact time" },
    ],
  },
];

const GENERIC_FLOW: Record<string, Step> = {
  Flow: PRODUCT_FLOW[2],
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

function ProductGlyph({ icon }: { icon: Option["icon"] }) {
  const s = { stroke: "var(--muted-foreground)", strokeWidth: 1.3, fill: "none" } as const;
  switch (icon) {
    case "tampon":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <rect x="13" y="8" width="18" height="20" rx="9" {...s} />
          <path d="M22 28v9" {...s} strokeLinecap="round" />
        </svg>
      );
    case "pad":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <rect x="10" y="12" width="24" height="20" rx="10" {...s} />
          <path d="M10 18H5m29 0h5M10 26H5m29 0h5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "cup":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <path d="M13 12h18l-2.5 15a6.5 6.5 0 0 1-13 0L13 12Z" {...s} strokeLinejoin="round" />
          <path d="M22 33v5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "disc":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <ellipse cx="22" cy="22" rx="14" ry="7" {...s} />
          <ellipse cx="22" cy="22" rx="8" ry="3.5" {...s} />
        </svg>
      );
    case "underwear":
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <path d="M8 14h28l-2 8c-4 1-7 4-8 10h-8c-1-6-4-9-8-10l-2-8Z" {...s} strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="12" {...s} />
          <path d="M13.5 13.5 30.5 30.5" {...s} strokeLinecap="round" />
        </svg>
      );
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuickAddPage() {
  const navigate = useNavigate();
  const { addFact } = useLearnedFacts();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const steps = useMemo<Step[]>(() => {
    const category = answers[0];
    if (!category) return [CATEGORY_STEP];
    if (category === "Period Product") {
      const product = answers[1];
      const needsAbsorbency = product === "Tampon" || product === "Pad";
      return [
        CATEGORY_STEP,
        PRODUCT_FLOW[0],
        ...(product && !needsAbsorbency ? [] : [PRODUCT_FLOW[1]]),
        PRODUCT_FLOW[2],
        PRODUCT_FLOW[3],
      ];
    }
    return [CATEGORY_STEP, GENERIC_FLOW[category] ?? PRODUCT_FLOW[2]];
  }, [answers]);

  const total = answers[0] ? steps.length + 1 : 6;
  const done = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];

  const choose = (label: string) => {
    setAnswers((prev) => [...prev.slice(0, index), label]);
    setIndex(index + 1);
  };

  const back = () => {
    if (index === 0) {
      navigate({ to: "/teach" });
      return;
    }
    setIndex(index - 1);
  };

  const finish = () => {
    addFact(`Quick Add: ${answers.join(" · ")}`);
    navigate({ to: "/" });
  };

  if (done) {
    return (
      <div className="flex min-h-full flex-col px-6 pb-4 pt-10">
        <img
          src={orb}
          alt=""
          width={1024}
          height={1024}
          loading="lazy"
          className="mx-auto w-[42%] max-w-[170px]"
        />
        <h1 className="mt-2 text-center font-serif text-[28px] leading-tight">
          Understanding updated
        </h1>
        <p className="mt-3 text-center text-[14px] leading-relaxed text-muted-foreground">
          Thank you! Every update makes Ciatta smarter.
        </p>

        <ul className="mt-7 space-y-0 overflow-hidden rounded-2xl border border-border bg-surface">
          {answers.map((a, i) => (
            <li key={i} className="flex items-center gap-3 border-t border-border px-4 py-3.5 first:border-t-0">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-accent">
                <CheckIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] text-foreground">
                  {LOGGED_LABEL[steps[i]?.key ?? ""] ?? "Detail logged"}
                </span>
                <span className="block text-[12px] text-muted-foreground">{a}</span>
              </span>
            </li>
          ))}
          <li className="flex items-center gap-3 border-t border-border px-4 py-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-accent">
              <CheckIcon />
            </span>
            <span>
              <span className="block text-[14px] text-foreground">Predictions refined</span>
              <span className="block text-[12px] text-muted-foreground">Leak risk updated</span>
            </span>
          </li>
        </ul>

        <button
          type="button"
          onClick={finish}
          className="mt-7 w-full rounded-2xl py-4 font-serif text-[20px] text-primary-foreground shadow-[0_16px_30px_-18px_rgba(217,106,88,0.9)]"
          style={{ background: "linear-gradient(100deg, var(--clay), oklch(0.72 0.17 45))" }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-6 pb-4 pt-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground ${
            index === 0 ? "invisible" : ""
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {answers.length > 0 && index > 0 && (
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[12px] text-accent">
            {answers.slice(0, index).map((a, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-fog">•</span>}
                {a}
              </span>
            ))}
            <CheckIcon className="text-accent" />
          </span>
        )}
        <span className="h-10 w-10 shrink-0" />
      </div>

      <h1 className="mt-6 text-center font-serif text-[27px] leading-tight">{step.title}</h1>
      <p className="mt-2 text-center text-[13px] leading-relaxed text-muted-foreground">
        {step.sub}
      </p>

      {step.layout === "grid" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {step.options.map((o) => {
            const selected = answers[index] === o.label;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => choose(o.label)}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-5 transition-colors ${
                  selected
                    ? "border-accent bg-secondary"
                    : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                <ProductGlyph icon={o.icon} />
                <span className={`text-[13px] ${selected ? "text-accent" : "text-foreground"}`}>
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {step.options.map((o) => {
            const selected = answers[index] === o.label;
            return (
              <li key={o.label}>
                <button
                  type="button"
                  onClick={() => choose(o.label)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? "border-accent bg-secondary"
                      : "border-border bg-surface hover:border-accent/50"
                  }`}
                >
                  {o.glyph && (
                    <span className="w-12 shrink-0 text-[13px] tracking-tight text-muted-foreground">
                      {o.glyph}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-[15px] ${selected ? "text-accent" : "text-foreground"}`}
                    >
                      {o.label}
                    </span>
                    {o.note && (
                      <span className="block text-[12px] text-muted-foreground">{o.note}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-3 pt-8">
        <span className="text-[12px] text-muted-foreground">
          {index + 1} of {total}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <span
            className="block h-full rounded-full transition-all"
            style={{
              width: `${((index + 1) / total) * 100}%`,
              background: "linear-gradient(90deg, var(--clay), oklch(0.72 0.17 45))",
            }}
          />
        </span>
      </div>
    </div>
  );
}
