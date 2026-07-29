import { createFileRoute } from "@tanstack/react-router";

import figureAsset from "@/assets/ciatta-figure-cut.png.asset.json";
import figureWebp from "@/assets/ciatta-figure-cut.webp.asset.json";
import { formatLongDate, today } from "@/lib/ciatta-data";
import { useCheckIns } from "@/lib/ciatta-store";
import { buildNarrative, type NarrativeLine } from "@/lib/narrative";


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
        content: "Ciatta reads your sleep, recovery and cycle signals and tells you what your body is asking for today.",
      },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: figureWebp.url,
        type: "image/webp",
        fetchpriority: "high",
      },
    ],
  }),

  component: TodayPage,
});

function TodayPage() {
  const { latest } = useCheckIns();
  const narrative = buildNarrative(latest);
  const primaryLabels = ["Sleep quality", "Resting heart rate"];
  const primaryLines = narrative.lines.filter((l) => primaryLabels.includes(l.label));
  const restLines = narrative.lines.filter((l) => !primaryLabels.includes(l.label));

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex min-h-[calc(100svh-76px)] flex-col">
      <header className="px-6 pt-8 [@media(max-height:780px)]:pt-4">
        <button
          type="button"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground [@media(max-height:780px)]:h-9 [@media(max-height:780px)]:w-9"
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
        <p className="mt-4 text-[15px] font-medium text-accent [@media(max-height:780px)]:mt-3">
          Good morning, Jenny
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{formatLongDate(today.date)}</p>
      </header>

      <div className="relative -mt-8 flex justify-center overflow-hidden [@media(max-height:780px)]:-mt-5">
        <picture className="contents">
          <source srcSet={figureWebp.url} type="image/webp" />
          <img
            src={figureAsset.url}
            alt="Ciatta's rendering of your body, lit from within"
            width={1024}
            height={1024}
            decoding="async"
            fetchPriority="high"
            className="mx-auto w-[94%] max-w-[430px] [@media(max-height:780px)]:w-[70%] [@media(max-height:780px)]:max-w-[300px] [@media(max-height:660px)]:w-[56%] [@media(max-height:660px)]:max-w-[240px]"
            style={{
              maskImage: "linear-gradient(to bottom, black 74%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 74%, transparent 98%)",
            }}
          />
        </picture>
      </div>


      <section className="mt-auto px-6 pb-2">
        <h1 className="font-serif text-[30px] leading-[1.15] font-light tracking-[-0.01em] [@media(max-height:780px)]:text-[26px]">
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        <div className="mt-4 divide-y divide-border border-t border-border">
          {primaryLines.map((line) => (
            <NarrativeBlock key={line.label} line={line} compact />
          ))}

          <div className="py-3">
            <p className="label-caps">Guidance</p>
            <p className="mt-1 font-serif text-[18px] leading-[1.3] font-light whitespace-nowrap">
              <span className="text-accent">{narrative.guidance.lead}</span>{" "}
              {narrative.guidance.rest}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] whitespace-nowrap text-muted-foreground">
              {narrative.guidance.support}
            </p>
          </div>


        </div>
      </section>
      </div>



      <section className="px-6 pb-2">
        <div className="divide-y divide-border border-t border-border">
          {restLines.map((line) => (
            <NarrativeBlock key={line.label} line={line} wrap />
          ))}
        </div>

        {!latest && (
          <p className="mt-5 rounded-2xl bg-secondary px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            Ciatta is reading your earring and tampon signals. Add a check-in from Profile
            and today's read will shift with it.
          </p>
        )}
      </section>

    </div>
  );
}

function NarrativeBlock({
  line,
  compact,
  wrap,
}: {
  line: NarrativeLine;
  compact?: boolean;
  wrap?: boolean;
}) {
  const small = compact || wrap;
  return (
    <div className={small ? "py-3" : "py-5 [@media(max-height:780px)]:py-3.5"}>
      <p className="label-caps">{line.label}</p>
      <p
        className={
          compact
            ? "mt-1 truncate text-[13px] leading-[1.5] tracking-[-0.01em] whitespace-nowrap"
            : wrap
              ? "mt-1 text-[13px] leading-[1.5] tracking-[-0.01em]"
              : "mt-1.5 text-[16px] leading-[1.5]"
        }
      >
        {line.parts.map((part, i) => (
          <span
            key={i}
            className={
              part.accent
                ? `align-baseline font-serif leading-[1] text-accent ${small ? "text-[17px]" : "text-[22px]"}`
                : undefined
            }
          >
            {part.text}
          </span>
        ))}
      </p>
    </div>
  );

}

