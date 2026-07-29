import { createFileRoute } from "@tanstack/react-router";

import { Sparkline } from "@/components/ciatta/sparkline";
import { phaseForDay, signals, weeklySeries } from "@/lib/ciatta-data";
import { emergingPatterns } from "@/lib/narrative";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey — Ciatta" },
      {
        name: "description",
        content:
          "Twelve weeks of sleep, recovery and cycle signals, and the patterns Ciatta has started to notice.",
      },
      { property: "og:title", content: "Journey — Ciatta" },
      {
        property: "og:description",
        content: "See how your body moves across weeks, not days.",
      },
    ],
  }),
  component: JourneyPage,
});

const phaseColor: Record<string, string> = {
  Menstrual: "var(--brick)",
  Follicular: "var(--moss)",
  Ovulatory: "var(--wheat)",
  Luteal: "var(--stone-blue)",
};

function JourneyPage() {
  const sleep = weeklySeries("sleepQuality");
  const hrv = weeklySeries("hrv");
  const rhr = weeklySeries("restingHr");

  const timeline = [...signals].slice(0, 84).reverse();

  return (
    <div className="px-6 pb-6 pt-10">
      <h1 className="font-serif text-[30px] leading-tight font-light">Your journey</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Twelve weeks of continuous signal from your earring and tampon. Ciatta reads the
        shape, not the single day.
      </p>

      <section className="mt-10">
        <p className="label-caps">Sleep quality</p>
        <p className="mt-1 text-[17px]">
          Steadiest in your follicular weeks, softest before bleeding.
        </p>
        <Sparkline values={sleep} label="Sleep quality" unit="%" />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <p className="label-caps">Heart rate variability</p>
        <p className="mt-1 text-[17px]">Your recovery capacity, week by week.</p>
        <Sparkline values={hrv} label="Heart rate variability" unit="ms" />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <p className="label-caps">Resting heart rate</p>
        <p className="mt-1 text-[17px]">Slow drift up in the second half of each cycle.</p>
        <Sparkline values={rhr} label="Resting heart rate" unit=" bpm" />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <p className="label-caps">Cycle phases</p>
        <p className="mt-1 text-[17px]">Three cycles, day by day.</p>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
          {timeline.map((day) => (
            <span
              key={day.daysAgo}
              className="h-full flex-1"
              style={{ backgroundColor: phaseColor[phaseForDay(day.cycleDay)], opacity: 0.75 }}
            />
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
          {Object.entries(phaseColor).map(([phase, color]) => (
            <li key={phase} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {phase}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <p className="label-caps">Emerging patterns</p>
        <div className="mt-5 space-y-7">
          {emergingPatterns.map((p) => (
            <article key={p.title}>
              <h2 className="font-serif text-[21px] leading-snug font-light">{p.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
