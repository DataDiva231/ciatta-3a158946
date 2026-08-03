import understandingAsset from "@/assets/understanding-orb.png.asset.json";

/**
 * The Today card, exactly as it appears in the product: an editorial page,
 * not a dashboard. Used as the hero's resolution and again inside the
 * intelligence section.
 */
export function TodayCard({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <article
      className={`rounded-[28px] border border-hairline bg-page text-center ${
        compact ? "px-7 py-9 sm:px-9 sm:py-11" : "px-7 py-11 sm:px-14 sm:py-14"
      } ${className}`}
    >
      <p className="text-[10px] font-medium tracking-[0.32em] text-clay uppercase">Today</p>

      <p
        className={`font-serif text-ink mt-7 ${compact ? "text-[26px] sm:text-[30px]" : "text-[30px] sm:text-[38px]"} leading-[1.1]`}
      >
        Good morning
      </p>
      <p className="text-ink-faint mt-2 text-[12px] tracking-[0.02em]">{today}</p>

      <img
        src={understandingAsset.url}
        alt=""
        aria-hidden="true"
        className={`animate-breathe mx-auto object-contain ${compact ? "mt-8 h-24 w-24" : "mt-10 h-32 w-32 sm:h-40 sm:w-40"}`}
        loading="lazy"
        decoding="async"
      />

      <h3
        className={`font-serif text-ink mx-auto mt-9 max-w-[17ch] ${
          compact ? "text-[24px] sm:text-[28px]" : "text-[28px] sm:text-[36px]"
        } leading-[1.16]`}
      >
        Your body has been asking for a little more{" "}
        <span className="text-clay">recovery</span>.
      </h3>

      <p className="text-ink-soft mx-auto mt-6 max-w-[36ch] text-[13.5px] leading-[1.75]">
        Your heart rate has been settling a little slower each night, and your temperature has
        stayed slightly higher than usual.
      </p>

      <div className="bg-hairline mx-auto mt-8 h-px w-14" />

      <p className="text-ink-soft mx-auto mt-8 max-w-[34ch] text-[13.5px] leading-[1.75]">
        A slower day today may help you feel better tomorrow.
      </p>
    </article>
  );
}
