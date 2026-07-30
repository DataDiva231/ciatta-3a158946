import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import orb from "@/assets/ciatta-orb.png";
import { useQuickAddEvents, type QuickAddEvent } from "@/lib/ciatta-store";
import {
  buildSteps,
  CONFIRM_LABEL,
  formatDateTime,
  LOGGED_LABEL,
  META_LABEL,
  toLocalInputValue,
  valueKeyFor,
  type Answers,
  type QuickAddOption,
} from "@/lib/quick-add";

export const Route = createFileRoute("/quick-add")({
  // Teach can deep-link straight into a category, skipping the first question.
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
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
  const { addEvent, events } = useQuickAddEvents();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [answers, setAnswers] = useState<Answers>({});
  /** ISO timestamp of the event. Defaults to now; the time chip can adjust it. */
  const [eventTime, setEventTime] = useState<string | null>(null);
  const [saved, setSaved] = useState<QuickAddEvent | null>(null);
  const timeInput = useRef<HTMLInputElement>(null);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const total = steps.length;
  const done = index >= total;
  const step = steps[Math.min(index, total - 1)];
  const answeredSteps = steps.slice(0, Math.min(index, total));
  const continuation = continuationFor(steps, answers, index);

  /** The most recent period-product log, offered as a one-tap repeat. */
  const lastProduct = useMemo(
    () => events.find((e) => e.category === "Period Product" && e.metadata),
    [events],
  );

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
    setDirection("forward");
    setAnswer(index, option.label);
    setIndex(index + 1);
  };

  /** One tap re-logs the last product, absorbency and flow, timestamped now. */
  const repeatLast = () => {
    if (!lastProduct) return;
    const meta = lastProduct.metadata ?? {};
    setDirection("forward");
    setEventTime(new Date().toISOString());
    setAnswers({
      category: "Period Product",
      product: lastProduct.value,
      ...(meta.Absorbency ? { absorbency: meta.Absorbency } : {}),
      ...(meta.Flow ? { intensity: meta.Flow } : {}),
    });
    setIndex(9);
  };

  const chooseCustomTime = (value: string) => {
    if (!value) return;
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return;
    setEventTime(when.toISOString());
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

  // "Understanding updated" is a moment, not a screen: it returns to Today on its own.
  useEffect(() => {
    if (!done) return;
    try {
      sessionStorage.setItem("ciatta:just-taught", String(Date.now()));
    } catch {
      /* storage unavailable — the refresh cue is optional */
    }
    const t = setTimeout(() => navigate({ to: "/" }), 950);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    const rows = [
      ...steps
        .filter((s) => s.key !== "category" && answers[s.key])
        .map((s) => ({
          key: s.key,
          label: CONFIRM_LABEL[s.key] ?? LOGGED_LABEL[s.key] ?? "Logged",
          value: answers[s.key],
        })),
      {
        key: "timing",
        label: "Timeline updated",
        value: eventTime ? formatDateTime(eventTime) : "Just now",
      },
      { key: "understanding", label: "Understanding refined", value: "Leak risk updated" },
    ];

    return (
      <div className="flex min-h-full flex-col justify-center px-6 pb-12">
        <div className="relative mx-auto grid place-items-center">
          <span
            className="absolute h-[176px] w-[176px] animate-ping rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, var(--clay) 0%, transparent 62%)" }}
            aria-hidden="true"
          />
          <span
            className="animate-in zoom-in-50 absolute h-[140px] w-[140px] rounded-full opacity-50 blur-xl duration-700"
            style={{ background: "radial-gradient(circle, var(--clay) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <img
            src={orb}
            alt=""
            width={1024}
            height={1024}
            loading="eager"
            className="animate-in zoom-in-95 relative w-[140px] duration-500"
          />
        </div>

        <h1 className="animate-in fade-in mt-6 text-center font-serif text-[27px] leading-[1.15] tracking-[-0.01em] duration-300">
          Understanding updated
        </h1>
        <p className="animate-in fade-in mt-2.5 text-center text-[13px] leading-relaxed text-muted-foreground duration-500">
          Thank you! Every update makes Ciatta smarter.
        </p>

        <ul className="mt-8 overflow-hidden rounded-[20px] bg-surface px-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards flex items-center gap-3.5 border-t border-border/60 py-3.5 duration-300 first:border-t-0"
              style={{ animationDelay: `${80 + i * 90}ms` }}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-accent">
                <CheckIcon />
              </span>
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span className="text-[14px] leading-none text-foreground">{r.label}</span>
                <span className="truncate text-[12px] leading-none text-muted-foreground">
                  {r.value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }




  return (
    <div className="flex min-h-full flex-col px-6 pb-6 pt-6">
      <div className="flex min-h-11 items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-opacity active:opacity-70 ${
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
          <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-[12px] leading-none text-accent">
            {answeredSteps.map((s, i) =>
              answers[s.key] ? (
                <span key={s.key} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <span className="text-fog">·</span>}
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className="animate-in fade-in zoom-in-95 max-w-[100px] truncate duration-300"
                  >
                    {answers[s.key]}
                  </button>
                </span>
              ) : null,
            )}
            <CheckIcon className="shrink-0 text-accent" />
          </div>
        )}

        <span className="h-11 w-11 shrink-0" />
      </div>

      <div
        key={`${step.key}-${index}`}
        className={`animate-in fade-in duration-300 ease-out ${
          direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4"
        }`}
      >
        <h1 className="mt-7 text-center font-serif text-[27px] leading-[1.15] tracking-[-0.01em]">
          {step.title}
        </h1>
        <p className="mx-auto mt-2.5 max-w-[30ch] text-center text-[13px] leading-relaxed text-muted-foreground">
          {continuation ? (
            <>
              <span className="text-foreground">{continuation}</span> {step.sub}
            </>
          ) : (
            step.sub
          )}
        </p>

        {step.key === "category" && lastProduct && (
          <button
            type="button"
            onClick={repeatLast}
            className="mt-8 flex w-full items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5 text-left ring-1 ring-accent/40 transition-all duration-200 active:scale-[0.99]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-tight text-accent">Same as last time</span>
              <span className="mt-1 block truncate text-[12px] leading-none text-muted-foreground">
                {[lastProduct.value, lastProduct.metadata?.Absorbency, lastProduct.metadata?.Flow]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-[12px] leading-none text-muted-foreground">1 tap</span>
          </button>
        )}

        {step.key === "category" && <p className="label-caps mt-8">Today's suggestions</p>}



        {step.layout === "grid" ? (
          <div className={`grid grid-cols-2 gap-3 ${step.key === "category" ? "mt-3" : "mt-8"}`}>
            {step.options.map((o) => {
              const selected = answers[step.key] === o.label;
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => choose(o)}
                  className={`flex min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-[20px] bg-surface px-3 py-5 transition-all duration-200 active:scale-[0.98] ${
                    selected
                      ? "ring-1 ring-accent"
                      : "shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-border/60"
                  }`}
                >
                  <ProductGlyph icon={o.icon} />
                  <span
                    className={`text-[13px] leading-none ${selected ? "text-accent" : "text-foreground"}`}
                  >
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <ul className="mt-8 space-y-2.5">
            {step.options.map((o) => {
              const selected = answers[step.key] === o.label;
              return (
                <li key={o.label} className="relative">
                  <button
                    type="button"
                    onClick={() => choose(o)}
                    className={`flex min-h-[60px] w-full items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99] ${
                      selected
                        ? "ring-1 ring-accent"
                        : "shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-border/60"
                    }`}
                  >
                    {o.glyph && (
                      <span className="w-11 shrink-0 text-[13px] tracking-tight text-muted-foreground">
                        {o.glyph}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[15px] leading-tight ${selected ? "text-accent" : "text-foreground"}`}
                      >
                        {o.label}
                      </span>
                      {o.note && (
                        <span className="mt-1 block text-[12px] leading-none text-muted-foreground">
                          {o.note}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-10">
        {index > 0 && (
          <div className="relative mb-4 flex justify-center">
            <span className="flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2 text-[12px] leading-none text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {eventTime ? formatDateTime(eventTime) : "Just now"}
              <span className="text-accent">Change</span>
            </span>
            {/* Invisible native picker — timing is assumed, never asked. */}
            <input
              ref={timeInput}
              type="datetime-local"
              aria-label="Adjust the time of this log"
              max={toLocalInputValue(new Date())}
              defaultValue={toLocalInputValue(new Date())}
              onChange={(e) => chooseCustomTime(e.target.value)}
              className="absolute inset-0 mx-auto h-full w-[220px] cursor-pointer opacity-0"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[12px] leading-none tabular-nums text-muted-foreground">
            {index + 1} of {total}
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <span
              className="block h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${((index + 1) / total) * 100}%`,
                background: "linear-gradient(90deg, var(--clay), oklch(0.72 0.17 45))",
              }}
            />
          </span>
        </div>
      </div>


    </div>
  );
}

