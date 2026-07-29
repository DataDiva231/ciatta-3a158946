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
    <div className="aura pb-4">
      <header className="px-6 pt-10">
        <p className="text-[15px] font-medium text-accent">Good morning, Jenny</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatLongDate(today.date)}</p>
      </header>

      <div className="relative -mt-6">
        <img
          src={figure}
          alt="Ciatta's rendering of your body, lit from within"
          width={1024}
          height={1024}
          className="mx-auto w-full max-w-[380px] mix-blend-multiply"
          style={{
            maskImage:
              "radial-gradient(75% 70% at 50% 45%, black 55%, transparent 92%)",
            WebkitMaskImage:
              "radial-gradient(75% 70% at 50% 45%, black 55%, transparent 92%)",
          }}
        />
      </div>

      <section className="px-6">
        <h1 className="font-serif text-[34px] leading-[1.15] font-light tracking-[-0.01em]">
          {narrative.headline.map((part, i) => (
            <span key={i} className={part.accent ? "text-accent" : undefined}>
              {part.text}
            </span>
          ))}
        </h1>

        <div className="mt-9 space-y-6">
          {narrative.lines.map((line) => (
            <div key={line.label} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
              <p className="label-caps">{line.label}</p>
              <p className="mt-2 text-[17px] leading-snug">
                {line.parts.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.accent ? "font-serif text-[19px] text-accent" : undefined
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-9 border-t border-border pt-7">
          <p className="font-serif text-[26px] leading-tight font-light">
            <span className="text-accent">{narrative.guidance.lead}</span>{" "}
            {narrative.guidance.rest}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {narrative.guidance.support}
          </p>
        </div>

        {!latest && (
          <p className="mt-8 rounded-2xl bg-secondary px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            Ciatta is reading your earring and tampon signals. Add a check-in from Profile
            and today's read will shift with it.
          </p>
        )}
      </section>
    </div>
  );
}
