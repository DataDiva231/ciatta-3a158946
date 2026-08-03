/**
 * The Understanding — Ciatta's brand mark.
 *
 * Oura has the ring. Lumia has the ear. Ciatta has the body: a minimal,
 * monochrome outlined profile that anchors every insight. It is never filled
 * with colour and never recolored — coral stays an accent used elsewhere.
 * It only breathes (2–3% over 7s).
 */

const SIZES = { sm: 44, md: 88, lg: 140, hero: 232 } as const;

export type UnderstandingSize = keyof typeof SIZES;

type Props = {
  /** 0–100. Kept for API compatibility; the mark itself is never altered. */
  confidence?: number;
  size?: UnderstandingSize | number;
  /** Extra emphasis while Ciatta is actively taking something in. */
  active?: boolean;
  className?: string;
};

export function Understanding({
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
        className="animate-breathe relative grid place-items-center"
        style={{ width: px, height: px, animationDelay: "-1.6s" }}
      >
        <BodyMark
          size={px}
          style={{
            opacity: active ? 1 : 0.92,
            transition: "opacity 900ms ease",
          }}
        />
      </span>
    </span>
  );
}

/** The raw outlined body mark. Monochrome, inherits currentColor. */
export function BodyMark({
  size = 88,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const stroke = Math.max(2, size * 0.062);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={`text-foreground ${className}`}
      style={style}
    >
      <circle cx="50" cy="27" r={22 - stroke / 2} stroke="currentColor" strokeWidth={stroke} />
      <path
        d={`M ${8 + stroke / 2} ${92 - stroke / 2} a ${42 - stroke / 2} ${34 - stroke / 2} 0 0 1 ${84 - stroke} 0 Z`}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </svg>
  );
}
