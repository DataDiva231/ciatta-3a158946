import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  CONDITION_OPTIONS,
  GOAL_OPTIONS,
  LIFE_STAGE_OPTIONS,
  MEDICATION_OPTIONS,
  MONTHS,
  PRIORITY_OPTIONS,
  SUPPLEMENT_OPTIONS,
  useOnboarding,
  type Onboarding,
} from "@/lib/onboarding-store";
import { useIdentity } from "@/lib/profile-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Your first Teach Session — Ciatta" },
      {
        name: "description",
        content:
          "A calm, guided first Teach Session where you teach Ciatta enough to begin understanding your body.",
      },
      { property: "og:title", content: "Your first Teach Session — Ciatta" },
      {
        property: "og:description",
        content:
          "A calm, guided first Teach Session where you teach Ciatta enough to begin understanding your body.",
      },
    ],
  }),
  component: OnboardingPage,
});

/* ---------------------------------------------------------------- primitives */

function Screen({
  children,
  dir,
  stepKey,
}: {
  children: React.ReactNode;
  dir: 1 | -1;
  stepKey: string;
}) {
  return (
    <div
      key={stepKey}
      className={`flex h-[100svh] flex-col ${
        dir === 1 ? "animate-in slide-in-from-right-8" : "animate-in slide-in-from-left-8"
      } fade-in duration-300 ease-out`}
    >
      {children}
    </div>
  );
}

