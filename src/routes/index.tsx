import { createFileRoute } from "@tanstack/react-router";

import figure from "@/assets/ciatta-figure.jpg";
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
        content: "Ciatta reads your sleep, recovery and cycle signals and tells you what your body is asking for today.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { latest } = useCheckIns();
  const narrative = buildNarrative(latest);

  return (
    <div className="flex min-h-full flex-col">
      <header className="px-6 pt-8">
        <button
          type="button"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
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
        <p className="mt-4 text-[15px] font-medium text-accent">Good morning, Jenny</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatLongDate(today.date)}</p>
      </header>

      <div className="relative -mt-10">

        <img
          src={figure}
          alt="Ciatta's rendering of your body, lit from within"
          width={1024}
          height={1024}
          className="mx-auto w-full max-w-[380px]"
          style={{
            maskImage:
              "radial-gradient(58% 52% at 50% 44%, black 35%, transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(58% 52% at 50% 44%, black 35%, transparent 82%)",
          }}
        />
      </div>

      <section className="mt-auto px-6 pb-2">
        <h1 className="font-serif text-[32px] leading-[1.15] font-light tracking-[-0.01em]">
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        <div className="mt-6 space-y-4">
          {narrative.lines.map((line) => (
            <div key={line.label} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <p className="label-caps">{line.label}</p>
              <p className="mt-1.5 text-[16px] leading-snug">
                {line.parts.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.accent ? "font-serif text-[22px] leading-none text-accent" : undefined
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="font-serif text-[24px] leading-tight font-light">
            <span className="text-accent">{narrative.guidance.lead}</span>{" "}
            {narrative.guidance.rest}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {narrative.guidance.support}
          </p>
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
