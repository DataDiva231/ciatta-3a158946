import { Link, useRouterState } from "@tanstack/react-router";

type IconProps = { active: boolean };

const stroke = (active: boolean) => (active ? "var(--clay)" : "var(--muted-foreground)");

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

function ProfileIcon({ active }: IconProps) {
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
  { to: "/", label: "Today", Icon: SunriseIcon },
  { to: "/teach", label: "Teach", Icon: TeachIcon },
  { to: "/journey", label: "Journey", Icon: JourneyIcon },
  { to: "/profile", label: "Profile", Icon: ProfileIcon },
] as const;

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/quick-add")) return null;

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-auto sticky bottom-0 z-20 px-3 pb-3 pt-2"
      style={{
        background:
          "linear-gradient(to top, var(--color-background) 55%, transparent 100%)",
      }}
    >
      <ul className="flex items-stretch justify-between rounded-full border border-border bg-surface/90 px-2 py-2 backdrop-blur">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 rounded-full py-1 text-[11px] text-muted-foreground transition-colors"
              activeProps={{ className: "text-accent" }}
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span className={isActive ? "text-accent" : undefined}>{label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