function TopBar({
  onBack,
  title,
  dots,
  index,
}: {
  onBack?: () => void;
  title?: string;
  dots?: number;
  index?: number;
}) {
  return (
    <div className="relative flex h-12 shrink-0 items-center px-4 pt-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[20px] leading-none text-muted-foreground transition-colors active:bg-secondary"
        >
          {"\u2039"}
        </button>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2">
        {title && (
          <span className="text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
            {title}
          </span>
        )}
        {dots ? (
          <span className="flex gap-1.5">
            {Array.from({ length: dots }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i <= (index ?? 0) ? "bg-clay" : "bg-border"
                }`}
              />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-7 pt-6 pb-4">{children}</div>;
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-serif text-[30px] leading-[1.18] font-light tracking-[-0.015em] text-foreground">
      {children}
    </h1>
  );
}

function Why({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-2xl bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(60,45,35,0.05)]">
      <p className="text-[13px] font-medium text-foreground">Why I'm asking</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Footer({
  label = "Continue",
  onNext,
  disabled,
  onSkip,
  variant = "outline",
}: {
  label?: string;
  onNext: () => void;
  disabled?: boolean;
  onSkip?: () => void;
  variant?: "outline" | "solid" | "clay";
}) {
  const base =
    "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[15px] transition-all active:scale-[0.99] disabled:opacity-40";
  const styles =
    variant === "solid"
      ? "bg-foreground text-background"
      : variant === "clay"
        ? "bg-wheat text-foreground"
        : "border border-border bg-surface text-foreground shadow-[0_1px_2px_rgba(60,45,35,0.05)]";
  return (
    <div className="shrink-0 px-7 pt-2 pb-9">
      <div className="flex items-center gap-4">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 px-1 py-3 text-[14px] text-muted-foreground"
          >
            Skip
          </button>
        )}
        <button type="button" onClick={onNext} disabled={disabled} className={`${base} ${styles}`}>
          {label}
          {label === "Continue" && <span aria-hidden="true">{"\u2192"}</span>}
        </button>
      </div>
    </div>
  );
}

function Orb({ size = 176 }: { size?: number }) {
  return (
    <div
      className="animate-breathe rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 34% 30%, #ffffff 0%, #f7efe6 42%, #ecdfd2 72%, #e2d2c3 100%)",
        boxShadow: "0 24px 60px -24px rgba(120,95,75,0.35)",
      }}
    />
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
  shape = "box",
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  shape?: "box" | "radio";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="flex w-full items-center gap-3 py-3 text-left transition-colors active:opacity-70"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
          shape === "radio" ? "rounded-full" : "rounded-[6px]"
        } ${checked ? "border-foreground bg-foreground" : "border-fog bg-surface"}`}
      >
        {checked &&
          (shape === "radio" ? (
            <span className="h-2 w-2 rounded-full bg-background" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 6.3 4.8 8.6 9.5 3.9"
                stroke="var(--background)"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ))}
      </span>
      <span className="text-[15px] text-foreground">{label}</span>
    </button>
  );
}

function SearchList({
  placeholder,
  options,
  selected,
  onToggle,
}: {
  placeholder: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const custom = q.trim();
  const filtered = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(60,45,35,0.05)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="var(--muted-foreground)" strokeWidth="1.5" />
          <path
            d="m16 16 4 4"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-[46vh] divide-y divide-border overflow-y-auto">
        {filtered.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] transition-colors active:bg-secondary"
          >
            {o}
            {selected.includes(o) && <span className="text-[13px] text-clay">Added</span>}
          </button>
        ))}
        {custom && !filtered.some((f) => f.toLowerCase() === custom.toLowerCase()) && (
          <button
            type="button"
            onClick={() => {
              onToggle(custom);
              setQ("");
            }}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-[15px] text-muted-foreground"
          >
            + Add “{custom}”
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- screens */

const STEPS = [
  "welcome",
  "understanding",
  "privacy",
  "session",
  "name",
  "birth",
  "height",
  "weight",
  "lifestage",
  "conditions",
  "medications",
  "supplements",
  "health-saved",
  "priorities",
  "goal",
  "goal-saved",
  "apple-health",
  "notifications",
  "future",
  "building",
  "understanding-ready",
] as const;

type StepId = (typeof STEPS)[number];

const ABOUT_STEPS: StepId[] = ["name", "birth", "height", "weight", "lifestage"];
const HEALTH_STEPS: StepId[] = ["conditions", "medications", "supplements"];
const GOAL_STEPS: StepId[] = ["priorities", "goal"];
const CONNECT_STEPS: StepId[] = ["apple-health", "notifications", "future"];

function OnboardingPage() {
  const navigate = useNavigate();
  const { data, save, hydrated } = useOnboarding();
  const { save: saveIdentity } = useIdentity();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const resumed = useRef(false);

  useEffect(() => {
    if (!hydrated || resumed.current) return;
    resumed.current = true;
    if (data.step > 0 && data.step < STEPS.length) setIndex(data.step);
  }, [hydrated, data.step]);

  const step = STEPS[index];

  const go = (delta: 1 | -1) => {
    setDir(delta);
    setIndex((i) => {
      const next = Math.min(STEPS.length - 1, Math.max(0, i + delta));
      save({ step: next });
      return next;
    });
  };
  const next = () => go(1);
  const back = () => go(-1);

  const patch = (p: Partial<Onboarding>) => save(p);
  const toggle = (key: "conditions" | "medications" | "supplements" | "priorities", v: string) =>
    patch({
      [key]: data[key].includes(v) ? data[key].filter((x) => x !== v) : [...data[key], v],
    } as Partial<Onboarding>);

  const finish = () => {
    save({ completed: true, step: STEPS.length - 1 });
    if (data.name.trim()) saveIdentity({ name: data.name.trim() });
    if (data.lifeStage && data.lifeStage !== "Prefer not to say")
      saveIdentity({ lifeStage: data.lifeStage });
    navigate({ to: "/" });
  };

  const sectionDots = (list: StepId[]) => ({
    dots: list.length,
    index: list.indexOf(step),
  });

  const firstName = data.name.trim().split(" ")[0] || "there";

  const content = () => {
    switch (step) {
      case "welcome":
        return (
          <>
            <TopBar />
            <Body>
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[12px] tracking-[0.34em] text-muted-foreground">CIATTA</p>
                <h1 className="mt-10 font-serif text-[38px] leading-[1.15] font-light tracking-[-0.02em]">
                  Every body
                  <br />
                  has a story.
                </h1>
                <p className="mt-8 text-[15px] leading-relaxed text-muted-foreground">
                  Let&apos;s begin
                  <br />
                  understanding yours.
                </p>
              </div>
            </Body>
            <Footer label="Begin" onNext={next} variant="clay" />
          </>
        );

      case "understanding":
        return (
          <>
            <TopBar onBack={back} />
            <Body>
              <h1 className="text-center font-serif text-[30px] leading-[1.2] font-light tracking-[-0.015em]">
                Understanding
                <br />
                takes time.
              </h1>
              <p className="mt-8 text-[14px] text-muted-foreground">
                Your health changes every day.
              </p>
              <div className="mt-7 space-y-3 text-[15px]">
                {["Sleep.", "Recovery.", "Hormones.", "Lifestyle."].map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
              <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
                Ciatta learns how these signals come together to understand you.
              </p>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "privacy":
        return (
          <>
            <TopBar onBack={back} />
            <Body>
              <h1 className="text-center font-serif text-[30px] leading-[1.2] font-light tracking-[-0.015em]">
                Your privacy
                <br />
                comes first.
              </h1>
              <div className="mt-9 space-y-4 text-[14px] leading-relaxed">
                {[
                  "Your health data belongs to you.",
                  "Encrypted.",
                  "Private.",
                  "Never sold.",
                ].map((line) => (
                  <p key={line} className="text-foreground">
                    {line}
                  </p>
                ))}
              </div>
              <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
                You decide what Ciatta learns, and what you choose to share.
              </p>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "session":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" />
            <Body>
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[13px] text-muted-foreground">Building your health profile</p>
                <div className="mt-8 flex justify-center">
                  <Orb />
                </div>
                <p className="mt-10 max-w-[19rem] text-[15px] leading-relaxed">
                  I&apos;ll ask a few questions so I can begin understanding your health.
                </p>
                <p className="mt-6 text-[13px] text-muted-foreground">
                  This takes about 3 minutes.
                </p>
              </div>
            </Body>
            <Footer label="Let's Begin" onNext={next} variant="clay" />
          </>
        );

      case "name":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(ABOUT_STEPS)} />
            <Body>
              <Question>
                What should I<br />
                call you?
              </Question>
              <input
                autoFocus
                value={data.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Your name"
                className="mt-8 w-full rounded-2xl border border-border bg-surface px-4 py-4 text-[16px] outline-none focus:border-clay"
              />
              <Why>I&apos;ll use your name throughout your health experience.</Why>
            </Body>
            <Footer onNext={next} disabled={!data.name.trim()} />
          </>
        );

      case "birth":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(ABOUT_STEPS)} />
            <Body>
              <Question>
                When were you
                <br />
                born?
              </Question>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <label className="rounded-2xl border border-border bg-surface px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Month</span>
                  <select
                    value={data.birthMonth}
                    onChange={(e) => patch({ birthMonth: e.target.value })}
                    className="w-full bg-transparent text-[15px] outline-none"
                  >
                    {MONTHS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl border border-border bg-surface px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Day</span>
                  <select
                    value={data.birthDay}
                    onChange={(e) => patch({ birthDay: e.target.value })}
                    className="w-full bg-transparent text-[15px] outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl border border-border bg-surface px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Year</span>
                  <select
                    value={data.birthYear}
                    onChange={(e) => patch({ birthYear: e.target.value })}
                    className="w-full bg-transparent text-[15px] outline-none"
                  >
                    {Array.from({ length: 60 }, (_, i) => String(2010 - i)).map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </label>
              </div>
              <Why>Your age helps personalize your health understanding.</Why>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "height":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(ABOUT_STEPS)} />
            <Body>
              <Question>
                How tall are
                <br />
                you?
              </Question>
              <div className="mt-8 flex gap-3">
                {(
                  [
                    ["heightFt", "ft", 8],
                    ["heightIn", "in", 12],
                  ] as const
                ).map(([key, unit, max]) => (
                  <label
                    key={key}
                    className="flex flex-1 items-baseline gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5"
                  >
                    <select
                      value={data[key]}
                      onChange={(e) => patch({ [key]: e.target.value } as Partial<Onboarding>)}
                      className="flex-1 bg-transparent text-[17px] outline-none"
                    >
                      {Array.from({ length: max }, (_, i) => String(unit === "ft" ? i + 1 : i)).map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                    <span className="text-[13px] text-muted-foreground">{unit}</span>
                  </label>
                ))}
              </div>
              <Why>Height helps establish your personal health profile.</Why>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "weight":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(ABOUT_STEPS)} />
            <Body>
              <Question>
                What&apos;s your
                <br />
                current weight?
              </Question>
              <label className="mt-8 flex items-baseline gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <input
                  inputMode="numeric"
                  value={data.weight}
                  onChange={(e) => patch({ weight: e.target.value.replace(/\D/g, "") })}
                  placeholder="145"
                  className="w-full bg-transparent text-[17px] outline-none placeholder:text-fog"
                />
                <span className="text-[13px] text-muted-foreground">lb</span>
              </label>
              <p className="mt-3 text-center text-[13px] text-muted-foreground">Optional</p>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "lifestage":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(ABOUT_STEPS)} />
            <Body>
              <Question>
                Which best describes your current life stage?
              </Question>
              <div className="mt-6 divide-y divide-border">
                {LIFE_STAGE_OPTIONS.map((o) => (
                  <CheckRow
                    key={o}
                    label={o}
                    shape="radio"
                    checked={data.lifeStage === o}
                    onToggle={() => patch({ lifeStage: o })}
                  />
                ))}
              </div>
              <Why>Your life stage shapes which patterns matter most right now.</Why>
            </Body>
            <Footer onNext={next} disabled={!data.lifeStage} />
          </>
        );

      case "conditions":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(HEALTH_STEPS)} />
            <Body>
              <Question>Do any of these apply to you?</Question>
              <div className="mt-5 divide-y divide-border">
                {CONDITION_OPTIONS.map((o) => (
                  <CheckRow
                    key={o}
                    label={o}
                    checked={data.conditions.includes(o)}
                    onToggle={() => toggle("conditions", o)}
                  />
                ))}
              </div>
            </Body>
            <Footer onNext={next} onSkip={next} />
          </>
        );

      case "medications":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(HEALTH_STEPS)} />
            <Body>
              <Question>Are you taking any medications?</Question>
              <SearchList
                placeholder="Search medications"
                options={MEDICATION_OPTIONS}
                selected={data.medications}
                onToggle={(v) => toggle("medications", v)}
              />
              {data.medications.length > 0 && (
                <p className="mt-4 text-[13px] text-muted-foreground">
                  {data.medications.join(", ")}
                </p>
              )}
            </Body>
            <Footer onNext={next} onSkip={next} />
          </>
        );

      case "supplements":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(HEALTH_STEPS)} />
            <Body>
              <Question>Do you take any supplements?</Question>
              <SearchList
                placeholder="Search supplements"
                options={SUPPLEMENT_OPTIONS}
                selected={data.supplements}
                onToggle={(v) => toggle("supplements", v)}
              />
              {data.supplements.length > 0 && (
                <p className="mt-4 text-[13px] text-muted-foreground">
                  {data.supplements.join(", ")}
                </p>
              )}
            </Body>
            <Footer onNext={next} onSkip={next} />
          </>
        );

      case "health-saved":
        return (
          <>
            <TopBar />
            <Body>
              <div className="flex h-full flex-col items-center justify-center text-center">
                <h1 className="font-serif text-[30px] font-light tracking-[-0.015em] text-clay">
                  Thank you.
                </h1>
                <p className="mt-6 max-w-[18rem] text-[15px] leading-relaxed text-muted-foreground">
                  Understanding your health context helps me personalize future insights.
                </p>
              </div>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "priorities":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(GOAL_STEPS)} />
            <Body>
              <Question>What would you like to understand first?</Question>
              <div className="mt-5 divide-y divide-border">
                {PRIORITY_OPTIONS.map((o) => (
                  <CheckRow
                    key={o}
                    label={o}
                    checked={data.priorities.includes(o)}
                    onToggle={() => toggle("priorities", o)}
                  />
                ))}
              </div>
            </Body>
            <Footer onNext={next} disabled={data.priorities.length === 0} />
          </>
        );

      case "goal":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(GOAL_STEPS)} />
            <Body>
              <Question>What&apos;s your biggest goal right now?</Question>
              <div className="mt-5 divide-y divide-border">
                {GOAL_OPTIONS.map((o) => (
                  <CheckRow
                    key={o}
                    label={o}
                    shape="radio"
                    checked={data.primaryGoal === o}
                    onToggle={() => patch({ primaryGoal: o })}
                  />
                ))}
              </div>
            </Body>
            <Footer onNext={next} disabled={!data.primaryGoal} />
          </>
        );

      case "goal-saved":
        return (
          <>
            <TopBar />
            <Body>
              <div className="flex h-full flex-col items-center justify-center text-center">
                <h1 className="font-serif text-[30px] font-light tracking-[-0.015em]">Great.</h1>
                <p className="mt-6 max-w-[18rem] text-[15px] leading-relaxed text-muted-foreground">
                  I&apos;ll prioritize these areas as I learn more about you.
                </p>
              </div>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "apple-health":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(CONNECT_STEPS)} />
            <Body>
              <Question>
                Help me learn from
                <br />
                Apple Health.
              </Question>
              <div className="mt-6 divide-y divide-border">
                {["Sleep", "Heart Rate", "Activity", "Workouts", "Recovery"].map((o) => (
                  <CheckRow
                    key={o}
                    label={o}
                    checked={data.appleHealth.includes(o)}
                    onToggle={() =>
                      patch({
                        appleHealth: data.appleHealth.includes(o)
                          ? data.appleHealth.filter((x) => x !== o)
                          : [...data.appleHealth, o],
                      })
                    }
                  />
                ))}
              </div>
            </Body>
            <div className="shrink-0 space-y-3 px-7 pt-2 pb-9">
              <button
                type="button"
                onClick={() => {
                  patch({ appleHealthConnected: true });
                  next();
                }}
                className="w-full rounded-2xl bg-foreground px-6 py-4 text-[15px] text-background transition-transform active:scale-[0.99]"
              >
                Connect Apple Health
              </button>
              <button
                type="button"
                onClick={next}
                className="w-full rounded-2xl border border-border bg-surface px-6 py-4 text-[15px] text-foreground"
              >
                Not Now
              </button>
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(CONNECT_STEPS)} />
            <Body>
              <Question>
                Would you like daily
                <br />
                health insights?
              </Question>
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    patch({ notifications: "allow" });
                    next();
                  }}
                  className="w-full rounded-2xl border border-border bg-surface px-6 py-4 text-[15px] shadow-[0_1px_2px_rgba(60,45,35,0.05)]"
                >
                  Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    patch({ notifications: "later" });
                    next();
                  }}
                  className="w-full rounded-2xl border border-border bg-surface px-6 py-4 text-[15px]"
                >
                  Not Now
                </button>
              </div>
              <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
                One quiet note a day, only when something meaningful changes.
              </p>
            </Body>
            <div className="h-9 shrink-0" />
          </>
        );

      case "future":
        return (
          <>
            <TopBar onBack={back} title="Teach Session 1" {...sectionDots(CONNECT_STEPS)} />
            <Body>
              <p className="text-[15px] text-muted-foreground">Future Intelligence</p>
              <div className="mt-6 space-y-3">
                {[
                  ["Arc\u2122", "A wearable that reads your daily signals."],
                  ["Webbee\u2122", "Ambient sensing for your environment."],
                ].map(([name, body]) => (
                  <div
                    key={name}
                    className="rounded-2xl bg-wheat/40 px-5 py-5 shadow-[0_1px_2px_rgba(60,45,35,0.05)]"
                  >
                    <p className="font-serif text-[19px] font-light">{name}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Coming Soon</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </Body>
            <Footer onNext={next} />
          </>
        );

      case "building":
        return <Building onDone={next} />;

      case "understanding-ready":
        return (
          <>
            <TopBar />
            <Body>
              <h1 className="font-serif text-[30px] leading-tight font-light tracking-[-0.015em]">
                Welcome, {firstName}.
              </h1>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Here&apos;s what I understand so far.
              </p>

              <Summary
                label="Health Profile"
                items={[
                  data.lifeStage || "Life stage",
                  `${data.heightFt}'${data.heightIn}"`,
                  data.weight ? `${data.weight} lb` : "",
                ].filter(Boolean)}
              />
              <Summary
                label="Health Priorities"
                items={data.priorities.length ? data.priorities.slice(0, 5) : ["Still listening"]}
              />
              <Summary
                label="Current Health Context"
                items={[
                  ...data.conditions,
                  ...data.medications,
                  ...data.supplements,
                  data.appleHealthConnected ? "Apple Health Connected" : "",
                ].filter(Boolean)}
              />
              <Summary label="Primary Goal" items={[data.primaryGoal || "Feel healthier"]} />

              <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
                I&apos;m just getting started. The more we learn together, the more personalized
                your understanding becomes.
              </p>
            </Body>
            <div className="shrink-0 px-7 pt-2 pb-9">
              <button
                type="button"
                onClick={finish}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] text-background transition-transform active:scale-[0.99]"
              >
                Go to Today <span aria-hidden="true">{"\u2192"}</span>
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-[100svh] bg-surface">
      <Screen dir={dir} stepKey={step}>
        {content()}
      </Screen>
    </div>
  );
}

function Summary({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-7">
      <p className="text-[12px] tracking-[0.06em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <span
            key={i}
            className="rounded-full bg-wheat/50 px-3.5 py-2 text-[13px] text-foreground"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

const BUILD_LINES = [
  "Health profile created",
  "Goals identified",
  "Health context established",
  "Preparing your first insights",
  "Your understanding is ready",
];

function Building({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= BUILD_LINES.length) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), done === 0 ? 700 : 1000);
    return () => clearTimeout(t);
  }, [done, onDone]);

  const heading = useMemo(
    () => (done >= BUILD_LINES.length ? "Your understanding is ready" : "Building your understanding…"),
    [done],
  );

  return (
    <>
      <TopBar />
      <Body>
        <div className="flex h-full flex-col justify-center">
          <h1 className="font-serif text-[26px] leading-tight font-light tracking-[-0.015em]">
            {heading}
          </h1>
          <div className="mt-8 space-y-4">
            {BUILD_LINES.map((line, i) => {
              const complete = i < done;
              const active = i === done;
              return (
                <div
                  key={line}
                  className={`flex items-center gap-3 transition-opacity duration-500 ${
                    complete || active ? "opacity-100" : "opacity-35"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      complete ? "border-foreground bg-foreground" : "border-fog"
                    } ${active ? "animate-pulse" : ""}`}
                  >
                    {complete && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path
                          d="M2.5 6.3 4.8 8.6 9.5 3.9"
                          stroke="var(--background)"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-[15px]">{line}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-12 flex justify-center opacity-70">
            <Orb size={120} />
          </div>
        </div>
      </Body>
      <div className="h-9 shrink-0" />
    </>
  );
}
