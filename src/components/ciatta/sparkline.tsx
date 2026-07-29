type Props = {
  values: number[];
  /** true = higher is better (accent up), affects nothing but reading order */
  label: string;
  unit?: string;
};

export function Sparkline({ values, label, unit }: Props) {
  const width = 320;
  const height = 68;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 10) - 5;
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[68px] w-full"
        role="img"
        aria-label={`${label} over the last 12 weeks`}
        preserveAspectRatio="none"
      >
        <path d={area} fill="color-mix(in oklab, var(--clay) 10%, transparent)" />
        <path
          d={line}
          fill="none"
          stroke="var(--clay)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last[0]} cy={last[1]} r="3" fill="var(--clay)" />
      </svg>
      <figcaption className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>12 weeks ago</span>
        <span>
          Now · {values[values.length - 1]}
          {unit ?? ""}
        </span>
      </figcaption>
    </figure>
  );
}
