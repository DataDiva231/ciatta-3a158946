import { useEffect, useRef, useState } from "react";

import heroAsset from "@/assets/ciatta-hero.png.asset.json";
import { Reveal, Wordmark, useReducedMotion } from "./atoms";
import { TodayCard } from "./today-card";
import { WaitlistForm } from "./waitlist-form";

/**
 * Hero → Today, as one continuous scroll movement.
 *
 * The hero holds still while the page scrolls: the woman recedes, and the Today
 * card rises from the fold until it owns the screen. Nothing bounces, nothing
 * parallaxes for effect — one intention, resolved.
 */

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

/** Progress of the whole movement, 0 → 1. */
function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      setProgress(travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel)));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);

  return progress;
}

function HeroCopy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "max-w-[30ch]"}>
      <h1 className="font-serif text-ink text-[42px] leading-[1.04] sm:text-[56px] lg:text-[64px]">
        Finally understand your body.
      </h1>
      <p className="text-ink-soft mt-7 max-w-[34ch] text-[14.5px] leading-[1.8]">
        Ciatta listens continuously, learns what&rsquo;s normal for you, and tells you what your
        body is asking for — in plain language.
      </p>
      <WaitlistForm source="hero" className="mt-10" />
    </div>
  );
}

function HeroPhoto({ className = "" }: { className?: string }) {
  return (
    <img
      src={heroAsset.url}
      alt="A woman resting with her eyes closed, wearing the Ciatta Arc"
      className={`h-full w-full object-cover ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}

export function HeroToday() {
  const reduced = useReducedMotion();
  const wrapper = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(wrapper, !reduced);

  if (reduced) {
    return (
      <section className="px-6 pt-8 pb-24 sm:px-10">
        <header className="mb-16">
          <Wordmark />
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <HeroCopy />
          <div className="h-[62vh] overflow-hidden rounded-[28px]">
            <HeroPhoto />
          </div>
        </div>
        <div className="mx-auto mt-24 max-w-[560px]">
          <TodayCard />
          <p className="text-ink-soft mt-12 text-center text-[14px] leading-[1.85]">
            Ciatta learns from the patterns your body has been revealing over time, then turns
            them into guidance you can actually use.
          </p>
        </div>
      </section>
    );
  }

  // Piecewise fade: present, then receding, then gone.
  const heroOpacity =
    progress < 0.18
      ? 1
      : progress < 0.5
        ? lerp(1, 0.26, (progress - 0.18) / 0.32)
        : progress < 0.82
          ? lerp(0.26, 0, (progress - 0.5) / 0.32)
          : 0;

  const cardShift = lerp(92, 0, progress / 0.68);
  const copyOpacity = lerp(0, 1, (progress - 0.78) / 0.18);

  return (
    <div ref={wrapper} className="relative h-[320vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 flex flex-col px-6 pt-8 sm:px-10"
          style={{
            opacity: heroOpacity,
            transform: `translate3d(0, ${-progress * 44}px, 0)`,
            willChange: "opacity, transform",
          }}
        >
          <header>
            <Wordmark />
          </header>
          <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <HeroCopy />
            <div className="hidden h-[64svh] overflow-hidden rounded-[28px] lg:block">
              <HeroPhoto />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex h-[100svh] items-start justify-center px-4 pt-[6svh]"
          style={{
            transform: `translate3d(0, ${cardShift}svh, 0)`,
            willChange: "transform",
          }}
        >
          <div className="pointer-events-auto w-full max-w-[560px]">
            <TodayCard />
            <p
              className="text-ink-soft mx-auto mt-10 max-w-[46ch] text-center text-[14px] leading-[1.85]"
              style={{ opacity: copyOpacity }}
            >
              Ciatta learns from the patterns your body has been revealing over time, then turns
              them into guidance you can actually use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
