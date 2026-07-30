import { Mic } from "lucide-react";

import { useVoiceMemo } from "@/lib/voice-memo";

/**
 * The voice interaction. One calm presence, reused wherever Ciatta listens:
 * a warm Living Clay circle that answers the voice with a soft ring, and a
 * quiet row of dots while it takes something in.
 */
export function VoiceTeach({
  onTranscript,
  prompt = "Speak, and Ciatta listens",
  hint = "Tap to begin. Tap again when you're done.",
}: {
  onTranscript: (text: string) => void;
  prompt?: string;
  hint?: string;
  confidence?: number;
}) {
  const memo = useVoiceMemo(onTranscript);
  const recording = memo.state === "recording";
  const transcribing = memo.state === "transcribing";

  const label = memo.error
    ? memo.error
    : recording
      ? "Listening…"
      : transcribing
        ? "Taking it in…"
        : prompt;

  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => (recording ? void memo.stop() : void memo.start())}
        disabled={transcribing}
        aria-label={recording ? "Stop teaching" : "Teach Ciatta with your voice"}
        aria-pressed={recording}
        className="relative grid h-[120px] w-[120px] place-items-center rounded-full transition-transform duration-500 disabled:opacity-60"
        style={{
          transform: recording ? `scale(${1 + memo.level * 0.04})` : "scale(1)",
        }}
      >
        {/* Concentric warmth, answering the voice. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full transition-all duration-500"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--clay) 18%, transparent) 0%, transparent 72%)",
            transform: `scale(${recording ? 1.1 + memo.level * 0.18 : 1})`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute rounded-full transition-all duration-300"
          style={{
            width: 84,
            height: 84,
            boxShadow: `0 0 0 ${recording ? 8 + memo.level * 18 : 10}px color-mix(in oklab, var(--clay) 12%, transparent)`,
          }}
        />
        <span className="animate-breathe relative grid h-[72px] w-[72px] place-items-center rounded-full bg-accent text-accent-foreground">
          <Mic size={26} strokeWidth={1.75} />
        </span>
      </button>

      <p className="mt-7 text-[15px] leading-relaxed">{label}</p>

      {/* Amplitude, rendered as the quietest possible signal. */}
      <span aria-hidden="true" className="mt-3 flex items-center gap-[5px]">
        {Array.from({ length: 13 }).map((_, i) => (
          <span
            key={i}
            className="h-[5px] w-[5px] rounded-full bg-accent transition-opacity duration-300"
            style={{
              opacity: recording
                ? 0.2 + (memo.level > i / 13 ? 0.8 : 0)
                : transcribing
                  ? 0.35
                  : 0.14,
            }}
          />
        ))}
      </span>

      {!memo.error && (
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          {recording ? "Take your time." : transcribing ? "One moment." : hint}
        </p>
      )}
    </div>
  );
}
