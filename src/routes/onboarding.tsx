import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  Droplet,
  Feather,
  Flame,
  HeartPulse,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Waves,
  Wind,
} from "lucide-react";

import wordmark from "@/assets/ciatta-wordmark.png.asset.json";
import { Composer } from "@/components/ciatta/composer";
import { Understanding } from "@/components/ciatta/understanding";

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
      data-dir={dir}
      className="animate-dissolve flex h-[100svh] flex-col"
    >

      {children}
    </div>
  );
}

/** Almost nothing: a back affordance and a hairline of progress. */
function TopBar({ onBack, ratio }: { onBack?: () => void; ratio?: number }) {
  return (
    <div className="relative flex h-14 shrink-0 items-center px-5 pt-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-full text-[22px] leading-none text-muted-foreground transition-colors active:bg-secondary"
        >
          {"\u2039"}
        </button>
      )}
      {ratio !== undefined && (
        <span className="pointer-events-none absolute inset-x-0 top-6 mx-auto block h-[2px] w-24 overflow-hidden rounded-full bg-border/70">
          <span
            className="block h-full rounded-full bg-accent/70 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(6, Math.round(ratio * 100))}%` }}
          />
        </span>
      )}
    </div>
  );
}

function Body({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`flex-1 overflow-y-auto px-8 pt-2 pb-4 ${
        center ? "flex flex-col justify-center" : ""
      }`}
    >
      {children}
    </div>
  );
}

/** The Understanding, at onboarding scale. Only used while Ciatta is forming. */
function Orb({ size = 168, confidence = 42, active }: { size?: number; confidence?: number; active?: boolean }) {
  return (
    <div className="flex justify-center">
      <Understanding size={size} confidence={confidence} active={active} />
    </div>
  );
}

/** A quiet line of context above a question. No container, no color. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-in fade-in mb-5 text-center text-[11px] tracking-[0.14em] text-muted-foreground/80 uppercase duration-700">
      {children}
    </p>
  );
}



function Question({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="animate-in fade-in mx-auto max-w-[19rem] text-center font-serif text-[29px] leading-[1.15] tracking-[-0.015em] text-balance text-foreground duration-500">
      {children}
    </h1>
  );
}

function Support({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-in fade-in mx-auto mt-3 max-w-[19rem] text-center text-[13.5px] leading-relaxed text-muted-foreground duration-500">
      {children}
    </p>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-accent px-6 py-[15px] text-[15px] font-medium text-accent-foreground shadow-[0_12px_28px_-20px_color-mix(in_oklab,var(--clay)_70%,transparent)] transition-all duration-200 active:scale-[0.99] disabled:opacity-35 disabled:shadow-none"
    >
      {label}
    </button>
  );
}

function Footer({
  label = "Continue",
  onNext,
  disabled,
  onSkip,
  skipLabel = "Skip",
  note,
}: {
  label?: string;
  onNext: () => void;
  disabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  note?: string;
}) {
  return (
    <div className="shrink-0 px-8 pt-3 pb-10">
      <PrimaryButton label={label} onClick={onNext} disabled={disabled} />
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mx-auto mt-3.5 block px-3 py-1 text-[13.5px] text-muted-foreground"
        >
          {skipLabel}
        </button>
      )}
      {note && (
        <p className="mt-4 text-center text-[12px] text-muted-foreground">{note}</p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- suggestions */

const GLYPHS = [
  Moon,
  Droplet,
  Waves,
  Leaf,
  Flame,
  Feather,
  Sun,
  Wind,
  HeartPulse,
  Brain,
  Activity,
  Sparkles,
];

