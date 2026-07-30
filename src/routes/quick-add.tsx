import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import orb from "@/assets/ciatta-orb.png";
import { useQuickAddEvents, type QuickAddEvent } from "@/lib/ciatta-store";
import {
  buildSteps,
  formatDateTime,
  LOGGED_LABEL,
  META_LABEL,
  toLocalInputValue,
  valueKeyFor,
  type Answers,
  type QuickAddOption,
} from "@/lib/quick-add";

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

function ProductGlyph({ icon }: { icon: QuickAddOption["icon"] }) {
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

/** Turns the last answer into a sentence that carries into the next question. */
function continuationFor(steps: { key: string }[], answers: Answers, index: number) {
  if (index === 0) return null;
  const prev = steps[index - 1];
  const value = prev ? answers[prev.key] : undefined;
  if (!value) return null;
  switch (prev.key) {
    case "category":
      return `Got it — ${value.toLowerCase()}.`;
    case "product":
      return `${value} it is.`;
    case "absorbency":
      return `${value} noted.`;
    case "intensity":
      return `${value.toLowerCase()} flow noted.`;
    default:
      return `${value} noted.`;
  }
}

function QuickAddPage() {
  const navigate = useNavigate();
  const { addEvent } = useQuickAddEvents();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [answers, setAnswers] = useState<Answers>({});
  /** ISO timestamp of the event, derived from the timing step. */
  const [eventTime, setEventTime] = useState<string | null>(null);
  const [saved, setSaved] = useState<QuickAddEvent | null>(null);
  const timeInput = useRef<HTMLInputElement>(null);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const total = steps.length;
  const done = index >= total;
  const step = steps[Math.min(index, total - 1)];
  const answeredSteps = steps.slice(0, Math.min(index, total));
  const continuation = continuationFor(steps, answers, index);

  /** Records an answer and drops every answer that belonged to a later step. */
  const setAnswer = (stepIndex: number, label: string) => {
    const keep = steps.slice(0, stepIndex).map((s) => s.key);
    setAnswers((prev) => {
      const next: Answers = {};
      for (const k of keep) if (prev[k] !== undefined) next[k] = prev[k];
      next[steps[stepIndex].key] = label;
      return next;
    });
  };


  const choose = (option: QuickAddOption) => {
    if (option.custom) {
      timeInput.current?.showPicker?.();
      timeInput.current?.focus();
      timeInput.current?.click();
      return;
    }
    if (step.key === "timing") {
      const when = new Date(Date.now() - (option.minutesAgo ?? 0) * 60_000);
      setEventTime(when.toISOString());
    }
    setDirection("forward");
    setAnswer(index, option.label);
    setIndex(index + 1);
  };

  const chooseCustomTime = (value: string) => {
    if (!value) return;
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return;
    setEventTime(when.toISOString());
    setDirection("forward");
    setAnswer(index, formatDateTime(when.toISOString()));
    setIndex(index + 1);
  };

  const goTo = (target: number) => {
    setDirection(target > index ? "forward" : "back");
    setIndex(target);
  };

  const back = () => {
    if (index === 0) {
      navigate({ to: "/teach" });
      return;
    }
    // Previous selections stay in state, so the step shows what was chosen.
    goTo(index - 1);
  };


  /** Builds the structured event and writes it to the shared store. */
  const save = () => {
    if (saved) return saved;
    const category = answers.category ?? "Something Else";
    const valueKey = valueKeyFor(category);
    const metadata: Record<string, string> = {};
    for (const s of steps) {
      if (s.key === "category" || s.key === valueKey) continue;
      const a = answers[s.key];
      if (a) metadata[META_LABEL[s.key] ?? s.key] = a;
    }
    const event = addEvent({
      category,
      value: answers[valueKey] ?? category,
      timestamp: eventTime ?? new Date().toISOString(),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
    setSaved(event);
    return event;
  };

  // Persist as soon as the confirmation screen is reached so Today refreshes now.
  useEffect(() => {
    if (done) save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    const confirmed = saved;
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
          {steps.map((s) =>
            answers[s.key] ? (
              <li
                key={s.key}
                className="flex items-center gap-3 border-t border-border px-4 py-3.5 first:border-t-0"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-accent">
                  <CheckIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] text-foreground">
                    {LOGGED_LABEL[s.key] ?? "Detail logged"}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{answers[s.key]}</span>
                </span>
              </li>
            ) : null,
          )}
          <li className="flex items-center gap-3 border-t border-border px-4 py-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-accent">
              <CheckIcon />
            </span>
            <span>
              <span className="block text-[14px] text-foreground">Predictions refined</span>
              <span className="block text-[12px] text-muted-foreground">
                {confirmed ? formatDateTime(confirmed.timestamp) : "Leak risk updated"}
              </span>
            </span>
          </li>
        </ul>

        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
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
        {index > 0 && (
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[12px] text-accent">
            {answeredSteps.map((s, i) =>
              answers[s.key] ? (
                <span key={s.key} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-fog">•</span>}
                  {answers[s.key]}
                </span>
              ) : null,
            )}
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
            const selected = answers[step.key] === o.label;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => choose(o)}
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
            const selected = answers[step.key] === o.label;
            return (
              <li key={o.label} className="relative">
                <button
                  type="button"
                  onClick={() => choose(o)}
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
                {/* Invisible native date/time picker layered over the "Custom time" row. */}
                {o.custom && (
                  <input
                    ref={timeInput}
                    type="datetime-local"
                    aria-label="Custom time"
                    max={toLocalInputValue(new Date())}
                    defaultValue={toLocalInputValue(new Date())}
                    onChange={(e) => chooseCustomTime(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                )}
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
