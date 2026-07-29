import { createFileRoute, Link } from "@tanstack/react-router";

import orb from "@/assets/ciatta-orb.png";

export const Route = createFileRoute("/teach")({
  head: () => ({
    meta: [
      { title: "Teach Ciatta — Ciatta" },
      {
        name: "description",
        content:
          "Tell Ciatta what changed since it last checked in. Every update makes tomorrow's understanding more personal.",
      },
      { property: "og:title", content: "Teach Ciatta — Ciatta" },
      {
        property: "og:description",
        content: "Teach Ciatta about your body in your own words.",
      },
    ],
  }),
  component: TeachPage,
});

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 6.5 9.7 4.4h4.6L15.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.5 11.5 12 18a4 4 0 0 1-5.7-5.7l7-7a2.8 2.8 0 0 1 4 4l-7 7a1.6 1.6 0 0 1-2.3-2.3l6.4-6.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OTHER_WAYS = [
  { to: "/talk", label: "Talk", Icon: MicIcon },
  { to: "/talk", label: "Capture", Icon: CameraIcon },
  { to: "/talk", label: "Attach", Icon: ClipIcon },
] as const;

function TeachPage() {
  return (
    <div className="flex min-h-full flex-col px-6 pb-2 pt-6">
      <div className="flex flex-1 items-center justify-center py-4">
        <img
          src={orb}
          alt="Ciatta's iridescent understanding of you"
          width={1024}
          height={1024}
          className="w-[70%] max-w-[280px] drop-shadow-[0_30px_60px_rgba(217,106,88,0.18)]"
        />
      </div>

      <h1 className="text-center font-serif text-[30px] leading-tight font-normal tracking-[-0.01em]">
        What's changed since we last checked in?
      </h1>
      <p className="mt-3 text-center text-[14px] leading-relaxed text-muted-foreground">
        Every update makes tomorrow's understanding more personal.
      </p>

      <Link
        to="/quick-add"
        className="mt-7 flex items-center gap-4 rounded-[26px] px-4 py-4 text-left shadow-[0_16px_30px_-18px_rgba(217,106,88,0.9)]"
        style={{
          background: "linear-gradient(100deg, var(--clay), oklch(0.72 0.17 45))",
        }}
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-[26px] leading-none text-accent">
          +
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-[24px] leading-none text-primary-foreground">
            Quick Add
          </span>
          <span className="mt-1.5 block text-[13px] leading-snug text-primary-foreground/90">
            The fastest way to update your health understanding.
          </span>
        </span>
      </Link>

      <div className="mt-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[13px] text-muted-foreground">Or teach another way</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-3xl border border-border bg-surface py-5">
        {OTHER_WAYS.map(({ to, label, Icon }) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Icon />
            </span>
            <span className="text-[14px] text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
