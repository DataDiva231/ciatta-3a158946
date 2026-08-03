import { useEffect, useState } from "react";

import { Reveal, useReducedMotion } from "./atoms";
import { WaitlistForm } from "./waitlist-form";

/**
 * The manifesto: four slides that change themselves. No arrows, no dots — the
 * page simply keeps speaking, slowly, and the last slide invites you in.
 */

const SLIDES = [
  {
    index: "01",
    label: "Why we exist",
    headline: "Women have been asked to guess.",
    lines: [
      "For decades, women's health has been measured in averages built from bodies that aren't yours.",
      "So you learn to guess — and to doubt what you feel.",
    ],
  },
  {
    index: "02",
    label: "The problem",
    headline: "Health data isn't understanding.",
    lines: [
      "More numbers didn't make anything clearer. Scores, rings and streaks describe the day; they never explain it.",
      "Nothing was actually listening.",
    ],
  },
  {
    index: "03",
    label: "The reality",
    headline: "Your body has been telling you all along.",
    lines: [
      "The signals were always there — quieter than an alert, and far more honest.",
      "They just needed something patient enough to notice.",
    ],
  },
  {
    index: "04",
    label: "We're building a better way",
    headline: "One intelligence, learning only you.",
    lines: [
      "Ciatta listens continuously, learns what's normal for you, and speaks in plain language.",
      "Not a score. An understanding.",
    ],
  },
] as const;

const INTERVAL_MS = 9000;

function Art({ variant }: { variant: number }) {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
    strokeLinecap: "round" as const,
  };
  return (
    <svg viewBox="0 0 220 220" className="text-ink-faint h-full w-full" aria-hidden="true">
      {variant === 0 && (
        <>
          <circle {...line} cx="110" cy="110" r="76" />
          <path {...line} d="M34 110h152" />
        </>
      )}
      {variant === 1 && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} {...line} d={`M30 ${60 + i * 25}h160`} opacity={0.35 + i * 0.12} />
          ))}
        </>
      )}
      {variant === 2 && (
        <>
          <path {...line} d="M20 150c40 0 50-80 90-80s50 80 90 80" />
          <circle {...line} cx="110" cy="70" r="5" />
        </>
      )}
      {variant === 3 && (
        <>
          <circle {...line} cx="110" cy="110" r="30" />
          <circle {...line} cx="110" cy="110" r="58" opacity={0.6} />
          <circle {...line} cx="110" cy="110" r="86" opacity={0.3} />
        </>
      )}
    </svg>
  );
}

function Slide({ slide, variant }: { slide: (typeof SLIDES)[number]; variant: number }) {
  return (
    <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
      <div>
        <p className="text-[10px] font-medium tracking-[0.3em] text-clay uppercase">
          {slide.label}
        </p>
        <h3 className="font-serif text-ink mt-7 max-w-[22ch] text-[32px] leading-[1.08] sm:text-[44px]">
          {slide.headline}
        </h3>
        {slide.lines.map((text) => (
          <p key={text} className="text-ink-soft mt-6 max-w-[46ch] text-[14.5px] leading-[1.85]">
            {text}
          </p>
        ))}
        {variant === 3 && (
          <div className="mt-12">
            <WaitlistForm source="manifesto" />
            <p className="text-ink-faint mt-8 text-[11px] tracking-[0.28em] uppercase">
              Launching 2027
            </p>
          </div>
        )}
      </div>
      <div className="mx-auto hidden h-[220px] w-[220px] lg:block">
        <Art variant={variant} />
      </div>
    </div>
  );
}

export function Manifesto() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % SLIDES.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <section className="px-6 pt-32 pb-28 sm:px-10 sm:pt-44">
      <Reveal className="mx-auto max-w-6xl">
        <p className="text-ink-faint text-[11px] tracking-[0.32em] uppercase">Manifesto</p>
      </Reveal>

      {reduced ? (
        <div className="mx-auto mt-16 max-w-6xl space-y-28">
          {SLIDES.map((slide, index) => (
            <Slide key={slide.index} slide={slide} variant={index} />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-[auto_minmax(0,1fr)] gap-8 sm:gap-14">
          <ul className="flex flex-col gap-6 pt-1">
            {SLIDES.map((slide, index) => (
              <li
                key={slide.index}
                aria-hidden="true"
                className={`text-[11px] tracking-[0.18em] transition-colors duration-700 ${
                  index === active ? "text-clay" : "text-ink-faint/60"
                }`}
              >
                {slide.index}
              </li>
            ))}
          </ul>

          <div className="relative min-h-[560px] sm:min-h-[480px]">
            {SLIDES.map((slide, index) => (
              <div
                key={slide.index}
                aria-hidden={index !== active}
                className="absolute inset-0"
                style={{
                  opacity: index === active ? 1 : 0,
                  pointerEvents: index === active ? "auto" : "none",
                  // Outgoing leaves first, incoming arrives after: never two
                  // slides speaking at once.
                  transition:
                    index === active
                      ? "opacity 900ms cubic-bezier(0.22,0.61,0.36,1) 700ms"
                      : "opacity 700ms cubic-bezier(0.22,0.61,0.36,1)",
                }}
              >
                <Slide slide={slide} variant={index} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
