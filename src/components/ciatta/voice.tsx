import { Understanding } from "@/components/ciatta/understanding";
import { useVoiceMemo } from "@/lib/voice-memo";

/**
 * The voice interaction. One calm presence, reused wherever Ciatta listens.
 * Not a microphone button — the Understanding itself opens up and takes in
 * what you say.
 */
export function VoiceTeach({
  onTranscript,
  prompt = "Speak, and Ciatta listens",
  hint = "Tap to begin. Tap again when you're done.",
  confidence = 55,
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
      ? "Ciatta is listening"
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
        className="relative grid place-items-center rounded-full transition-transform duration-500 disabled:opacity-60"
        style={{
          transform: recording ? `scale(${1 + memo.level * 0.06})` : "scale(1)",
        }}
      >
        {/* The listening ring answers the voice, gently. */}
        <span
          aria-hidden="true"
          className="absolute rounded-full transition-all duration-300"
          style={{
            width: 150,
            height: 150,
            boxShadow: recording
              ? `0 0 0 ${2 + memo.level * 16}px color-mix(in oklab, var(--clay) 9%, transparent)`
              : "none",
          }}
        />
        <Understanding size="lg" confidence={confidence} active={recording} />
      </button>

      <p className="mt-7 font-serif text-[22px] leading-[1.25] tracking-[-0.01em]">
        {label}
      </p>
      {!memo.error && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {recording ? "Take your time." : transcribing ? "One moment." : hint}
        </p>
      )}
    </div>
  );
}
