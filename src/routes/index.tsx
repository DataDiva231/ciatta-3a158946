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

      <div className="relative -mt-10 overflow-hidden [@media(max-height:780px)]:-mt-6">
        <picture>
          <source srcSet={figureWebp.url} type="image/webp" />
          <img
            src={figureAsset.url}
            alt="Ciatta's rendering of your body, lit from within"
            width={1024}
            height={1024}
            decoding="async"
            fetchPriority="high"
            className="ml-auto -mr-4 w-[78%] max-w-[360px] [@media(max-height:780px)]:w-[58%] [@media(max-height:780px)]:max-w-[260px] [@media(max-height:660px)]:w-[48%] [@media(max-height:660px)]:max-w-[210px]"
            style={{
              maskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
            }}
          />
        </picture>
      </div>

      <section className="-mt-8 px-6 pb-2 [@media(max-height:780px)]:-mt-5">
        <h1 className="font-serif text-[30px] leading-[1.15] font-light tracking-[-0.01em] [@media(max-height:780px)]:text-[26px]">
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        <div className="mt-6 divide-y divide-border border-t border-border [@media(max-height:780px)]:mt-4">
          {primaryLines.map((line) => (
            <NarrativeBlock key={line.label} line={line} />
          ))}

          <div className="py-5 [@media(max-height:780px)]:py-3.5">
            <p className="label-caps">Guidance</p>
            <p className="mt-1.5 font-serif text-[24px] leading-[1.25] font-light [@media(max-height:780px)]:text-[21px]">
              <span className="text-accent">{narrative.guidance.lead}</span>{" "}
              {narrative.guidance.rest}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {narrative.guidance.support}
            </p>
          </div>

          {restLines.map((line) => (
            <NarrativeBlock key={line.label} line={line} />
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

function NarrativeBlock({ line }: { line: NarrativeLine }) {
  return (
    <div className="py-5">
      <p className="label-caps">{line.label}</p>
      <p className="mt-1.5 text-[16px] leading-[1.5]">
        {line.parts.map((part, i) => (
          <span
            key={i}
            className={
              part.accent
                ? "align-baseline font-serif text-[22px] leading-[1] text-accent"
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

