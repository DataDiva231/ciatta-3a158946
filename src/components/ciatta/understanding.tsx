import understandingAsset from "@/assets/understanding-orb.png.asset.json";

/**
 * The Understanding — Ciatta's single brand asset.
 *
 * Treated exactly like a logo: one master image, never recreated, restyled or
 * recolored. It only breathes (2–3% over 7s) and carries a very slow shimmer in
 * its own glow, so the material, iridescence and composition stay untouched.
 */

const SIZES = { sm: 44, md: 88, lg: 140, hero: 232 } as const;

export type UnderstandingSize = keyof typeof SIZES;

type Props = {
  /** 0–100. Kept for API compatibility; the asset itself is never altered. */
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

  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: px, height: px }}
    >
      <span
        className="animate-breathe relative block"
        style={{ width: px, height: px, animationDelay: "-1.6s" }}
      >
        <img
          src={understandingAsset.url}
          alt=""
          width={1241}
          height={1241}
          loading={px > 180 ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain"
          style={{
            opacity: active ? 1 : 0.98,
            transition: "opacity 900ms ease",
          }}
        />
        {/* Very slow shimmer within the asset's own glow only. */}
        <span
          className="animate-shimmer absolute inset-0 rounded-full mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(60% 40% at 42% 28%, rgba(255,255,255,0.28) 0%, transparent 62%)",
          }}
        />
      </span>
    </span>
  );
}
