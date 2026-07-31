import { useCallback, useRef, useState } from "react";
import { accessToken } from "./session";

/**
 * Voice memo capture for Teach.
 *
 * We record raw PCM through the Web Audio API and encode a complete 16 kHz mono
 * WAV before upload. MediaRecorder chunks are headerless after the first slice
 * and iOS Safari records fragmented MP4, both of which transcription models
 * reject — a whole WAV always decodes.
 */

function downsample(chunks: Float32Array[], fromRate: number, toRate = 16000) {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  if (fromRate <= toRate) return merged;

  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(merged.length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(merged.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += merged[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export type VoiceMemoState = "idle" | "recording" | "transcribing";

export function useVoiceMemo(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceMemoState>("idle");
  const [error, setError] = useState<string | null>(null);
  /** Live 0-1 loudness, so the UI can breathe with her voice. */
  const [level, setLevel] = useState(0);

  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const node = useRef<ScriptProcessorNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcm = useRef<Float32Array[]>([]);

  const teardown = useCallback(() => {
    node.current?.disconnect();
    source.current?.disconnect();
    stream.current?.getTracks().forEach((t) => t.stop());
    void ctx.current?.close();
    node.current = null;
    source.current = null;
    stream.current = null;
    ctx.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setError("Ciatta needs microphone access to listen.");
      return;
    }

    const audioCtx = new AudioContext();
    ctx.current = audioCtx;
    source.current = audioCtx.createMediaStreamSource(stream.current);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    node.current = processor;
    pcm.current = [];

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      pcm.current.push(new Float32Array(input));
      let peak = 0;
      for (let i = 0; i < input.length; i += 64) peak = Math.max(peak, Math.abs(input[i]));
      setLevel(Math.min(1, peak * 3));
    };

    source.current.connect(processor);
    processor.connect(audioCtx.destination);
    setState("recording");
  }, []);

  const cancel = useCallback(() => {
    teardown();
    pcm.current = [];
    setState("idle");
  }, [teardown]);

  const stop = useCallback(async () => {
    const rate = ctx.current?.sampleRate ?? 48000;
    const chunks = pcm.current;
    teardown();
    pcm.current = [];

    const blob = encodeWav(downsample(chunks, rate), 16000);
    if (blob.size < 4096) {
      setState("idle");
      setError("That was too short to hear — hold and speak a little longer.");
      return;
    }

    setState("transcribing");
    try {
      const body = new FormData();
      body.append("audio", blob, "memo.wav");
      const token = await accessToken();
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(await res.text());

      // Stream the transcript in as it is recognised.
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No transcript stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              text?: string;
            };
            if (evt.type === "transcript.text.delta" && evt.delta) text += evt.delta;
            if (evt.type === "transcript.text.done" && evt.text) text = evt.text;
          } catch {
            /* partial frame — wait for the next chunk */
          }
        }
      }

      const transcript = text.trim();
      if (!transcript) {
        setError("Ciatta couldn't make that out. Try again?");
      } else {
        onTranscript(transcript);
      }
    } catch {
      setError("Ciatta couldn't transcribe that. Try again in a moment.");
    } finally {
      setState("idle");
    }
  }, [onTranscript, teardown]);

  return { state, level, error, start, stop, cancel, clearError: () => setError(null) };
}
