import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  MONTHS,
  useOnboarding,
  type Onboarding,
} from "@/lib/onboarding-store";
import {
  a,
  ackFor,
  first,
  FLOW,
  nextNodeId,
  nodeById,
  one,
  progress,
  type Choice,
  type FlowNode,
} from "@/lib/onboarding-flow";
import { useIdentity } from "@/lib/profile-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Your first Teach Session — Ciatta" },
      {
        name: "description",
        content:
          "An adaptive first conversation where Ciatta learns just enough about your body to begin understanding it.",
      },
      { property: "og:title", content: "Your first Teach Session — Ciatta" },
      {
        property: "og:description",
        content:
          "An adaptive first conversation where Ciatta learns just enough about your body to begin understanding it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  ratio,
}: {
  onBack?: () => void;
  title?: string;
  ratio?: number;
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
      <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2.5">
        {title && (
          <span className="text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
            {title}
          </span>
        )}
        {ratio !== undefined && (
          <span className="h-[3px] w-28 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-foreground/60 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(6, Math.round(ratio * 100))}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-7 pt-6 pb-4">{children}</div>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-in fade-in mb-3 text-[13px] leading-relaxed text-muted-foreground duration-500">
      {children}
    </p>
  );
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

/** Ciatta answering back before it moves on. */
function Reflection({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 mt-7 flex gap-3 duration-500">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay/70" />
      <p className="text-[14px] leading-relaxed text-foreground/80">{children}</p>
    </div>
  );
}

function Footer({
  label = "Continue",
  onNext,
  disabled,
  onSkip,
  skipLabel = "Skip",
  variant = "outline",
}: {
  label?: string;
  onNext: () => void;
  disabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  variant?: "outline" | "solid" | "clay";
}) {
  const base =
    "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[15px] transition-all active:scale-[0.99] disabled:opacity-40";
  const styles =
    variant === "solid"
      ? "bg-foreground text-background"
      : variant === "clay"
        ? "bg-wheat/70 text-foreground"
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
            {skipLabel}
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

function OptionRow({
  choice,
  checked,
  onToggle,
  shape,
  dimmed,
}: {
  choice: Choice;
  checked: boolean;
  onToggle: () => void;
  shape: "box" | "radio";
  dimmed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.99] ${
        checked
          ? "bg-surface shadow-[0_1px_3px_rgba(60,45,35,0.08)]"
          : "bg-surface/60 hover:bg-surface"
      } ${dimmed ? "opacity-40" : ""}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
          shape === "radio" ? "rounded-full" : "rounded-[6px]"
        } ${checked ? "border-foreground bg-foreground" : "border-fog bg-background"}`}
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
      <span className="min-w-0">
        <span className="block text-[15px] text-foreground">{choice.value}</span>
        {choice.hint && (
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{choice.hint}</span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ the flow */

function OnboardingPage() {
  const navigate = useNavigate();
  const { data, save, hydrated } = useOnboarding();
  const { save: saveIdentity } = useIdentity();

  const [history, setHistory] = useState<string[]>(["welcome"]);
  const [dir, setDir] = useState<1 | -1>(1);
  const [beat, setBeat] = useState<string | null>(null);
  const usedAcks = useRef<string[]>([]);
  const resumed = useRef(false);

  useEffect(() => {
    if (!hydrated || resumed.current) return;
    resumed.current = true;
    if (data.path?.length && !data.completed) setHistory(data.path);
  }, [hydrated, data.path, data.completed]);

  const id = history[history.length - 1];
  const node = nodeById(id) ?? FLOW[0];
  const { total, index } = progress(data, id);

  const commit = useCallback(
    (nextId: string) => {
      setDir(1);
      setHistory((h) => {
        const next = [...h, nextId];
        save({ path: next });
        return next;
      });
    },
    [save],
  );

  const advance = useCallback(
    (from?: Onboarding) => {
      const state = from ?? data;
      const nextId = nextNodeId(state, id);
      if (!nextId) return;
      const current = nodeById(id);
      const conversational =
        current &&
        ["text", "birth", "body", "single", "multi"].includes(current.kind);
      if (!conversational) {
        commit(nextId);
        return;
      }
      const line = current?.reflect?.(state) ?? ackFor(usedAcks.current);
      usedAcks.current = [...usedAcks.current, line];
      setBeat(line);
      window.setTimeout(() => {
        setBeat(null);
        commit(nextId);
      }, 1150);
    },
    [data, id, commit],
  );

  const back = () => {
    setDir(-1);
    setHistory((h) => {
      const next = h.length > 1 ? h.slice(0, -1) : h;
      save({ path: next });
      return next;
    });
  };

  /** Writes an answer and mirrors it onto the core profile fields. */
  const answer = (key: string, values: string[]): Onboarding => {
    const answers = { ...(data.answers ?? {}), [key]: values };
    const patch: Partial<Onboarding> = { answers };
    if (key === "lifestage") patch.lifeStage = values[0] ?? "";
    if (key === "conditions") patch.conditions = values;
    if (key === "meds") patch.medications = values;
    if (key === "focus") patch.priorities = values;
    if (key === "goal") patch.primaryGoal = values[0] ?? "";
    save(patch);
    return { ...data, ...patch } as Onboarding;
  };

  const finish = () => {
    save({ completed: true });
    if (data.name.trim()) saveIdentity({ name: data.name.trim() });
    if (data.lifeStage && data.lifeStage !== "I'm not sure")
      saveIdentity({ lifeStage: data.lifeStage });
    navigate({ to: "/" });
  };


  const bar = (
    <TopBar
      onBack={history.length > 1 ? back : undefined}
      title="Teach Session 1"
      ratio={total ? (index + 1) / total : 0}
    />
  );

  const content = () => {
    switch (node.kind) {
      case "intro":
        return <Intro id={node.id} onBack={history.length > 1 ? back : undefined} onNext={() => advance()} />;

      case "text":
        return (
          <>
            {bar}
            <Body>
              <Question>{node.ask?.(data)}</Question>
              <input
                autoFocus
                value={data.name}
                onChange={(e) => save({ name: e.target.value })}
                placeholder="Your name"
                className="mt-8 w-full rounded-2xl border border-border bg-surface px-4 py-4 text-[16px] outline-none focus:border-fog"
              />
              {node.why?.(data) && <Why>{node.why(data)}</Why>}
            </Body>
            <Footer onNext={() => advance()} disabled={!data.name.trim()} />
          </>
        );

      case "birth":
        return (
          <>
            {bar}
            <Body>
              {node.lead?.(data) && <Lead>{node.lead(data)}</Lead>}
              <Question>{node.ask?.(data)}</Question>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {(
                  [
                    ["birthMonth", "Month", MONTHS],
                    ["birthDay", "Day", Array.from({ length: 31 }, (_, i) => String(i + 1))],
                    ["birthYear", "Year", Array.from({ length: 60 }, (_, i) => String(2010 - i))],
                  ] as const
                ).map(([key, label, opts]) => (
                  <label key={key} className="rounded-2xl border border-border bg-surface px-3 py-2.5">
                    <span className="block text-[11px] text-muted-foreground">{label}</span>
                    <select
                      value={data[key]}
                      onChange={(e) => save({ [key]: e.target.value } as Partial<Onboarding>)}
                      className="w-full bg-transparent text-[15px] outline-none"
                    >
                      {opts.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {node.why?.(data) && <Why>{node.why(data)}</Why>}
            </Body>
            <Footer onNext={() => advance()} />
          </>
        );

      case "body":
        return (
          <>
            {bar}
            <Body>
              {node.lead?.(data) && <Lead>{node.lead(data)}</Lead>}
              <Question>{node.ask?.(data)}</Question>
              <div className="mt-8 flex gap-3">
                {(
                  [
                    ["heightFt", "ft", 8, 1],
                    ["heightIn", "in", 12, 0],
                  ] as const
                ).map(([key, unit, max, start]) => (
                  <label
                    key={key}
                    className="flex flex-1 items-baseline gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5"
                  >
                    <select
                      value={data[key]}
                      onChange={(e) => save({ [key]: e.target.value } as Partial<Onboarding>)}
                      className="flex-1 bg-transparent text-[17px] outline-none"
                    >
                      {Array.from({ length: max }, (_, i) => String(i + start)).map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                    <span className="text-[13px] text-muted-foreground">{unit}</span>
                  </label>
                ))}
              </div>
              <label className="mt-3 flex items-baseline gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <input
                  inputMode="numeric"
                  value={data.weight}
                  onChange={(e) => save({ weight: e.target.value.replace(/\D/g, "") })}
                  placeholder="Weight"
                  className="w-full bg-transparent text-[17px] outline-none placeholder:text-fog"
                />
                <span className="text-[13px] text-muted-foreground">lb</span>
              </label>
            </Body>
            <Footer onNext={() => advance()} onSkip={() => advance()} skipLabel="Rather not" />
          </>
        );

      case "single":
      case "multi":
        return <QuestionScreen key={node.id} node={node} data={data} bar={bar} onAnswer={answer} onNext={advance} />;

      case "connect":
        return (
          <>
            {bar}
            <Body>
              <Question>
                Can I learn from
                <br />
                Apple Health?
              </Question>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                If you connect it, I'll pick up sleep, heart rate and movement on my own — and I
                won't need to ask you about them.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Sleep", "Heart rate", "Activity", "Workouts", "Recovery"].map((o) => (
                  <span key={o} className="rounded-full bg-wheat/50 px-3.5 py-2 text-[13px]">
                    {o}
                  </span>
                ))}
              </div>
            </Body>
            <div className="shrink-0 space-y-3 px-7 pt-2 pb-9">
              <button
                type="button"
                onClick={() => {
                  save({ appleHealthConnected: true });
                  advance({ ...data, appleHealthConnected: true });
                }}
                className="w-full rounded-2xl bg-foreground px-6 py-4 text-[15px] text-background transition-transform active:scale-[0.99]"
              >
                Connect Apple Health
              </button>
              <button
                type="button"
                onClick={() => {
                  save({ appleHealthConnected: false });
                  advance({ ...data, appleHealthConnected: false });
                }}
                className="w-full rounded-2xl border border-border bg-surface px-6 py-4 text-[15px] text-foreground"
              >
                I'll tell you myself
              </button>
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            {bar}
            <Body>
              <Question>
                Should I tell you when
                <br />
                something changes?
              </Question>
              <div className="mt-8 space-y-3">
                {(
                  [
                    ["Yes, let me know", "allow"],
                    ["Not for now", "later"],
                  ] as const
                ).map(([label, value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      save({ notifications: value });
                      advance({ ...data, notifications: value });
                    }}
                    className="w-full rounded-2xl border border-border bg-surface px-6 py-4 text-[15px] shadow-[0_1px_2px_rgba(60,45,35,0.05)] active:scale-[0.99]"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
                One quiet note a day, only when something meaningful shifts.
              </p>
            </Body>
            <div className="h-9 shrink-0" />
          </>
        );

      case "building":
        return <Building onDone={() => advance()} data={data} />;

      case "summary":
        return <SummaryScreen data={data} onFinish={finish} />;
    }
  };

  return (
    <div className="min-h-[100svh] bg-background">
      {beat ? (
        <Beat line={beat} />
      ) : (
        <Screen dir={dir} stepKey={id}>
          {content()}
        </Screen>
      )}
    </div>
  );
}

/** A short moment where Ciatta answers before asking the next thing. */
function Beat({ line }: { line: string }) {
  return (
    <div className="animate-in fade-in flex h-[100svh] flex-col items-center justify-center px-10 duration-300">
      <span className="animate-breathe mb-7 h-2.5 w-2.5 rounded-full bg-clay/70" />
      <p className="max-w-[19rem] text-center font-serif text-[21px] leading-[1.35] font-light text-foreground/85">
        {line}
      </p>
    </div>
  );
}


/* ------------------------------------------------------- question with reply */

function QuestionScreen({
  node,
  data,
  bar,
  onAnswer,
  onNext,
}: {
  node: FlowNode;
  data: Onboarding;
  bar: React.ReactNode;
  onAnswer: (key: string, values: string[]) => Onboarding;
  onNext: (from?: Onboarding) => void;
}) {
  const key = node.key!;
  const selected = a(data, key);
  const [state, setState] = useState<Onboarding>(data);
  const options = node.options?.(data) ?? [];
  const multi = node.kind === "multi";
  const max = node.max ?? options.length;

  const pick = (value: string) => {
    let values: string[];
    if (!multi) values = [value];
    else if (selected.includes(value)) values = selected.filter((v) => v !== value);
    else if (selected.length >= max) return;
    else values = [...selected, value];
    const next = onAnswer(key, values);
    setState(next);
    // A single choice is a complete answer — move on without a second tap.
    if (!multi) window.setTimeout(() => onNext(next), 240);
  };


  return (
    <>
      {bar}
      <Body>
        {node.lead?.(data) && <Lead>{node.lead(data)}</Lead>}
        <Question>{node.ask?.(data)}</Question>
        <div className="mt-6 space-y-2">
          {options.map((o) => (
            <OptionRow
              key={o.value}
              choice={o}
              shape={multi ? "box" : "radio"}
              checked={selected.includes(o.value)}
              dimmed={multi && !selected.includes(o.value) && selected.length >= max}
              onToggle={() => pick(o.value)}
            />
          ))}
        </div>
        {reflection && <Reflection>{reflection}</Reflection>}
        {!reflection && node.why?.(data) && <Why>{node.why(data)}</Why>}
      </Body>
      <Footer
        onNext={() => onNext(state)}
        disabled={!node.optional && selected.length === 0}
        onSkip={node.optional ? () => onNext(state) : undefined}
        skipLabel="Not sure"
        variant={selected.length ? "clay" : "outline"}
      />
    </>
  );
}

/* ------------------------------------------------------------------- screens */

function Intro({
  id,
  onBack,
  onNext,
}: {
  id: string;
  onBack?: () => void;
  onNext: () => void;
}) {
  if (id === "welcome")
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
        <Footer label="Begin" onNext={onNext} variant="clay" />
      </>
    );

  if (id === "privacy")
    return (
      <>
        <TopBar onBack={onBack} />
        <Body>
          <h1 className="text-center font-serif text-[30px] leading-[1.2] font-light tracking-[-0.015em]">
            Your privacy
            <br />
            comes first.
          </h1>
          <div className="mt-9 space-y-4 text-[14px] leading-relaxed">
            {["Your health data belongs to you.", "Encrypted.", "Private.", "Never sold."].map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </div>
          <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
            You decide what I learn, and what you keep to yourself.
          </p>
        </Body>
        <Footer onNext={onNext} />
      </>
    );

  return (
    <>
      <TopBar onBack={onBack} title="Teach Session 1" />
      <Body>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mt-2 flex justify-center">
            <Orb />
          </div>
          <p className="mt-10 max-w-[20rem] text-[15px] leading-relaxed">
            I&apos;ll ask a few questions. Each answer tells me what to ask next, so this stays
            short.
          </p>
          <p className="mt-6 text-[13px] text-muted-foreground">
            Usually two or three minutes.
          </p>
        </div>
      </Body>
      <Footer label="Let's Begin" onNext={onNext} variant="clay" />
    </>
  );
}

function Summary({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-7">
      <p className="text-[12px] tracking-[0.06em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="rounded-full bg-wheat/50 px-3.5 py-2 text-[13px] text-foreground">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/** What Ciatta learned, written back as understanding rather than a receipt. */
function understandingLines(d: Onboarding): string[] {
  const lines: string[] = [];
  const stagePhrase: Record<string, string> = {
    Cycling: "You're still cycling, so your month frames everything else.",
    "Trying to conceive": "You're trying to conceive, so I'll follow ovulation closely.",
    "Pregnant or postpartum": "You're pregnant or postpartum, so I'll stay gentle and watch recovery.",
    Perimenopause: "You're in perimenopause, so I'll read shifts rather than a fixed rhythm.",
    Menopause: "You're through menopause, so symptoms and recovery matter more than cycles.",
    "I'm not sure": "You're between definitions, so I'll learn the shape of it from your signals.",
  };
  if (d.lifeStage) lines.push(stagePhrase[d.lifeStage] ?? `You're ${d.lifeStage.toLowerCase()}.`);
  const cycle = one(d, "cycle_regularity");
  if (cycle === "Irregular") lines.push("Your cycles vary, so I'll learn your rhythm before judging it.");
  if (cycle === "Regular") lines.push("Your cycles are steady, which gives me a baseline fast.");
  const symptoms = [...a(d, "cycle_symptoms"), ...a(d, "meno_symptoms")].filter(
    (s) => s !== "Nothing much" && s !== "Nothing yet",
  );
  if (symptoms.length) lines.push(`I'll watch for ${symptoms.join(", ").toLowerCase()}.`);
  if (a(d, "conditions").length) lines.push(`I'll read your signals through ${a(d, "conditions").join(" and ")}.`);
  if (a(d, "meds", ).includes("GLP-1"))
    lines.push(
      `You're on ${one(d, "glp1_which") || "a GLP-1"}${
        one(d, "glp1_purpose") ? ` for ${one(d, "glp1_purpose").toLowerCase()}` : ""
      }. I'll separate its effects from yours.`,
    );
  if (d.appleHealthConnected)
    lines.push("Apple Health is connected, so sleep and heart rate arrive on their own.");
  else if (one(d, "sleep_self")) lines.push(`Sleep: ${one(d, "sleep_self").toLowerCase()}.`);
  if (d.primaryGoal) lines.push(`Everything gets measured against one thing: ${d.primaryGoal.toLowerCase()}.`);
  return lines;
}

function SummaryScreen({ data, onFinish }: { data: Onboarding; onFinish: () => void }) {
  const lines = understandingLines(data);
  return (
    <>
      <TopBar />
      <Body>
        <h1 className="font-serif text-[30px] leading-tight font-light tracking-[-0.015em]">
          Here&apos;s what I understand, {first(data)}.
        </h1>
        <div className="mt-7 space-y-4">
          {lines.map((line, i) => (
            <div
              key={line}
              className="animate-in fade-in slide-in-from-bottom-2 flex gap-3 duration-500"
              style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay/70" />
              <p className="text-[15px] leading-relaxed text-foreground/85">{line}</p>
            </div>
          ))}
        </div>

        <Summary label="Watching first" items={data.priorities.length ? data.priorities : ["Still listening"]} />

        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
          That&apos;s enough to begin. Everything else I&apos;ll learn from you as we go.
        </p>
      </Body>
      <div className="shrink-0 px-7 pt-2 pb-9">
        <button
          type="button"
          onClick={onFinish}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] text-background transition-transform active:scale-[0.99]"
        >
          Go to Today <span aria-hidden="true">{"\u2192"}</span>
        </button>
      </div>
    </>
  );
}

function Building({ onDone, data }: { onDone: () => void; data: Onboarding }) {
  const lines = useMemo(() => {
    const out = ["Listening to what you told me"];
    if (data.lifeStage) out.push(`Framing everything around ${data.lifeStage.toLowerCase()}`);
    if (a(data, "conditions").length || a(data, "meds").length)
      out.push("Adjusting for your health context");
    out.push(
      data.appleHealthConnected ? "Reading your Apple Health signals" : "Setting a starting baseline",
    );
    out.push("Your understanding is ready");
    return out;
  }, [data]);

  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= lines.length) {
      const t = setTimeout(onDone, 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), done === 0 ? 650 : 850);
    return () => clearTimeout(t);
  }, [done, onDone, lines.length]);

  return (
    <>
      <TopBar />
      <Body>
        <div className="flex h-full flex-col justify-center">
          <h1 className="font-serif text-[26px] leading-tight font-light tracking-[-0.015em]">
            {done >= lines.length ? "Your understanding is ready" : "Putting it together…"}
          </h1>
          <div className="mt-8 space-y-4">
            {lines.map((line, i) => {
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
