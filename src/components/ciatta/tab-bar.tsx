import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

type IconProps = { active: boolean };

const stroke = (active: boolean) => (active ? "var(--foreground)" : "var(--muted-foreground)");

function SunriseIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="13" r="4" stroke={stroke(active)} strokeWidth="1.4" />
      <path
        d="M12 4v2M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4M2 18h20M6 21h12"
        stroke={stroke(active)}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeachIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke={stroke(active)}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JourneyIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 16.5 8.5 11l3.5 3.5L20 6.5"
        stroke={stroke(active)}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.5 6.5H20V11" stroke={stroke(active)} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke={stroke(active)} strokeWidth="1.4" />
      <path
        d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"
        stroke={stroke(active)}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tabs = [
  { to: "/today", label: "Today", Icon: SunriseIcon, tour: "today" },
  { to: "/teach", label: "Teach", Icon: TeachIcon, tour: "teach" },
  { to: "/journey", label: "Journey", Icon: JourneyIcon, tour: "journey" },
] as const;


export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Which screen we're on is only certain in the browser: rendering the bar
  // during SSR and then hiding it on hydration mismatches the markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (
    !mounted ||
    pathname.startsWith("/quick-add") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/first-observation") ||
    pathname.startsWith("/auth")
  )
    return null;

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-auto sticky bottom-0 z-20 px-3 pt-2 pb-3"
    >
      <ul className="flex items-stretch justify-between rounded-full border border-background/25 bg-background/80 px-2 py-2 shadow-[0_1px_18px_-12px_color-mix(in_oklab,var(--foreground)_22%,transparent)] backdrop-blur-[18px] backdrop-saturate-[1.4]">
        {tabs.map(({ to, label, Icon, tour }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              data-tour={tour}
              activeOptions={{ exact: to === "/today" }}
              className="relative flex flex-col items-center gap-1 rounded-full py-1 text-[11px] text-muted-foreground transition-colors duration-300"
              activeProps={{ className: "text-foreground" }}
            >

              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span className={isActive ? "text-foreground" : undefined}>{label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 h-[3px] w-[3px] rounded-full bg-accent transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
