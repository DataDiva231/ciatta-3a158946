import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type CaptureMode = "photo" | "scan" | "library";

const MODES: { id: CaptureMode; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "scan", label: "Scan" },
  { id: "library", label: "Library" },
];

/**
 * A full-screen, Stories-style capture surface.
 *
 * It opens straight into the live viewfinder — no intermediate sheet — with the
 * three modes sitting on a horizontally swipeable rail along the bottom. Photo
 * captures the frame as-is; Scan runs a light edge pass and crops to the page;
 * Library hands off to the system picker.
 */
export function CameraCapture({
  onCapture,
  onClose,
  initialMode = "photo",
  count = 0,
}: {
  onCapture: (result: { name: string; mode: CaptureMode }) => void;
  onClose: () => void;
  initialMode?: CaptureMode;
  /** How many attachments are already waiting in the composer. */
  count?: number;
}) {
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const library = useRef<HTMLInputElement>(null);
  const railTouchX = useRef<number | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!cancelled) setError("Camera isn't available here.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const close = () => {
    stop();
    onClose();
  };

  const shoot = () => {
    const el = video.current;
    if (!el || !el.videoWidth) {
      // No live feed (desktop / denied permission) — fall back to the picker.
      library.current?.click();
      return;
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(el, 0, 0);
      if (mode === "scan") cropToDocument(canvas, ctx);
    }
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
    onCapture({
      name: mode === "scan" ? `Scanned document ${stamp}` : `Photo ${stamp}`,
      mode,
    });
  };

  const choose = (m: CaptureMode) => {
    setMode(m);
    if (m === "library") library.current?.click();
  };

  const swipe = (dir: 1 | -1) => {
    const i = MODES.findIndex((m) => m.id === mode);
    const next = MODES[Math.min(MODES.length - 1, Math.max(0, i + dir))];
    if (next && next.id !== mode) choose(next.id);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[60] flex flex-col bg-black duration-200">
      <video
        ref={video}
        playsInline
        muted
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />

      {mode === "scan" && ready && (
        <div
          aria-hidden="true"
          className="animate-in fade-in pointer-events-none absolute inset-0 flex items-center justify-center duration-300"
        >
          <div className="h-[58%] w-[78%] rounded-[10px] border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
        </div>
      )}

      {flash && <div aria-hidden="true" className="absolute inset-0 bg-white/85" />}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center px-10 text-center">
          <p className="text-[14px] leading-relaxed text-white/70">
            {error ?? "Opening the camera…"}
          </p>
        </div>
      )}

      <div className="relative flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Close camera"
          onClick={close}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-opacity active:opacity-60"
        >
          <X size={20} strokeWidth={1.7} />
        </button>
        <p className="text-[13px] tracking-[0.02em] text-white/80">
          {count > 0
            ? `${count} added — keep going`
            : mode === "scan"
              ? "Fit the page in the frame"
              : "Show me something"}
        </p>
        {count > 0 ? (
          <button
            type="button"
            onClick={close}
            className="animate-in fade-in h-10 rounded-full bg-white/90 px-4 text-[13px] font-medium text-black backdrop-blur-md transition-opacity duration-300 active:opacity-70"
          >
            Done
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>

      <span className="flex-1" />

      <div
        className="relative pb-[max(18px,env(safe-area-inset-bottom))]"
        onTouchStart={(e) => {
          railTouchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const from = railTouchX.current;
          const to = e.changedTouches[0]?.clientX;
          railTouchX.current = null;
          if (from == null || to == null) return;
          if (Math.abs(to - from) > 40) swipe(to < from ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={mode === "library" ? () => library.current?.click() : shoot}
            aria-label={
              mode === "scan" ? "Scan document" : mode === "library" ? "Open library" : "Take photo"
            }
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-white/90 transition-transform duration-200 active:scale-95"
          >
            <span
              className={`rounded-full bg-white transition-all duration-300 ${
                mode === "scan" ? "h-[54px] w-[54px] rounded-[14px]" : "h-[58px] w-[58px]"
              }`}
            />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Capture mode"
          className="mt-4 flex items-center justify-center gap-1 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => choose(m.id)}
              className={`rounded-full px-4 py-2 text-[13px] whitespace-nowrap transition-all duration-300 ${
                mode === m.id
                  ? "bg-white/15 font-medium text-white backdrop-blur-md"
                  : "text-white/55"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={library}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const list = e.target.files;
          if (!list?.length) {
            setMode("photo");
            return;
          }
          stop();
          Array.from(list).forEach((f) => onCapture({ name: f.name, mode: "library" }));
        }}
      />
    </div>
  );
}

/**
 * A light document pass: find the brightest contiguous region (the page) and
 * crop the canvas to it, mimicking native edge detection closely enough to feel
 * automatic without shipping a vision dependency.
 */
function cropToDocument(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const { width, height } = canvas;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 240));
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return;
  }
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      if (lum < 150) continue;
      found = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (!found || w < width * 0.2 || h < height * 0.2) return;
  const pad = Math.round(Math.min(w, h) * 0.02);
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width - sx, w + pad * 2);
  const sh = Math.min(height - sy, h + pad * 2);
  const frame = ctx.getImageData(sx, sy, sw, sh);
  canvas.width = sw;
  canvas.height = sh;
  ctx.putImageData(frame, 0, 0);
}
