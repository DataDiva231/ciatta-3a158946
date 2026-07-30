import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Shared chrome for every Profile child screen: back affordance + title. */
export function Screen({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="pb-10">
      <header className="px-6 pt-8">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="-ml-1 flex items-center gap-1 rounded-full py-1 pr-3 pl-1 text-[15px] text-accent transition-colors hover:bg-secondary active:bg-secondary"
          >
            <span aria-hidden="true" className="text-[18px] leading-none">
              {"\u2039"}
            </span>
            Profile
          </button>
          {action}
        </div>
        <h1 className="mt-5 font-serif text-[28px] leading-tight font-light tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </header>
      <div className="mt-7 px-6">{children}</div>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-surface">
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-[15px]">{label}</span>
        {detail && (
          <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
          checked ? "border-accent bg-accent" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-background transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-border text-muted-foreground hover:border-fog"
      }`}
    >
      {label}
    </button>
  );
}
