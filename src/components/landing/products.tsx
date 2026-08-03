import arcAsset from "@/assets/ciatta-arc.png.asset.json";
import webbeeAsset from "@/assets/ciatta-webbee.png.asset.json";
import { Reveal } from "./atoms";

/** Two objects, one system. Product as material, never as spec sheet. */
export function Products() {
  return (
    <section className="px-6 pt-32 pb-8 sm:px-10 sm:pt-44">
      <Reveal className="mx-auto max-w-6xl">
        <h2 className="font-serif text-ink text-[34px] leading-[1.06] sm:text-[46px]">
          Together.
        </h2>
        <p className="text-ink-soft mt-6 max-w-[44ch] text-[14.5px] leading-[1.8]">
          Two objects. One continuous understanding of you — inside and out.
        </p>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-6xl gap-8 lg:grid-cols-2">
        <Reveal>
          <figure className="border-hairline overflow-hidden rounded-[26px] border bg-page">
            <div className="flex h-[340px] items-center justify-center p-10 sm:h-[420px]">
              <img
                src={webbeeAsset.url}
                alt="The Ciatta Webbee, a small soft internal sensor"
                className="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption className="border-hairline border-t px-8 py-8">
              <p className="text-[10px] font-medium tracking-[0.3em] text-clay uppercase">
                Webbee
              </p>
              <p className="font-serif text-ink mt-5 max-w-[24ch] text-[24px] leading-[1.2]">
                Understanding from the inside.
              </p>
              <p className="text-ink-soft mt-4 max-w-[40ch] text-[13.5px] leading-[1.75]">
                Worn only when you choose to, it reads the signals nothing on your wrist can
                reach.
              </p>
            </figcaption>
          </figure>
        </Reveal>

        <Reveal delay={120}>
          <figure className="border-hairline overflow-hidden rounded-[26px] border bg-page">
            <div className="flex h-[340px] items-center justify-center p-10 sm:h-[420px]">
              <img
                src={arcAsset.url}
                alt="The Ciatta Arc, a polished metal wearable"
                className="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption className="border-hairline border-t px-8 py-8">
              <p className="text-[10px] font-medium tracking-[0.3em] text-clay uppercase">Arc</p>
              <p className="font-serif text-ink mt-5 max-w-[24ch] text-[24px] leading-[1.2]">
                Always with you, never in the way.
              </p>
              <p className="text-ink-soft mt-4 max-w-[40ch] text-[13.5px] leading-[1.75]">
                Continuous, quiet listening — so the picture never has to start over.
              </p>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