/** A suggestion, in Ciatta's voice: warm glyph, plain words, no chrome. */
function Suggestion({
  choice,
  index,
  checked,
  dimmed,
  onToggle,
}: {
  choice: Choice;
  index: number;
  checked: boolean;
  dimmed?: boolean;
  onToggle: () => void;
}) {
  const Glyph = GLYPHS[index % GLYPHS.length];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex h-full w-full items-center gap-2.5 px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.985] ${
        choice.hint ? "rounded-[20px]" : "rounded-full"
      } ${
        checked
          ? "bg-accent/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--clay)_35%,transparent)]"
          : "bg-surface shadow-[0_8px_20px_-18px_rgba(60,45,35,0.5)]"
      } ${dimmed ? "opacity-35" : ""}`}
    >

      <Glyph
        size={16}
        strokeWidth={1.6}
        aria-hidden="true"
        className={checked ? "shrink-0 text-accent" : "shrink-0 text-accent/70"}
      />
      <span className="min-w-0">
        <span className="block text-[14.5px] leading-snug text-foreground">{choice.value}</span>
        {choice.hint && (
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
            {choice.hint}
          </span>
        )}
      </span>
    </button>
  );
}

/** Quiet iOS-style field used for the few structured answers. */
function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3 shadow-[0_8px_20px_-18px_rgba(60,45,35,0.5)]">
      {children}
    </div>
  );
}

/* ------------------------------------------------------- identity & beginning */

/** Wordmark only. Sized in ems so it sits like type, not like an image. */
function Wordmark({ width = 132 }: { width?: number }) {
  return (
    <img
      src={wordmark.url}
      alt="Ciatta"
      width={1920}
      height={562}
      className="dark:invert"
      style={{ width, height: "auto" }}
    />
  );
}

/**
 * Splash. Identity and one slow breath — no copy, no controls, no indicator.
 */
function Splash() {
  return (
    <div className="animate-dissolve flex h-[100svh] flex-col items-center justify-center bg-background">
      <div
        className="animate-in fade-in duration-[1400ms]"
        style={{ animationFillMode: "backwards" }}
      >
        <Understanding size={168} confidence={20} />
      </div>
      <div
        className="animate-in fade-in mt-14 duration-[1600ms]"
        style={{ animationDelay: "500ms", animationFillMode: "backwards" }}
      >
        <Wordmark width={124} />
      </div>
    </div>
  );
}

/**
 * The beginning of the relationship rather than an account screen: one
 * editorial line, then three quiet ways in.
 */
function Welcome({ onChoose }: { onChoose: (method: string) => void }) {
  const ways: { label: string; method: string }[] = [
    { label: "Continue with Apple", method: "apple" },
    { label: "Continue with Google", method: "google" },
    { label: "Continue with Email", method: "email" },
  ];

  return (
    <div className="animate-dissolve flex h-[100svh] flex-col">
      <div className="flex-1 overflow-y-auto px-8 pt-20">
        <Wordmark width={104} />
        <h1 className="animate-in fade-in mt-14 max-w-[17rem] font-serif text-[34px] leading-[1.12] tracking-[-0.02em] duration-700">
          I don&apos;t know you yet.
        </h1>
        <p className="animate-in fade-in mt-4 max-w-[18rem] text-[14.5px] leading-relaxed text-muted-foreground duration-700">
          That&apos;s where we start. Everything you share teaches me a little more, and it becomes
          more personal every day.
        </p>
      </div>

      <div className="shrink-0 px-8 pb-10">
        <div className="space-y-2.5">
          {ways.map(({ label, method }, i) => (
            <button
              key={method}
              type="button"
              onClick={() => onChoose(method)}
              className={`w-full rounded-full px-6 py-[15px] text-[15px] transition-all duration-200 active:scale-[0.99] ${
                i === 0
                  ? "bg-accent font-medium text-accent-foreground shadow-[0_12px_28px_-20px_color-mix(in_oklab,var(--clay)_70%,transparent)]"
                  : "bg-surface text-foreground shadow-[0_8px_20px_-18px_rgba(60,45,35,0.5)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChoose("existing")}
          className="mx-auto mt-5 block px-3 py-1 text-[13.5px] text-muted-foreground"
        >
          I already have an account
        </button>
      </div>
    </div>
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
  const [phase, setPhase] = useState<"splash" | "auth" | "flow">("splash");
  const usedAcks = useRef<string[]>([]);
  const resumed = useRef(false);

  useEffect(() => {
    if (!hydrated || resumed.current) return;
    resumed.current = true;
    if (data.path?.length && !data.completed) setHistory(data.path);
  }, [hydrated, data.path, data.completed]);

  // The splash exists only to establish identity; it never blocks anyone.
  useEffect(() => {
    if (!hydrated || phase !== "splash") return;
    const t = window.setTimeout(
      () => setPhase(data.authMethod ? "flow" : "auth"),
      2600,
    );
    return () => window.clearTimeout(t);
  }, [hydrated, phase, data.authMethod]);


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

  const ratio = total ? (index + 1) / total : 0;
  const bar = <TopBar onBack={history.length > 1 ? back : undefined} ratio={ratio} />;
  const confidence = Math.round(30 + ratio * 55);

  const content = () => {
    switch (node.kind) {
      case "intro":
        return (
          <Intro
            id={node.id}
            onBack={history.length > 1 ? back : undefined}
            onNext={() => advance()}
          />
        );

      case "text":
        return (
          <>
            {bar}
            <Body center>
              <Eyebrow>We haven&apos;t met yet</Eyebrow>
              <div>

                <Question>{node.ask?.(data)}</Question>
                {node.why?.(data) && <Support>{node.why(data)}</Support>}
              </div>
              <div className="mx-auto mt-7 w-full max-w-[19rem]">
                <Field>
                  <input
                    autoFocus
                    value={data.name}
                    onChange={(e) => save({ name: e.target.value })}
                    placeholder="Your name"
                    className="w-full bg-transparent text-center text-[16px] outline-none placeholder:text-fog"
                  />
                </Field>
              </div>
            </Body>
            <Footer onNext={() => advance()} disabled={!data.name.trim()} />
          </>
        );

      case "birth":
        return (
          <>
            {bar}
            <Body center>
              <div>

                <Question>{node.ask?.(data)}</Question>
                {node.why?.(data) && <Support>{node.why(data)}</Support>}
              </div>
              <div className="mx-auto mt-7 grid w-full max-w-[19rem] grid-cols-3 gap-2.5">
                {(
                  [
                    ["birthMonth", "Month", MONTHS],
                    ["birthDay", "Day", Array.from({ length: 31 }, (_, i) => String(i + 1))],
                    ["birthYear", "Year", Array.from({ length: 60 }, (_, i) => String(2010 - i))],
                  ] as const
                ).map(([key, label, opts]) => (
                  <Field key={key}>
                    <label>
                      <span className="block text-[10.5px] tracking-[0.08em] text-muted-foreground uppercase">
                        {label}
                      </span>
                      <select
                        value={data[key]}
                        onChange={(e) => save({ [key]: e.target.value } as Partial<Onboarding>)}
                        className="mt-0.5 w-full bg-transparent text-[15px] outline-none"
                      >
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                  </Field>
                ))}
              </div>
            </Body>
            <Footer onNext={() => advance()} />
          </>
        );

      case "body":
        return (
          <>
            {bar}
            <Body center>
              <div>

                <Question>{node.ask?.(data)}</Question>
                {node.lead?.(data) && <Support>{node.lead(data)}</Support>}
              </div>
              <div className="mx-auto mt-7 w-full max-w-[19rem] space-y-2.5">
                <div className="flex gap-2.5">
                  {(
                    [
                      ["heightFt", "ft", 8, 1],
                      ["heightIn", "in", 12, 0],
                    ] as const
                  ).map(([key, unit, max, start]) => (
                    <div key={key} className="flex-1">
                      <Field>
                        <label className="flex items-baseline gap-2">
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
                      </Field>
                    </div>
                  ))}
                </div>
                <Field>
                  <label className="flex items-baseline gap-2">
                    <input
                      inputMode="numeric"
                      value={data.weight}
                      onChange={(e) => save({ weight: e.target.value.replace(/\D/g, "") })}
                      placeholder="Weight"
                      className="w-full bg-transparent text-[17px] outline-none placeholder:text-fog"
                    />
                    <span className="text-[13px] text-muted-foreground">lb</span>
                  </label>
                </Field>
              </div>
            </Body>
            <Footer onNext={() => advance()} onSkip={() => advance()} skipLabel="Rather not" />
          </>
        );

      case "single":
      case "multi":
        return (
          <QuestionScreen
            key={node.id}
            node={node}
            data={data}
            bar={bar}
            onAnswer={answer}
            onNext={advance}
          />

        );

      case "connect":
        return (
          <>
            {bar}
            <Body center>
              <div>
                <Question>Can I learn from Apple Health?</Question>
                <Support>
                  If you share it, I&apos;ll notice your sleep, heart rate and movement quietly on
                  my own — and I won&apos;t ask you about them again.
                </Support>

              </div>
              <div className="mx-auto mt-6 flex max-w-[19rem] flex-wrap justify-center gap-2">
                {["Sleep", "Heart rate", "Activity", "Workouts", "Recovery"].map((o) => (
                  <span
                    key={o}
                    className="rounded-full bg-surface px-3.5 py-2 text-[12.5px] text-muted-foreground shadow-[0_8px_20px_-18px_rgba(60,45,35,0.5)]"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </Body>
            <div className="shrink-0 px-8 pt-3 pb-10">
              <PrimaryButton
                label="Connect Apple Health"
                onClick={() => {
                  save({ appleHealthConnected: true });
                  advance({ ...data, appleHealthConnected: true });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  save({ appleHealthConnected: false });
                  advance({ ...data, appleHealthConnected: false });
                }}
                className="mx-auto mt-3.5 block px-3 py-1 text-[13.5px] text-muted-foreground"
              >
                I&apos;ll tell you myself
              </button>
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            {bar}
            <Body center>
              <div>
                <Question>Should I tell you when something changes?</Question>
                <Support>
                  One quiet note a day, and only when something has really shifted.
                </Support>

              </div>
              <div className="mx-auto mt-7 w-full max-w-[19rem] space-y-2.5">
                {(
                  [
                    ["Yes, let me know", "allow"],
                    ["Not for now", "later"],
                  ] as const
                ).map(([label, value], i) => (
                  <Suggestion
                    key={value}
                    index={i === 0 ? 11 : 5}
                    choice={{ value: label }}
                    checked={data.notifications === value}
                    onToggle={() => {
                      save({ notifications: value });
                      advance({ ...data, notifications: value });
                    }}
                  />
                ))}
              </div>
            </Body>
            <div className="h-10 shrink-0" />
          </>
        );

      case "building":
        return <Building onDone={() => advance()} data={data} />;

      case "summary":
        return <SummaryScreen data={data} onFinish={finish} />;
    }
  };

  if (!hydrated) return <div className="min-h-[100svh] bg-background" />;

  if (phase === "splash") return <Splash />;

  if (phase === "auth")
    return (
      <div className="min-h-[100svh] bg-background">
        <Welcome
          onChoose={(method) => {
            save({ authMethod: method });
            setPhase("flow");
          }}
        />
      </div>
    );

  return (
    <div className="min-h-[100svh] bg-background">
      {beat ? (
        <Beat line={beat} confidence={confidence} />
      ) : (
        <Screen dir={dir} stepKey={id}>
          {content()}
        </Screen>
      )}
    </div>
  );
}

/**
 * Reflection. Ciatta answers before it asks anything else: one large breathing
 * Understanding, one editorial sentence, nothing to press.
 */
function Beat({ line, confidence }: { line: string; confidence: number }) {
  return (
    <div className="animate-in fade-in flex h-[100svh] flex-col items-center justify-center px-10 duration-500">
      <p className="animate-in fade-in text-[11px] tracking-[0.14em] text-muted-foreground/80 uppercase duration-700">
        Getting to know you
      </p>

      <div className="mt-10">
        <Understanding size={212} confidence={confidence} active />
      </div>
      <p className="animate-in fade-in mt-12 max-w-[19rem] text-center font-serif text-[22px] leading-[1.3] text-balance text-foreground/90 duration-700">
        {line}
      </p>
      <span className="mt-14 h-[2px] w-16 rounded-full bg-border" />
    </div>
  );
}

/* ------------------------------------------------- the Teach question surface */

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
      <div className="flex-1 overflow-y-auto px-8 pt-6 pb-4">
        <div>

          <Question>{node.ask?.(data)}</Question>
          {(node.lead?.(data) || node.why?.(data)) && (
            <Support>{node.lead?.(data) ?? node.why?.(data)}</Support>
          )}
        </div>

        <div
          className={`mx-auto mt-7 grid w-full max-w-[21rem] gap-2 ${
            options.length > 4 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {options.map((o, i) => (
            <Suggestion
              key={o.value}
              index={i}
              choice={o}
              checked={selected.includes(o.value)}
              dimmed={multi && !selected.includes(o.value) && selected.length >= max}
              onToggle={() => pick(o.value)}
            />
          ))}
        </div>

        {/* Not the primary input — only for what wasn't suggested. */}
        <div className="mx-auto mt-5 w-full max-w-[21rem]">
          <Composer onSubmit={(text) => pick(text)} />
        </div>
      </div>

      {multi || node.optional ? (
        <Footer
          onNext={() => onNext(state)}
          disabled={!node.optional && selected.length === 0}
          onSkip={node.optional ? () => onNext(state) : undefined}
          skipLabel="Not sure"
        />
      ) : (
        <div className="h-10 shrink-0" />
      )}
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
        <TopBar onBack={onBack} />
        <div className="flex-1 overflow-y-auto px-8 pt-16">
          <h1 className="animate-in fade-in max-w-[17rem] font-serif text-[34px] leading-[1.12] tracking-[-0.02em] duration-700">
            Every body has
            <br />
            its own rhythm.
          </h1>
          <p className="animate-in fade-in mt-5 max-w-[18rem] text-[14.5px] leading-relaxed text-muted-foreground duration-700">
            Yours is still a stranger to me. Tell me a few things, and I&apos;ll start listening for
            it.
          </p>
        </div>
        <Footer label="Begin" onNext={onNext} />
      </>
    );

  if (id === "privacy")
    return (
      <>
        <TopBar onBack={onBack} />
        <div className="flex-1 overflow-y-auto px-8 pt-16">
          <h1 className="animate-in fade-in max-w-[17rem] font-serif text-[30px] leading-[1.16] tracking-[-0.015em] duration-700">
            What you tell me
            <br />
            stays yours.
          </h1>
          <div className="mt-8 max-w-[18rem] space-y-3.5 text-[14.5px] leading-relaxed text-foreground/85">
            {[
              "Your health is yours, always.",
              "Nothing is sold or shared.",
              "You decide what I learn, and what you keep.",
            ].map((line, i) => (
              <p
                key={line}
                className="animate-in fade-in duration-700"
                style={{ animationDelay: `${i * 130}ms`, animationFillMode: "backwards" }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        <Footer onNext={onNext} />
      </>
    );

  return (
    <>
      <TopBar onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-8 pt-16">
        <h1 className="animate-in fade-in max-w-[17rem] font-serif text-[30px] leading-[1.16] tracking-[-0.015em] duration-700">
          Let&apos;s talk for
          <br />
          a few minutes.
        </h1>
        <p className="animate-in fade-in mt-5 max-w-[18rem] text-[14.5px] leading-relaxed text-muted-foreground duration-700">
          One thing at a time. Whatever you say shapes what I ask next, so we can keep this short and
          come back to the rest later.
        </p>
      </div>
      <Footer label="I'm ready" onNext={onNext} />
    </>
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
  if (a(d, "meds").includes("GLP-1"))
    lines.push(
      `You're on a GLP-1${
        one(d, "glp1_purpose") ? ` for ${one(d, "glp1_purpose").toLowerCase()}` : ""
      }. I'll separate its effects from yours.`,
    );
  if (d.appleHealthConnected)
    lines.push("Apple Health is connected, so sleep and heart rate arrive on their own.");
  else if (one(d, "sleep_self")) lines.push(`Sleep: ${one(d, "sleep_self").toLowerCase()}.`);
  if (one(d, "focus"))
    lines.push(`${one(d, "focus")} is where I'll look first, every day.`);
  if (d.primaryGoal) lines.push(`Everything gets measured against one thing: ${d.primaryGoal.toLowerCase()}.`);
  const blocker = one(d, "goal_blocker");
  if (blocker && blocker !== "I don't know yet")
    lines.push(`And I'll keep an eye on ${blocker.toLowerCase()}, since that's what gets in the way.`);
  return lines;
}

/** The editorial understanding card, not a list of answers. */
function SummaryScreen({ data, onFinish }: { data: Onboarding; onFinish: () => void }) {
  const lines = understandingLines(data);
  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-y-auto px-8 pt-2 pb-4">
        <h1 className="animate-in fade-in text-center font-serif text-[30px] leading-[1.16] tracking-[-0.015em] duration-700">
          Here&apos;s what I&apos;m
          <br />
          beginning to understand
        </h1>
        <div className="mt-7">
          <Orb size={104} confidence={92} active />
        </div>



        <div className="mx-auto mt-7 max-w-[21rem] rounded-[26px] bg-surface px-5 py-5 shadow-[0_18px_44px_-32px_rgba(60,45,35,0.55)]">
          <div className="space-y-4">
            {lines.map((line, i) => {
              const Glyph = GLYPHS[i % GLYPHS.length];
              return (
                <div
                  key={line}
                  className="animate-dissolve flex gap-3"
                  style={{ animationDelay: `${i * 110}ms`, animationFillMode: "backwards" }}
                >
                  <Glyph
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden="true"
                    className="mt-[3px] shrink-0 text-accent/80"
                  />
                  <p className="text-[14.5px] leading-relaxed text-foreground/85">{line}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[19rem] text-center text-[13px] leading-relaxed text-muted-foreground">
          I&apos;ll keep learning and update this as we go, {first(data)}.
        </p>

      </div>
      <div className="shrink-0 px-8 pt-3 pb-10">
        <PrimaryButton label="Go to Today" onClick={onFinish} />
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
      <Body center>
        <h1 className="text-center font-serif text-[29px] leading-[1.16] tracking-[-0.015em]">
          Building your
          <br />
          understanding
        </h1>
        <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
          This takes just a few moments.
        </p>

        <div className="mx-auto mt-9 w-full max-w-[19rem] space-y-3.5">
          {lines.map((line, i) => {
            const complete = i < done;
            const active = i === done;
            return (
              <div
                key={line}
                className={`flex items-center gap-3 transition-opacity duration-500 ${
                  complete ? "opacity-100" : active ? "opacity-80" : "opacity-30"
                }`}
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors duration-500 ${
                    complete
                      ? "bg-accent"
                      : "shadow-[inset_0_0_0_1px_var(--fog)]"
                  } ${active ? "animate-breathe" : ""}`}
                >
                  {complete && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 6.3 4.8 8.6 9.5 3.9"
                        stroke="var(--accent-foreground)"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-[14.5px] leading-snug">{line}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-11">
          <Orb size={156} confidence={70} active />
        </div>
      </Body>
      <div className="h-10 shrink-0" />
    </>
  );
}
