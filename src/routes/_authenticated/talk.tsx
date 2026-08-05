import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useBack } from "@/lib/use-back";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useLearnedFacts } from "@/lib/ciatta-store";
import { useEngine } from "@/lib/use-engine";
import { useVoiceMemo } from "@/lib/voice-memo";

/** Below this, Ciatta doesn't yet have a real enough basis to reference a pattern in Talk's replies. */
const ESTABLISHED_DEPTH = 40;

export const Route = createFileRoute("/_authenticated/talk")({
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Whether this user message was actually remembered as a fact — undefined for assistant messages. */
  factSaved?: boolean;
};

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

/**
 * Scripted replies — this does not call a model. Every branch used to assert
 * a specific, already-observed correlation ("I already see your sleep
 * soften in the two days before you bleed") as present-tense fact, for
 * every user, regardless of whether they'd ever logged a single thing or
 * connected a sensor. That's not generic — it's a fabricated claim about
 * this particular person's body, stated with false confidence.
 *
 * `established` reflects the server engine's real understanding depth for
 * this account (`views.today.depth`, the same signal Today's orb reads —
 * used here only as a coarse threshold, never surfaced as a number). Below
 * it, replies are honest about not knowing yet; above it, they can
 * reference that real understanding exists without inventing a specific
 * pattern that was never actually computed.
 */
function replyTo(input: string, established: boolean): string {
  const t = input.toLowerCase();

  if (/migraine|headache/.test(t)) {
    return established
      ? "Noted. I'll check this against what I've already learned about your sleep and cycle, and tell you if it lines up."
      : "Noted. I don't know your sleep and cycle well enough yet to say if this connects to anything — but I'll start watching for it from here.";
  }
  if (/coffee|caffeine|espresso/.test(t)) {
    return established
      ? "That fits. I'll hold your late-caffeine days against how you actually slept, not just how the evening felt."
      : "That's useful to know. I don't have enough of your sleep data yet to check it, but I'll start paying attention to your afternoons.";
  }
  if (/train|run|marathon|gym|lift|workout/.test(t)) {
    return established
      ? "Good to know. I'll hold your hard sessions against your recovery, not the calendar, using what I already understand about you."
      : "Good to know. I don't have a real read on your recovery yet, so for now I'll just note the pattern and build from here.";
  }
  if (/pill|medication|iud|meds|prescription/.test(t)) {
    return "Logged. Medication changes shift a lot of what I read, so I'll treat the next few weeks as a new baseline rather than a deviation.";
  }
  if (/stress|work|anxious|anxiety|burnout/.test(t)) {
    return established
      ? "I'll watch for it against what I already know of your patterns — stress usually shows up first as a shift that doesn't match your sleep."
      : "I'll watch for it. I don't have enough history with you yet to know what stress looks like on you specifically, but I'm listening for it.";
  }
  if (/pain|cramp|bloat|flare/.test(t)) {
    return established
      ? "Thank you for telling me. I'll line this up against your cycle day and what I already understand about you, and let you know if it's tracking with something."
      : "Thank you for telling me. I don't have enough of your cycle history yet to line this up against anything real — but this is exactly the kind of thing that builds it.";
  }
  return established
    ? "I've saved that, alongside what I already understand about you. I'll look for it in your signals over the next few cycles and tell you when I find something real, not before."
    : "I've saved that. It's still early between us, so I won't pretend to see a pattern yet — but this is how I start.";
}

function TalkPage() {
  const { goBack } = useBack("/today");
  const { facts, addFact, removeFact } = useLearnedFacts();
  const { views } = useEngine();
  const established = (views?.today.depth ?? 0) >= ESTABLISHED_DEPTH;
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING]);
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pending) textareaRef.current?.focus();
  }, [pending, messages.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessageId = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMessageId, role: "user", text: trimmed }]);
    setPending(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: replyTo(trimmed, established) },
      ]);
      // The reply shows either way — this only decides whether what she said
      // is actually remembered as a fact, so a quiet storage failure doesn't
      // read as a normal reply with nothing wrong.
      const ok = addFact(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessageId ? { ...m, factSaved: ok } : m)),
      );
      setPending(false);
    }, 700);
  };

  const retryFact = (m: ChatMessage) => {
    const ok = addFact(m.text.charAt(0).toUpperCase() + m.text.slice(1));
    setMessages((prev) => prev.map((msg) => (msg.id === m.id ? { ...msg, factSaved: ok } : msg)));
  };

  const handleSubmit = (message: PromptInputMessage) => {
    send(message.text ?? "");
  };

  /** Voice memos: hold to speak, release and Ciatta transcribes it in. */
  const memo = useVoiceMemo((text) => send(text));
  const recording = memo.state === "recording";
  const busy = pending || memo.state === "transcribing";

  return (
    <div className="flex flex-col pt-0">
      <header className="px-6 pb-4 pt-8">
        <button
          type="button"
          onClick={goBack}
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
        <h1 className="mt-5 font-serif text-[32px] leading-[1.12] tracking-[-0.015em]">
          Talk to Ciatta
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          The more it knows, the less it guesses.
        </p>
      </header>

      <Conversation className="max-h-[46vh] min-h-[180px]">
        <ConversationContent className="gap-5 px-6 pb-2">
          {messages.map((m) => (
            <div key={m.id}>
              <Message from={m.role}>
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
              {m.factSaved === false && (
                <p className="mt-1.5 text-right text-[12px] text-muted-foreground">
                  Didn&apos;t save.{" "}
                  <button type="button" onClick={() => retryFact(m)} className="text-accent">
                    Try again
                  </button>
                </p>
              )}
            </div>
          ))}
          {pending && <Shimmer className="text-[15px] text-muted-foreground">Listening…</Shimmer>}
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
              className="rounded-full bg-secondary px-3.5 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:text-accent"
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
            placeholder={
              recording
                ? "Listening — tap the mic when you're done…"
                : "Tell Ciatta something about your body…"
            }
            disabled={recording}
          />
          <PromptInputFooter className="justify-between">
            <button
              type="button"
              onClick={() => (recording ? void memo.stop() : void memo.start())}
              disabled={memo.state === "transcribing" || pending}
              aria-label={recording ? "Stop recording" : "Record a voice memo"}
              aria-pressed={recording}
              className={`grid h-9 w-9 place-items-center rounded-full transition-colors disabled:opacity-40 ${
                recording
                  ? "bg-accent text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
              style={
                recording
                  ? {
                      boxShadow: `0 0 0 ${4 + memo.level * 10}px color-mix(in oklab, var(--clay) 18%, transparent)`,
                    }
                  : undefined
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="11"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <PromptInputSubmit
              status={busy ? "submitted" : undefined}
              disabled={busy || recording}
            />
          </PromptInputFooter>
        </PromptInput>
        {(recording || memo.state === "transcribing" || memo.error) && (
          <p className="mt-2 px-1 text-[13px] text-muted-foreground">
            {memo.error
              ? memo.error
              : recording
                ? "Ciatta is listening — speak, then tap the mic to finish."
                : "Transcribing your memo…"}
          </p>
        )}
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
