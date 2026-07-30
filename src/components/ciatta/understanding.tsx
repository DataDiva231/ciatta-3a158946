import orb from "@/assets/understanding-orb.png";

/**
 * The Understanding — Ciatta's single visual identity.
 *
 * One symmetrical, iridescent pearl used everywhere (splash, onboarding, Today,
 * Teach, Journey, Quick Add). It breathes because understanding is always
 * forming, and it matures with confidence: the higher the confidence, the
 * fuller the bloom, the richer the material, the more present the core.
 */

const SIZES = { sm: 44, md: 88, lg: 140, hero: 232 } as const;

export type UnderstandingSize = keyof typeof SIZES;

type Props = {
  /** 0–100. Drives bloom, saturation and inner presence. */
  confidence?: number;
  size?: UnderstandingSize | number;
  /** Extra emphasis while Ciatta is actively taking something in. */
  active?: boolean;
  className?: string;
};

export function Understanding({
  confidence = 55,
  size = "md",
  active = false,
  className = "",
}: Props) {
  const px = typeof size === "number" ? size : SIZES[size];
  const c = Math.max(0, Math.min(100, confidence)) / 100;

  // Understanding emerges from a soft haze into a defined, luminous presence.
  const presence = 0.72 + c * 0.28;
  const saturation = 0.78 + c * 0.32;
  const bloom = 0.1 + c * 0.16;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Volumetric bloom — the reach of what Ciatta understands. */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 54%, color-mix(in oklab, var(--clay) ${Math.round(
            bloom * 100,
          )}%, transparent) 0%, transparent 70%)`,
          transform: "scale(1.22)",
          filter: `blur(${Math.max(6, Math.round(px * 0.07))}px)`,
        }}
      />

      {/* The pearl itself. */}
      <span
        className="animate-breathe relative block"
        style={{ width: px, height: px, animationDelay: "-1.6s" }}
      >
        <img
          src={orb}
          alt=""
          width={1024}
          height={1024}
          loading={px > 180 ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain"
          style={{
            opacity: active ? Math.min(1, presence + 0.08) : presence,
            filter: `saturate(${saturation}) contrast(1.02)`,
            transition: "opacity 900ms ease, filter 900ms ease",
          }}
        />
        {/* Faint internal shimmer — light moving through nacre. */}
        <span
          className="animate-shimmer absolute inset-0 rounded-full mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(65% 45% at 38% 26%, rgba(255,255,255,0.55) 0%, transparent 60%)",
            opacity: 0.5 + c * 0.3,
          }}
        />
      </span>
    </span>
  );
}
