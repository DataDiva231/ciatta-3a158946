import { useState } from "react";
import { ImageIcon, Link2, Mic, Paperclip, Plus } from "lucide-react";

import { useVoiceMemo } from "@/lib/voice-memo";

/**
 * "Something else?" — the quiet secondary input on every Teach surface.
 *
 * It is never the primary way to answer: the suggestions above it are. This
 * exists only for what Ciatta didn't think to suggest, so it stays visually
 * light — one hairline field, one row of small affordances, one warm record
 * button.
 */
export function Composer({
  onSubmit,
  placeholder = "Describe it in your own words…",
  label = "Something else?",
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const memo = useVoiceMemo((t) => {
    const clean = t.trim();
    if (clean) onSubmit(clean);
  });

  const recording = memo.state === "recording";
  const transcribing = memo.state === "transcribing";

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    setText("");
    setExpanded(false);
    onSubmit(clean);
  };

  return (
    <div
      className={`rounded-[22px] bg-surface px-4 pt-3 pb-2.5 transition-all duration-300 ${
        expanded
          ? "shadow-[0_10px_30px_-24px_rgba(60,45,35,0.5)]"
          : "shadow-[0_8px_24px_-26px_rgba(60,45,35,0.4)]"
      }`}
    >
      <p
        className={`text-[13px] transition-colors duration-300 ${
          expanded ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>

      <textarea
        value={text}
        rows={expanded ? 4 : 1}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(text.trim().length > 0)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="mt-1.5 w-full resize-none bg-transparent text-[14.5px] leading-relaxed outline-none transition-all duration-300 placeholder:text-fog"
      />


      <div className="mt-3 flex items-center gap-1">
        {[
          { icon: Plus, label: "Add" },
          { icon: Link2, label: "Add a link" },
          { icon: ImageIcon, label: "Add a photo" },
        ].map(({ icon: Icon, label: l }) => (
          <button
            key={l}
            type="button"
            aria-label={l}
            onClick={send}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
          >
            <Icon size={18} strokeWidth={1.6} />
          </button>
        ))}

        <span className="flex-1" />

        <button
          type="button"
          aria-label="Attach a file"
          onClick={send}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
        >
          <Paperclip size={18} strokeWidth={1.6} />
        </button>

        <button
          type="button"
          onClick={() => (recording ? void memo.stop() : void memo.start())}
          disabled={transcribing}
          aria-label={recording ? "Stop listening" : "Speak instead"}
          aria-pressed={recording}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform duration-500 disabled:opacity-60"
          style={{ transform: recording ? `scale(${1 + memo.level * 0.06})` : "scale(1)" }}
        >
          {recording ? <Waveform level={memo.level} /> : <Mic size={18} strokeWidth={1.7} />}
        </button>
      </div>

      {(recording || transcribing || memo.error) && (
        <p className="animate-in fade-in mt-2 text-[12.5px] text-muted-foreground duration-300">
          {memo.error ?? (recording ? "Listening… tap to stop." : "Taking it in…")}
        </p>
      )}
    </div>
  );
}

/** The listening state, drawn as the quietest possible signal. */
function Waveform({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-[2px]">
      {[0.45, 0.8, 1, 0.7, 0.4].map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-accent-foreground transition-[height] duration-200"
          style={{ height: Math.max(4, h * (8 + level * 12)) }}
        />
      ))}
    </span>
  );
}
