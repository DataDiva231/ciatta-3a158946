import { createFileRoute } from "@tanstack/react-router";

import { requireUser } from "@/server/auth.server";

/**
 * Voice memo transcription. The browser uploads a complete WAV; we forward it
 * to OpenAI's transcription API and stream the transcript straight back.
 */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // A voice memo is personal health information: only a signed-in person
        // may send one, and the session is verified here, on the server.
        const userId = await requireUser(request);
        const { audit } = await import("@/server/security/audit.server");
        if (!userId) {
          await audit({ event: "transcription.request", outcome: "denied", request });
          return new Response("Unauthorized", { status: 401 });
        }

        const { guard, RateLimited } = await import("@/server/security/rate-limit.server");
        try {
          await guard("transcription", { userId, request });
        } catch (error) {
          if (error instanceof RateLimited) {
            return new Response(error.message, {
              status: 429,
              headers: { "Retry-After": String(error.retryAfterSeconds) },
            });
          }
          throw error;
        }

        const key = process.env["OPENAI_API_KEY"];
        if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

        const form = await request.formData();
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return new Response("An audio file is required", { status: 400 });
        }
        if (audio.size > 20 * 1024 * 1024) {
          return new Response("That recording is too long to transcribe", { status: 413 });
        }

        await audit({
          userId,
          event: "transcription.request",
          request,
          detail: { bytes: audio.size },
        });


        const upstream = new FormData();
        upstream.append("model", "gpt-4o-transcribe");
        upstream.append("file", audio, "memo.wav");
        upstream.append("stream", "true");

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
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
