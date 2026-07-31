import { useRef, useState } from "react";
import { ArrowUp, Camera, Mic, Paperclip } from "lucide-react";

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
  placeholder = "Tell me anything that might help explain today…",
  label = "Share anything else",
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  /** True once a transcript lands, so we can invite a quick correction. */
  const [fromVoice, setFromVoice] = useState(false);
  /** The native-style picker sheet for the Camera action. */
  const [sheet, setSheet] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const scanInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const memo = useVoiceMemo((t) => {
    const clean = t.trim();
    if (!clean) return;
    setText((prev) => (prev ? `${prev} ${clean}` : clean));
    setFromVoice(true);
    setExpanded(true);
    window.setTimeout(() => {
      const el = textarea.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 60);
  });

  const recording = memo.state === "recording";
  const transcribing = memo.state === "transcribing";
  const hasContent = text.trim().length > 0 || files.length > 0;

  const send = () => {
    if (!hasContent) return;
    const parts = [text.trim(), ...files.map((n) => `Attached: ${n}`)].filter(Boolean);
    setText("");
    setFiles([]);
    setExpanded(false);
    setFromVoice(false);
    onSubmit(parts.join("\n"));
  };

  const pick = (list: FileList | null, mode?: "scan") => {
    if (!list?.length) return;
    setSheet(false);
    setFiles((prev) => [
      ...prev,
      ...Array.from(list).map((f) => (mode === "scan" ? `Scanned: ${f.name}` : f.name)),
    ]);
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
        {fromVoice ? "What Ciatta heard" : label}
      </p>

      <textarea
        ref={textarea}
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
        aria-label={fromVoice ? "Voice transcript — edit before sharing" : label}
        className="mt-1.5 w-full resize-none bg-transparent text-[14.5px] leading-relaxed outline-none transition-all duration-300 placeholder:text-fog"
      />

      {fromVoice && (
        <div className="animate-in fade-in flex items-center gap-3 duration-300">
          <p className="text-[12.5px] leading-snug text-muted-foreground">
            Edit anything that isn't quite right, then share.
          </p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => {
              setText("");
              setFromVoice(false);
              void memo.start();
            }}
            className="text-[12.5px] whitespace-nowrap text-muted-foreground underline underline-offset-4 transition-opacity active:opacity-60"
          >
            Re-record
          </button>
        </div>
      )}

      {files.length > 0 && (
        <p className="animate-in fade-in mt-2 text-[12.5px] text-muted-foreground duration-300">
          {files.join(", ")}
        </p>
      )}


      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <input
        ref={scanInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => pick(e.target.files, "scan")}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <input ref={fileInput} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          aria-label="Add a photo"
          onClick={() => setSheet(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
        >
          <Camera size={18} strokeWidth={1.6} />
        </button>


        <button
          type="button"
          aria-label="Attach a file"
          onClick={() => fileInput.current?.click()}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
        >
          <Paperclip size={18} strokeWidth={1.6} />
        </button>

        <span className="flex-1" />

        {hasContent ? (
          <button
            key="send"
            type="button"
            onClick={send}
            aria-label="Share this"
            className="animate-in fade-in flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground duration-300"
          >
            <ArrowUp size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <button
            key="voice"
            type="button"
            onClick={() => (recording ? void memo.stop() : void memo.start())}
            disabled={transcribing}
            aria-label={recording ? "Stop listening" : "Speak instead"}
            aria-pressed={recording}
            className="animate-in fade-in relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform duration-500 disabled:opacity-60"
            style={{ transform: recording ? `scale(${1 + memo.level * 0.06})` : "scale(1)" }}
          >
            {recording ? <Waveform level={memo.level} /> : <Mic size={18} strokeWidth={1.7} />}
          </button>
        )}
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
