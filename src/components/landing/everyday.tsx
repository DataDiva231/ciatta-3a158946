import cycleAsset from "@/assets/ciatta-card-cycle.png.asset.json";
import flowAsset from "@/assets/ciatta-card-flow.png.asset.json";
import recoveryAsset from "@/assets/ciatta-card-recovery.png.asset.json";
import sleepAsset from "@/assets/ciatta-card-sleep.png.asset.json";
import { Reveal } from "./atoms";

/** One intelligence, shown as four everyday moments — never as features. */

const CARDS = [
  {
    label: "Recovery",
    image: recoveryAsset.url,
    alt: "A woman resting with her head tilted back in soft daylight",
    headline: "Your body has been asking for a slower day.",
    insight: "Your heart rate settled later than usual for three nights.",
  },
  {
    label: "Sleep",
    image: sleepAsset.url,
    alt: "A woman asleep, her face half in shadow",
    headline: "You sleep better on the days you move early.",
    insight: "Two weeks of evenings told me the same thing.",
  },
  {
    label: "Cycle",
    image: cycleAsset.url,
    alt: "A woman standing in warm window light",
    headline: "Something is shifting a few days earlier this month.",
    insight: "Your temperature rose sooner than it usually does.",
  },
  {
    label: "Flow",
    image: flowAsset.url,
    alt: "A woman with her hand resting against her collarbone",
    headline: "Your afternoons have felt heavier than your mornings.",
    insight: "Your recovery dips after long, still stretches of the day.",
  },
] as const;

export function Everyday() {
  return (
    <section className="px-6 pt-28 pb-8 sm:px-10 sm:pt-40">
      <Reveal className="mx-auto max-w-6xl">
        <h2 className="font-serif text-ink max-w-[22ch] text-[34px] leading-[1.08] sm:text-[46px]">
          One intelligence. Every part of you.
        </h2>
        <p className="text-ink-soft mt-6 max-w-[46ch] text-[14.5px] leading-[1.8]">
          Not four apps. Not four scores. One understanding of you, showing up wherever it
          matters.
        </p>
      </Reveal>

      <ul className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, index) => (
          <Reveal as="li" key={card.label} delay={index * 90}>
            <figure className="border-hairline relative h-[420px] overflow-hidden rounded-[24px] border sm:h-[480px]">
              <img
                src={card.image}
                alt={card.alt}
                className="absolute inset-0 h-full w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-3/5"
                style={{
                  background:
                    "linear-gradient(to top, rgba(24,22,20,0.82) 0%, rgba(24,22,20,0.5) 42%, rgba(24,22,20,0) 100%)",
                }}
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[10px] font-medium tracking-[0.3em] text-[rgba(255,252,250,0.72)] uppercase">
                  {card.label}
                </p>
                <p className="font-serif mt-4 text-[24px] leading-[1.18] text-[rgb(255,252,250)]">
                  {card.headline}
                </p>
                <p className="mt-4 text-[12.5px] leading-[1.6] text-[rgba(255,252,250,0.7)]">
                  {card.insight}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
