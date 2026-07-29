import { useEffect, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useLearnedFacts } from "@/lib/ciatta-store";

export const Route = createFileRoute("/talk")({
  head: () => ({
    meta: [
      { title: "Talk to Ciatta — Ciatta" },
      {
        name: "description",
        content:
          "Tell Ciatta what your sensors can't see. It remembers, and folds it into how it reads your body.",
      },
      { property: "og:title", content: "Talk to Ciatta — Ciatta" },
      {
        property: "og:description",
        content: "Teach Ciatta about your body in your own words.",
      },
    ],
  }),
  component: TalkPage,
});

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const QUICK_PROMPTS = [
  "I get migraines before my period",
  "Coffee after 2pm wrecks my sleep",
  "I'm training for a half marathon",
];

const OPENING: ChatMessage = {
  id: "opening",
  role: "assistant",
  text: "Tell me something about your body that my sensors can't see. A pattern you've noticed, a medication, a thing that always throws you off. I'll remember it.",
};

/** Scripted replies — this preview does not call a model. */
function replyTo(input: string): string {
  const t = input.toLowerCase();

  if (/migraine|headache/.test(t)) {
    return "Noted. I already see your sleep soften in the two days before you bleed — I'll start checking whether your migraines land in that same window, and warn you the day before.";
  }
  if (/coffee|caffeine|espresso/.test(t)) {
    return "That fits. On the nights you fall asleep latest, your temperature is still elevated at 11pm. I'll flag it when your afternoon looks like a late-caffeine day.";
  }
  if (/train|run|marathon|gym|lift|workout/.test(t)) {
    return "Good to know. I'll hold your hard sessions against your recovery, not the calendar — and tell you when your follicular window opens, because that's where your capacity peaks.";
  }
  if (/pill|medication|iud|meds|prescription/.test(t)) {
    return "Logged. Medication changes shift a lot of what I read, so I'll treat the next few weeks as a new baseline rather than a deviation.";
  }
  if (/stress|work|anxious|anxiety|burnout/.test(t)) {
    return "I'll watch for it. Stress usually shows up in your data first as a lower heart rate variability with unchanged sleep hours — I'll name it when I see that shape.";
  }
  if (/pain|cramp|bloat|flare/.test(t)) {
    return "Thank you for telling me. I'll line this up against your cycle day and your temperature, and let you know if it's tracking with something.";
  }
  return "I've saved that. I'll look for it in your signals over the next few cycles and tell you when I find something real, not before.";
}

function TalkPage() {
  const router = useRouter();
  const { facts, addFact, removeFact } = useLearnedFacts();
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING]);
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pending) textareaRef.current?.focus();
  }, [pending, messages.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setPending(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: replyTo(trimmed) },
      ]);
      addFact(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      setPending(false);
    }, 700);
  };

  const handleSubmit = (message: PromptInputMessage) => {
    send(message.text ?? "");
  };

  return (
    <div className="flex flex-col pt-0">
      <header className="px-6 pb-4 pt-8">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="mt-5 font-serif text-[30px] leading-tight font-light">Talk to Ciatta</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          The more it knows, the less it guesses.
        </p>
      </header>

      <Conversation className="max-h-[46vh] min-h-[180px]">
        <ConversationContent className="gap-5 px-6 pb-2">
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent
                className={
                  m.role === "assistant"
                    ? "bg-transparent p-0 text-[16px] leading-relaxed text-foreground"
                    : "bg-foreground text-[15px] text-background"
                }
              >
                <MessageResponse>{m.text}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {pending && (
            <Shimmer className="text-[15px] text-muted-foreground">Listening…</Shimmer>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="rounded-full border border-border px-3.5 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="px-6">
        <PromptInput onSubmit={handleSubmit} className="rounded-3xl border-border bg-surface">
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Tell Ciatta something about your body…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={pending ? "submitted" : undefined} disabled={pending} />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <section className="mt-8 px-6">
        <p className="label-caps">What Ciatta has learned</p>
        <ul className="mt-4 space-y-3">
          {facts.map((f) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <span className="text-[15px] leading-relaxed text-muted-foreground">{f.text}</span>
              <button
                type="button"
                onClick={() => removeFact(f.id)}
                className="shrink-0 text-[12px] text-fog transition-colors hover:text-accent"
                aria-label={`Forget: ${f.text}`}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
