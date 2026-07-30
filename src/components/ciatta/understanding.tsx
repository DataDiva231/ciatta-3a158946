/**
 * The Understanding — Ciatta's single visual identity.
 *
 * One evolving mark used everywhere (splash, onboarding, Today, Teach, Journey,
 * Quick Add). It breathes because understanding is always forming, and it
 * matures with confidence: the higher the confidence, the fuller the bloom and
 * the more present the core.
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

  // Understanding grows from a soft haze into a defined presence.
  const bloom = 0.14 + c * 0.3;
  const core = 0.26 + c * 0.5;
  const halo = 0.6 + c * 0.55;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Outer bloom — the reach of what Ciatta understands. */}
      <span
        className="animate-breathe absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--clay) ${Math.round(
            bloom * 100,
          )}%, transparent) 0%, transparent 68%)`,
          transform: `scale(${halo})`,
          filter: `blur(${Math.round(px * 0.06)}px)`,
        }}
      />
      {/* The core. */}
      <span
        className="animate-breathe relative rounded-full"
        style={{
          width: px * 0.6,
          height: px * 0.6,
          animationDelay: "-1.4s",
          background: `radial-gradient(circle at 36% 30%,
            color-mix(in oklab, var(--clay) 8%, white) 0%,
            color-mix(in oklab, var(--clay) ${Math.round(core * 100)}%, var(--surface)) 46%,
            color-mix(in oklab, var(--clay) ${Math.round((core + 0.28) * 100)}%, var(--background)) 100%)`,
          boxShadow: `0 ${px * 0.12}px ${px * 0.3}px -${px * 0.1}px color-mix(in oklab, var(--clay) ${
            Math.round(18 + c * 22)
          }%, transparent)`,
          opacity: active ? 1 : 0.94,
        }}
      />
    </span>
  );
}
