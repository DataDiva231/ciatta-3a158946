import { createFileRoute } from "@tanstack/react-router";

/**
 * Voice memo transcription. The browser uploads a complete WAV; we forward it
 * to the Lovable AI gateway and stream the transcript straight back.
 */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return new Response("An audio file is required", { status: 400 });
        }
        if (audio.size > 20 * 1024 * 1024) {
          return new Response("That recording is too long to transcribe", { status: 413 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        upstream.append("file", audio, "memo.wav");
        upstream.append("stream", "true");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          console.error(`Transcription failed [${response.status}]: ${detail}`);
          return new Response(detail || "Transcription failed", { status: response.status });
        }

        return new Response(response.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
