import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useOnboarding } from "@/lib/onboarding-store";
import { TOUR_STEPS, useTour } from "@/lib/product-tour";

type Rect = { top: number; left: number; width: number; height: number };

function measure(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A quiet contextual introduction to the four core surfaces. It never
 * navigates: it only lifts each destination out of a dimmed interface.
 */
export function ProductTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: onboarding, hydrated: obHydrated } = useOnboarding();
  const { tour, save, hydrated } = useTour();

  const eligible =
    pathname === "/today" &&
    obHydrated &&
    hydrated &&
    onboarding.completed &&
    onboarding.firstObservationDone &&
    (!tour.seen || tour.requested);

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = TOUR_STEPS[index];

  // Highlights follow the real elements, so the tour stays honest on any size.
  useEffect(() => {
    if (!eligible || !step) return;
    let frame = 0;
    const sync = () => setRect(measure(step.target));
    frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [eligible, step, index]);

  const finish = useCallback(() => {
    setIndex(0);
    save({ seen: true, requested: false });
  }, [save]);

  if (!eligible || !step) return null;

  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const pad = 8;
  const cardStyle: React.CSSProperties = rect
    ? step.place === "above"
      ? { bottom: Math.max(16, vh - rect.top + 14) }
      : { top: rect.top + rect.height + 14 }
    : { bottom: 120 };

  const last = index === TOUR_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Product tour: ${step.title}`}
      className="animate-in fade-in fixed inset-0 z-50 duration-300"
    >
      {/* Dim + spotlight in one layer, so the app stays visible underneath. */}
      <button
        type="button"
        aria-label="Dismiss tour"
        onClick={finish}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      {rect && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full transition-all duration-300 ease-out"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 24%, transparent)",
          }}
        />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center px-5 transition-all duration-300 ease-out"
        style={cardStyle}
      >
        <div
          key={step.target}
          className="animate-in fade-in pointer-events-auto w-full max-w-[330px] rounded-[20px] bg-background px-6 py-6 duration-300"
          style={{
            boxShadow: "0 18px 44px -28px color-mix(in oklab, var(--foreground) 40%, transparent)",
          }}
        >
          <p className="label-caps text-muted-foreground/70">
            {index + 1} of {TOUR_STEPS.length}
          </p>
          <h2 className="mt-3 font-serif text-[24px] leading-none tracking-[-0.015em]">
            {step.title}
          </h2>
          <p className="mt-3 text-[14px] leading-[1.55] text-muted-foreground">{step.body}</p>

          <div className="mt-6 flex items-center justify-between">
            {index === 0 ? (
              <button
                type="button"
                onClick={finish}
                className="text-[14px] text-muted-foreground transition-opacity hover:opacity-70"
              >
                Skip
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="text-[14px] text-muted-foreground transition-opacity hover:opacity-70"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setIndex((i) => i + 1))}
              className="rounded-full bg-foreground px-6 py-2.5 text-[14px] text-background transition-opacity hover:opacity-85"
            >
              {last ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
