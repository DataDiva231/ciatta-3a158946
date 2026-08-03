import { Reveal } from "./atoms";
import { TodayCard } from "./today-card";

/**
 * The signals, shown as quiet marks rather than metrics. The point of the
 * section is the sentence underneath them, not the grid.
 */

type Signal = { label: string; path: JSX.Element };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SIGNALS: Signal[] = [
  { label: "Sleep", path: <path {...stroke} d="M16 6a7 7 0 1 0 6 10A8 8 0 0 1 16 6Z" /> },
  {
    label: "Heart rate",
    path: <path {...stroke} d="M4 14h4l2-4 3 8 3-6 2 2h4" />,
  },
  {
    label: "Temperature",
    path: (
      <>
        <path {...stroke} d="M11 15V6a2 2 0 1 1 4 0v9" />
        <circle {...stroke} cx="13" cy="18" r="3.5" />
      </>
    ),
  },
  {
    label: "Movement",
    path: (
      <>
        <circle {...stroke} cx="14" cy="6" r="2" />
        <path {...stroke} d="M13 9v5l-3 6M13 11l4 3 1 6" />
      </>
    ),
  },
  {
    label: "Recovery",
    path: (
      <>
        <circle {...stroke} cx="13" cy="13" r="7" />
        <path {...stroke} d="M13 6v7l5 3" />
      </>
    ),
  },
  {
    label: "Cycle",
    path: (
      <>
        <circle {...stroke} cx="13" cy="13" r="7" />
        <path {...stroke} d="M20 13a7 7 0 0 1-7 7" strokeWidth={1.6} />
      </>
    ),
  },
  {
    label: "Hydration",
    path: <path {...stroke} d="M13 5c3 4 5 6.5 5 9a5 5 0 1 1-10 0c0-2.5 2-5 5-9Z" />,
  },
  {
    label: "How you feel",
    path: (
      <>
        <path {...stroke} d="M13 5v16M5 13h16" />
        <path {...stroke} d="M8 8l10 10M18 8L8 18" opacity={0.45} />
      </>
    ),
  },
];

export function Intelligence() {
  return (
    <section className="px-6 pt-32 pb-8 sm:px-10 sm:pt-44">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Reveal>
          <h2 className="font-serif text-ink max-w-[24ch] text-[32px] leading-[1.1] sm:text-[42px]">
            Every observation becomes part of a larger picture.
          </h2>

          <ul className="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            {SIGNALS.map((signal, index) => (
              <Reveal as="li" key={signal.label} delay={index * 60}>
                <span className="text-ink-faint block">
                  <svg viewBox="0 0 26 26" className="h-6 w-6" aria-hidden="true">
                    {signal.path}
                  </svg>
                </span>
                <span className="text-ink-soft mt-4 block text-[12px] leading-[1.5]">
                  {signal.label}
                </span>
              </Reveal>
            ))}
          </ul>

          <div className="bg-hairline mt-14 h-px w-full max-w-[420px]" />

          <p className="text-ink-soft mt-10 max-w-[40ch] text-[14.5px] leading-[1.85]">
            Over time, the signals stop being numbers and start being you.
          </p>
          <p className="font-serif text-ink mt-6 max-w-[24ch] text-[24px] leading-[1.24] sm:text-[28px]">
            That&rsquo;s how understanding grows.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <TodayCard compact />
        </Reveal>
      </div>
    </section>
  );
}
