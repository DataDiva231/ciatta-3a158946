/**
 * API Layer — the only door between the screens and the Intelligence Engine.
 *
 * Thin by design: declarations and imports only, so every helper lives in a
 * server module. Screens call `syncEngine` (an interaction happened) and render
 * whatever comes back. `engineTrace` exposes the reasoning chain for review.
 */
import { createServerFn } from "@tanstack/react-start";

import type { EngineViews, ObservationInput } from "./engine-types";
import type { EngineDebugView } from "./evidence-types";

export const syncEngine = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      deviceKey: string;
      observations?: ObservationInput[];
      identity?: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data }): Promise<EngineViews> => {
    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    const { buildViews } = await import("@/server/engine/views.server");
    const result = await runLearningLoop(
      data.deviceKey,
      data.observations ?? [],
      data.identity ?? {},
    );
    return buildViews(result.subjectId, result.understanding, result.observations);
  });

export const engineTrace = createServerFn({ method: "POST" })
  .inputValidator((input: { deviceKey: string }) => input)
  .handler(async ({ data }): Promise<EngineDebugView> => {
    const { runLearningLoop } = await import("@/server/engine/pipeline.server");
    const { buildDebugView } = await import("@/server/engine/debug.server");
    const result = await runLearningLoop(data.deviceKey);
    return buildDebugView(result.subjectId, result.understanding, result.observations);
  });

export const forgetEverything = createServerFn({ method: "POST" })
  .inputValidator((input: { deviceKey: string }) => input)
  .handler(async ({ data }) => {
    const { forgetSubject } = await import("@/server/engine/identity.server");
    await forgetSubject(data.deviceKey);
    return { ok: true };
  });
