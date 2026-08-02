/**
 * Quick Add, as a bottom sheet.
 *
 * Quick Add is not a destination — it is another way of answering the question
 * already on screen. The sheet slides up over Teach, keeps that question
 * visible behind it, and transforms in place from the category chips into the
 * chosen category's logging step. Completing a log dismisses the sheet and
 * hands a short summary back to the host screen.
 */

import { useEffect, useMemo, useState } from "react";

import { useQuickAddEvents } from "@/lib/ciatta-store";
import { haptic } from "@/lib/haptics";
import {
  buildSteps,
  META_LABEL,
  valueKeyFor,
  type Answers,
  type QuickAddOption,
} from "@/lib/quick-add";

/** Thumb-first ordering: the categories reached for most often come first. */
const CATEGORY_ORDER = [
  "Period Product",
  "Flow",
  "Symptoms",
  "Sleep",
  "Medication",
  "Nutrition",
  "Activity",
  "Something Else",
];

function ProductGlyph({ icon }: { icon: QuickAddOption["icon"] }) {
  const s = { stroke: "var(--muted-foreground)", strokeWidth: 1.3, fill: "none" } as const;
  switch (icon) {
    case "tampon":
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <rect x="13" y="8" width="18" height="20" rx="9" {...s} />
          <path d="M22 28v9" {...s} strokeLinecap="round" />
        </svg>
      );
    case "pad":
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <rect x="10" y="12" width="24" height="20" rx="10" {...s} />
          <path d="M10 18H5m29 0h5M10 26H5m29 0h5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "cup":
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <path d="M13 12h18l-2.5 15a6.5 6.5 0 0 1-13 0L13 12Z" {...s} strokeLinejoin="round" />
          <path d="M22 33v5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "disc":
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <ellipse cx="22" cy="22" rx="14" ry="7" {...s} />
          <ellipse cx="22" cy="22" rx="8" ry="3.5" {...s} />
        </svg>
      );
    case "underwear":
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <path
            d="M8 14h28l-2 8c-4 1-7 4-8 10h-8c-1-6-4-9-8-10l-2-8Z"
            {...s}
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="12" {...s} />
          <path d="M13.5 13.5 30.5 30.5" {...s} strokeLinecap="round" />
        </svg>
      );
  }
}

export type PresetStep = {
  title: string;
  sub: string;
  options: QuickAddOption[];
};

export type QuickAddSheetProps = {
  open: boolean;
  /** Opens straight into a category, skipping the chips. */
  presetCategory?: string;
  /**
   * Opens straight into a tailored follow-up for the tapped moment. Choosing
   * one of these options completes the log in a single step.
   */
  presetStep?: PresetStep;
  /** What sharing this gives back to her, shown under the sheet title. */
  reason?: string;
  onClose: () => void;
  /** Called with a short summary, e.g. "Flow: Moderate". */
  onLogged: (summary: string) => void;
};

