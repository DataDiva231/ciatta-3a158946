export type OrbTone = "clay" | "moss" | "stone-blue" | "wheat" | "iris";

const TONE: Record<OrbTone, string> = {
  clay: "var(--clay)",
  moss: "var(--moss)",
  "stone-blue": "var(--stone-blue)",
  wheat: "var(--wheat)",
  iris: "oklch(0.66 0.13 300)",
};

type Props = {
  tone?: OrbTone;
  /** px diameter */
  size?: number;
};

/**
 * The only decorative accent Journey allows: a small glowing sphere that
 * carries the tone of a discovery. No icons, no charts.
 */
export function DiscoveryOrb({ tone = "clay", size = 64 }: Props) {
  const color = TONE[tone];
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ width: size, height: size * 1.18 }}
    >
      <span
        className="absolute inset-x-0 top-0 rounded-full"
        style={{
          height: size,
          background: `radial-gradient(circle at 32% 28%, color-mix(in oklab, ${color} 12%, white) 0%, ${color} 52%, color-mix(in oklab, ${color} 68%, black) 100%)`,
          boxShadow: `0 ${size * 0.18}px ${size * 0.34}px -${size * 0.14}px color-mix(in oklab, ${color} 45%, transparent)`,
        }}
      />
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[100%]"
        style={{
          width: size * 0.76,
          height: size * 0.14,
          background: `radial-gradient(ellipse at center, color-mix(in oklab, ${color} 34%, transparent) 0%, transparent 72%)`,
        }}
      />
    </span>
  );
}
