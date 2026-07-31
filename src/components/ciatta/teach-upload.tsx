import { useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

import { useBack } from "@/lib/use-back";

import { useQuickAddEvents } from "@/lib/ciatta-store";

/** Downscale a photo so Ciatta can keep a visual memory without hoarding megabytes. */
async function makeThumbnail(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type TeachUploadProps = {
  /** "Photo" for camera captures, "Document" for attachments. */
  category: "Photo" | "Document";
  title: string;
  intro: string;
  /** Accept attribute for the file input. */
  accept: string;
  /** Opens the rear camera directly on phones. */
  useCamera?: boolean;
  emptyLabel: string;
  notePlaceholder: string;
  examples: string[];
};

export function TeachUpload({
  category,
  title,
  intro,
  accept,
  useCamera = false,
  emptyLabel,
  notePlaceholder,
  examples,
}: TeachUploadProps) {
  const router = useRouter();
  const { goBack } = useBack("/teach");
  const { addEvent } = useQuickAddEvents();
  const input = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const pick = async (chosen: File | undefined) => {
    if (!chosen) return;
    setFile(chosen);
    setPreview(chosen.type.startsWith("image/") ? await makeThumbnail(chosen) : null);
  };

  const save = () => {
    if (!file) return;
    const metadata: Record<string, string> = {
      File: file.name,
      Size: formatSize(file.size),
    };
    if (note.trim()) metadata.Note = note.trim();
    if (preview) metadata.Thumbnail = preview;

    addEvent({
      category,
      value: note.trim() || (category === "Photo" ? "Photo" : file.name),
      timestamp: new Date().toISOString(),
      metadata,
    });

    setSaved(true);
    window.setTimeout(() => router.navigate({ to: "/" }), 1100);
  };

  if (saved) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <span className="animate-breathe h-20 w-20 rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--color-accent),transparent_70%)]" />
        <h1 className="mt-8 font-serif text-[28px] leading-tight">Thank you.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Tomorrow's understanding just became a little clearer.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-6 pb-10 pt-8">
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

      <h1 className="mt-5 font-serif text-[30px] leading-tight">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{intro}</p>

      <input
        ref={input}
        type="file"
        accept={accept}
        {...(useCamera ? { capture: "environment" as const } : {})}
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => input.current?.click()}
        className="mt-7 flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-border bg-surface px-6 py-8 text-center transition-colors hover:border-accent"
      >
        {preview ? (
          <img
            src={preview}
            alt={`Preview of ${file?.name ?? "your upload"}`}
            className="max-h-40 rounded-2xl object-contain"
          />
        ) : file ? (
          <>
            <span className="font-serif text-[20px]">{file.name}</span>
            <span className="text-[13px] text-muted-foreground">
              {formatSize(file.size)} · tap to replace
            </span>
          </>
        ) : (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-[22px] leading-none text-accent">
              +
            </span>
            <span className="text-[15px] text-muted-foreground">{emptyLabel}</span>
          </>
        )}
      </button>

      {preview && file && (
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {file.name} · {formatSize(file.size)} · tap to replace
        </p>
      )}

      <label className="mt-7 block">
        <span className="label-caps">Add context</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={notePlaceholder}
          className="mt-3 w-full resize-none rounded-3xl border border-border bg-surface px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-fog focus:border-accent"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setNote(e)}
            className="rounded-full border border-border px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {e}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!file}
        className="mt-8 rounded-full bg-foreground py-4 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Share this
      </button>

    </div>
  );
}
