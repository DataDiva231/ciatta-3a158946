import { createFileRoute } from "@tanstack/react-router";

import figureAsset from "@/assets/ciatta-figure.png.asset.json";
import { formatLongDate, today } from "@/lib/ciatta-data";
import { useCheckIns } from "@/lib/ciatta-store";
import { buildNarrative } from "@/lib/narrative";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Ciatta" },
      {
        name: "description",
        content:
          "Ciatta reads your sleep, recovery and cycle signals and tells you what your body is asking for today.",
      },
      { property: "og:title", content: "Today — Ciatta" },
      {
        property: "og:description",
        content: "Continuous women's health intelligence, written in plain language.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { latest } = useCheckIns();
  const narrative = buildNarrative(latest);

  return (
    <div className="aura flex min-h-[calc(100dvh-4.5rem)] flex-col pb-2">
      <header className="px-6 pt-4">
        <button
          type="button"
          aria-label="Back"
          className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-medium text-accent">Good morning, Jenny</p>
          <p className="text-[12px] text-muted-foreground">{formatLongDate(today.date)}</p>
        </div>
      </header>

      <div className="relative -mt-2">
        <img
          src={figureAsset.url}
          alt="Ciatta's rendering of your body, lit from within"
          width={1240}
          height={1240}
          className="mx-auto w-full max-w-[150px]"
          style={{
            maskImage:
              "radial-gradient(58% 52% at 50% 44%, black 35%, transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(58% 52% at 50% 44%, black 35%, transparent 82%)",
          }}
        />
      </div>

      <section className="-mt-3 px-6">
        <h1 className="font-serif text-[21px] leading-[1.2] font-light tracking-[-0.01em]">
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        <div className="mt-2 space-y-1.5">
          {narrative.lines.map((line) => (
            <div key={line.label} className="border-t border-border pt-1.5 first:border-t-0 first:pt-0">
              <p className="label-caps text-[9px]">{line.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug">
                {line.parts.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.accent ? "font-serif text-[15px] leading-none text-accent" : undefined
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-2 border-t border-border pt-2">
          <p className="font-serif text-[17px] leading-tight font-light">
            <span className="text-accent">{narrative.guidance.lead}</span>{" "}
            {narrative.guidance.rest}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            {narrative.guidance.support}
          </p>
        </div>
      </section>
    </div>
  );
}