export function QuickAddSheet({
  open,
  presetCategory,
  presetStep,
  reason,
  onClose,
  onLogged,
}: QuickAddSheetProps) {
  const { addEvent } = useQuickAddEvents();
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

  // Each opening is a fresh answer to the question currently on screen.
  useEffect(() => {
    if (!open) return;
    setAnswers(presetCategory ? { category: presetCategory } : {});
    setIndex(presetCategory ? 1 : 0);
    setPending(null);
  }, [open, presetCategory]);

  const derived = useMemo(() => buildSteps(answers), [answers]);
  const usePreset = Boolean(presetStep) && index === 1;
  const steps = derived;
  const step = usePreset
    ? { key: "preset", layout: "list" as const, ...presetStep! }
    : steps[Math.min(index, steps.length - 1)];
  const isCategory = step.key === "category";

  const options = useMemo(() => {
    if (!isCategory) return step.options;
    return [...step.options].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.label) - CATEGORY_ORDER.indexOf(b.label),
    );
  }, [step, isCategory]);


  /** Writes the event and hands the summary back to the host screen. */
  const commit = (final: Answers) => {
    const category = final.category ?? "Something Else";
    const valueKey = valueKeyFor(category);
    const value = final[valueKey] ?? category;
    const metadata: Record<string, string> = {};
    for (const s of buildSteps(final)) {
      if (s.key === "category" || s.key === valueKey) continue;
      const a = final[s.key];
      if (a) metadata[META_LABEL[s.key] ?? s.key] = a;
    }
    addEvent({
      category,
      value,
      timestamp: new Date().toISOString(),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
    try {
      sessionStorage.setItem("ciatta:just-taught", String(Date.now()));
    } catch {
      /* storage unavailable — the refresh cue is optional */
    }
    haptic("confirm");
    onLogged(`${category}: ${value}`);
    onClose();
  };

  const choose = (option: QuickAddOption) => {
    if (pending) return;
    haptic("tap");
    setPending(option.label);

    // A tailored follow-up answers the moment in one step.
    if (usePreset) {
      const category = presetCategory ?? "Something Else";
      window.setTimeout(() => {
        setPending(null);
        commit({ category, [valueKeyFor(category)]: option.label });
      }, 180);
      return;
    }

    const keep = steps.slice(0, index).map((s) => s.key);
    const next: Answers = {};
    for (const k of keep) if (answers[k] !== undefined) next[k] = answers[k];
    next[step.key] = option.label;

    // A short beat so the selection registers before the sheet transforms.
    window.setTimeout(() => {
      setPending(null);
      if (index + 1 >= buildSteps(next).length) {
        commit(next);
        return;
      }
      setAnswers(next);
      setIndex(index + 1);
    }, 180);
  };


  const back = () => {
    haptic("tap");
    if (index <= (presetCategory ? 1 : 0)) {
      onClose();
      return;
    }
    setIndex(index - 1);
  };

  if (!open) return null;

  const trail = steps
    .slice(0, index)
    .map((s) => answers[s.key])
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* The question behind stays visible: the scrim only softens it. */}
      <button
        type="button"
        aria-label="Close Quick Add"
        onClick={onClose}
        className="animate-in fade-in absolute inset-0 bg-background duration-500"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Add"
        className="animate-sheet-up relative w-full max-w-[480px] rounded-t-[28px] bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>

        <div className="flex min-h-9 items-center gap-3 px-5 pt-2">
          <button
            type="button"
            onClick={back}
            aria-label={index > (presetCategory ? 1 : 0) ? "Back" : "Close"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-opacity active:opacity-70"
          >
            {index > (presetCategory ? 1 : 0) ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 5 8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          {trail && (
            <span className="animate-dissolve truncate rounded-full bg-secondary px-3 py-1.5 text-[11.5px] leading-none text-accent">
              {trail}
            </span>
          )}
        </div>

        <div key={`${step.key}-${index}`} className="animate-dissolve px-6 pt-4">
          <h2 className="font-serif text-[23px] leading-[1.15] tracking-[-0.015em]">
            {isCategory ? "What would you like to share?" : step.title}
          </h2>
          <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground">
            {reason && isCategory ? reason : step.sub}
          </p>

          {isCategory ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {options.map((o) => {
                const active = pending === o.label;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => choose(o)}
                    aria-pressed={active}
                    className={`inline-flex h-[38px] items-center rounded-full px-4 text-[14px] leading-none shadow-soft transition-all duration-200 active:scale-[0.97] ${
                      active
                        ? "scale-[1.03] bg-accent text-accent-foreground"
                        : "bg-background text-foreground ring-1 ring-border/70"
                    }`}
                  >
                    {o.label === "Something Else" ? "More" : o.label}
                  </button>
                );
              })}
            </div>
          ) : step.layout === "grid" ? (
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {options.map((o) => {
                const active = pending === o.label;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => choose(o)}
                    className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-[18px] px-2 py-3 text-center transition-all duration-200 active:scale-[0.98] ${
                      active ? "bg-secondary ring-1 ring-accent" : "bg-background ring-1 ring-border/60"
                    }`}
                  >
                    <ProductGlyph icon={o.icon} />
                    <span
                      className={`text-[11.5px] leading-tight ${active ? "text-accent" : "text-foreground"}`}
                    >
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {options.map((o) => {
                const active = pending === o.label;
                return (
                  <li key={o.label}>
                    <button
                      type="button"
                      onClick={() => choose(o)}
                      className={`flex min-h-[54px] w-full items-center gap-3.5 rounded-[18px] px-4 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
                        active ? "bg-secondary ring-1 ring-accent" : "bg-background ring-1 ring-border/60"
                      }`}
                    >
                      {o.glyph && (
                        <span className="w-10 shrink-0 text-[12.5px] tracking-tight text-muted-foreground">
                          {o.glyph}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[14.5px] leading-tight ${active ? "text-accent" : "text-foreground"}`}
                        >
                          {o.label}
                        </span>
                        {o.note && (
                          <span className="mt-0.5 block text-[11.5px] leading-none text-muted-foreground">
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
      </div>
    </div>
  );
}
