# Architecture Migration Log

The engineering history of introducing `INTELLIGENCE_ARCHITECTURE.md` (frozen) into the existing Ciatta codebase, one milestone at a time. Each entry is written after its milestone is complete and approved — this is a record of what happened, not a plan (see `PHASE_3_MIGRATION_PLAN.md` for what's still ahead).

---

## Milestone A3 — Adaptation extraction

**Objective.** Give the Adaptation stage a real, findable home in the codebase without changing any of its logic — the first proof that "extract behind a stable interface, verify equivalence, ship with zero behavior change" works as a migration pattern before relying on it for riskier steps.

**Architectural concepts strengthened.** Adaptation — went from a documented concept with no corresponding code to two real, named modules (server and client halves) a new engineer can actually find.

**Files added.**
- `src/server/engine/adaptation.server.ts` — new home for `suggestionsFor()`/`followUpFor()` (moved verbatim), plus a re-export of `generateGuidance`/`GuidanceResult` from the Guidance Engine.

**Files removed.**
- `src/server/engine/curiosity.server.ts` — fully superseded, single caller updated, safe to delete.

**Files modified.**
- `src/server/engine/views.server.ts` — import path updated to pull `followUpFor`/`generateGuidance`/`suggestionsFor` from the new `adaptation.server.ts` instead of `curiosity.server.ts` + a direct `guidance.server.ts` import.
- `src/routes/_authenticated/teach.tsx` — import path updated to `@/lib/adaptation` instead of `@/lib/teach-suggestions`.
- `src/lib/teach-suggestions.ts` → renamed to `src/lib/adaptation.ts` (tracked as a rename by git); header comment updated to name it as the client-side Adaptation counterpart and cross-reference the server module. No logic changed.

**Files deliberately left untouched.**
- `src/server/guidance/guidance.server.ts` and its dependencies (`src/server/evidence/evidence.server.ts`, `library.server.ts`, `src/server/engine/uncertainty.server.ts`) — the Guidance Engine's internals were not moved or touched. Only a re-export was added at its existing location.
- `src/server/engine/debug.server.ts` — still imports `generateGuidance` directly from `guidance.server.ts`. That import path never stopped working, so there was no need to touch a diagnostics file to make this milestone land.
- `src/lib/onboarding-flow.ts` — its adaptive branching logic stays client-side and untouched, per the migration plan's explicit scoping for A3.

**Behavioral changes.** None. Verified, not assumed.

**Verification performed.**
1. Direct diff confirming the relocated `suggestionsFor()`/`followUpFor()` function bodies are character-for-character identical to their originals before deletion.
2. `tsc --noEmit` clean across the whole project after every change.
3. A live, authenticated pass through `/today` and `/teach` against a real running dev server with a real Supabase-backed test account — chosen specifically because it exercises the entire changed chain in one request (client rename, server move, and the Guidance Engine re-export all at once). Zero console errors, zero 5xx responses, Teach's suggestion chips and prompt text rendered exactly as expected.

No committed test suite exists in this repo — noted as a real gap, not silently worked around. Verification here relied on direct comparison and live smoke-testing instead.

**Technical debt removed.** The "three separate, unrelated implementations of 'what should Ciatta ask next'" fragmentation named directly in `INTELLIGENCE_ARCHITECTURE.md` §6 — client and server Curiosity are now one findable pair instead of scattered, unlabeled files.

**Lessons learned.**
- No test framework exists in this codebase. Every future milestone needs to plan its own verification method explicitly (diff, shadow execution, live smoke test) rather than assuming a `npm test` exists to lean on. Worth its own future decision — not bundled into this milestone, since introducing test infrastructure is itself a real scope decision, not a free side effect of an unrelated migration.
- Reading a file fully before moving it paid off directly: the migration plan described "Today's focus-selection logic" as something to extract into Adaptation, without knowing it was actually a full subsystem (the Guidance Engine) with its own evidence-matching and uncertainty-profiling pipeline. Discovering that changed the safe scope of this milestone mid-implementation.

**Architectural decisions made during implementation.**
- **Re-export instead of relocate, for the Guidance Engine specifically.** The migration plan's language ("aggregating the server-side pieces") was ambiguous between a physical move and a re-export. Chose re-export: it satisfies the architectural goal (one named entry point) without the risk of relocating a subsystem with a real safety charter ("the only layer allowed to recommend") that hadn't been fully audited as part of this milestone. Flagged explicitly rather than decided silently.
- **Preserved the existing Curiosity/Guidance distinction rather than flattening it.** The original codebase had already drawn a deliberate line between "asking" (Curiosity) and "recommending" (Guidance). Unifying both under one Adaptation module's entry point does not mean merging their logic or blurring that boundary — the new module's docstring states this explicitly, so the distinction survives in the code, not just in institutional memory.
- **Did not introduce a shared `AdaptationDecision` type across `suggestionsFor`/`followUpFor`/`generateGuidance`.** Their return shapes don't naturally unify, and forcing one would have been exactly the kind of unnecessary abstraction the project has consistently avoided. The shared concept is the module and the doc comment, not a forced shared interface.

---
