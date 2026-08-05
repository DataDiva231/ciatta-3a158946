# Phase 3 Migration Plan

Engineering-level migration plan evolving the current codebase into `INTELLIGENCE_ARCHITECTURE.md` (frozen). Builds directly on `PHASE_3_MIGRATION_ANALYSIS.md`'s dependency graph — this document takes each node in that graph and specifies it as an actual, reviewable engineering change. No architecture decisions are made or revisited here. No code has been written against this plan.

Every migration below is scoped so the application is fully functional immediately after it ships, on its own, independent of whether the next one ever happens.

## Behavioral Equivalence

**Governing constraint for everything below:** migrating to the new architecture must not change what Ciatta actually understands, classifies, or says — unless a change is explicitly and separately approved as product work, not incidental to restructuring how the computation happens. Two consequences, applied consistently through every phase:

1. **Any step that replaces a computation** (a heuristic becoming a real Evidence-weighted formula, for instance) ships as a **shadow computation** first — the new path runs alongside the old one, computing and logging its answer without serving it, compared against the old path's real output across real historical data. It only becomes the live path once proven equivalent within tolerance. If it *can't* be made equivalent — because the new computation is, correctly, more accurate — that divergence is the product decision, made explicitly and separately, not a side effect of the migration.
2. **Any step that changes what a person actually sees** — a new belief appearing, a different layer becoming authoritative for the same screen — is **not** a migration step at all under this constraint. It's deferred product work, sequenced after the architecture underneath it is live and proven equivalent, requiring its own explicit approval before implementation.

This reclassifies two items from the original draft of this plan (C1, originally described as an expected-to-shift rewrite, and D1/D2, originally scheduled as automatic follow-on steps). Revised below; the rest of the plan was already compliant with this constraint and is unchanged.

---

## Phase A — Foundational, parallelizable, zero-to-minimal behavior change

### A1. Interpretation Ruleset v1 (seeded, read-only)

- **Reused:** the current threshold constants verbatim from `src/lib/intelligence/processors.ts` — e.g. cardiovascular's `bpm < 60` / `< 85` bands with `idealEvidence: 6, changeThreshold: 0.12`; recovery's HRV `< 25` / `< 55` bands with `idealEvidence: 8, changeThreshold: 0.15`; thermal's `0.05°C` drift threshold with `idealEvidence: 6, changeThreshold: 0.02`; the remaining domain processors' constants likewise. Only the values move; nothing about how they're used changes yet.
- **Changes:** new `interpretation_ruleset` table (architecture §2.3); one seed migration inserting these values as version 1. Generated *from* `processors.ts`'s constants (a small script reading the source file), not hand-transcribed, to eliminate copy error as a risk.
- **Stays untouched:** `processors.ts` itself — still reads its own local constants. Nothing reads the new table yet.
- **Tech debt removed:** none yet — this step creates the target, not a migration of a consumer.
- **Tests:** a migration test asserting the seeded row's values exactly match the source constants; a schema test for table shape and the `unique(version)` constraint.
- **User-visible behavior change:** none.
- **New capability unlocked:** "what are Ciatta's current thresholds" becomes a database query instead of "read two files and hope they agree" — the direct prerequisite for B1 and B4.

### A2. `observations.evidence_class` column + backfill

- **Reused:** the existing `observations` table and its `source` column values, used as the backfill heuristic.
- **Changes:** `ALTER TABLE observations ADD COLUMN evidence_class text` (nullable); a one-time backfill mapping existing `source` values to a class (`quick_add`/`check_in`/`teach`/`talk` → Self-Reported; `apple_health`/`oura`/`whoop`/`fitbit` → Raw Sensor; `onboarding` → Self-Reported). A small follow-up in the same PR: `use-engine.ts`'s `fromQuickAdd`/`fromCheckIns`/`fromOnboarding` start stamping the field on new writes going forward.
- **Stays untouched:** `recordObservations()`'s insert/dedup logic; every existing reader of `observations` — none currently filter on this column.
- **Tech debt removed:** none directly; prevents the column from being missing on new data going forward.
- **Tests:** backfill correctness test against a fixture set of known `source` values; a test confirming each existing write path stamps a non-null class after the change.
- **User-visible behavior change:** none.
- **New capability unlocked:** hard prerequisite for B4 (Evidence can't apply per-class trust weighting without this field existing).

### A3. Adaptation extraction — *recommended first milestone, detailed under "First Implementation Milestone" below*

- **Reused:** `curiosity.server.ts`'s `suggestionsFor()` and `followUpFor()`, `buildTeachSuggestions()`, and Today's existing focus-selection logic — moved verbatim, zero logic changes.
- **Changes:** new `src/server/engine/adaptation.server.ts` aggregating the server-side pieces behind one export surface and a shared `AdaptationDecision`-shaped interface; call sites (`pipeline.server.ts`, `teach.tsx`, `onboarding.tsx`) updated to the new import path only. Onboarding's branching logic explicitly stays client-side in this step — flagged in the migration analysis as an open sub-decision, not resolved here.
- **Stays untouched:** every call site's actual usage — arguments in, return value out, unchanged.
- **Tech debt removed:** the "three separate, unrelated implementations of 'what should Ciatta ask next'" fragmentation named directly in `INTELLIGENCE_ARCHITECTURE.md` §6.
- **Tests:** golden-output tests — fixed `Understanding` fixtures, asserting `adaptation.server.ts`'s new exports return byte-identical output to the old `curiosity.server.ts` exports before the old ones are removed.
- **User-visible behavior change:** none, by design and by test.
- **New capability unlocked:** Adaptation becomes real code, not just a documented concept — the next new adaptive decision has one obvious home instead of a fourth scattered implementation.

### A4. Database-level Observation idempotency

- **Reused:** the existing `context.externalId` values already being written.
- **Changes:** add a real `external_id` column (backfilled from `context->>externalId`) with `unique(subject_id, source, external_id)`; `recordObservations()`'s dedup check changes from a JSONB `select` + application-level `Set` to `insert ... on conflict do nothing`.
- **Stays untouched:** the external `ObservationInput` shape callers pass in; `context`'s other enrichment fields.
- **Tech debt removed:** the race-condition-prone application-level dedup, named in the architecture's Future Simplifications section.
- **Tests:** a concurrency test firing two simultaneous inserts with the same `externalId` — asserts exactly one row lands, which would have failed under the old mechanism.
- **User-visible behavior change:** none.
- **New capability unlocked:** safe to increase write concurrency later (B2 makes this materially more likely to matter) without a duplicate-row risk.

---

## Phase B — Depends on Phase A, mostly parallelizable

### B1. Client Immediate Understanding reads the Ruleset

- **Reused:** all of `src/lib/evidence/pipeline.ts` and `processors.ts`'s actual fusion/banding arithmetic — only the constant *source* changes.
- **Changes:** new client module (e.g. `src/lib/ruleset/`) fetching the current Ruleset version, caching it locally (so Immediate Understanding keeps working fully offline), exposed in the shape `processors.ts` already expects; hardcoded numbers replaced with reads from this module.
- **Stays untouched:** the math itself — band comparisons, weighted confidence formulas.
- **Tech debt removed:** the core motivation named in the architecture — "the client should never independently redefine what the server already knows." This is the step that actually closes it.
- **Tests:** byte-identical-output test for a fixed input, before vs. after (valid since A1 seeded the Ruleset verbatim from these same constants); an offline test confirming correct operation with no network, using the last cached version.
- **User-visible behavior change:** none — proven by the identical-output test.
- **New capability unlocked:** a future Ruleset version change can now actually reach the client, which was structurally impossible before this step.

### B2. Observation Outbox

- **Reused:** `ciatta-store.ts`'s existing `SYNC_EVENT` debounce/notify pattern as the flush trigger; the existing `use-engine.ts` batch-sync path, kept running unchanged as the safety net during transition.
- **Changes:** new local queue module; every Observation-producing write (quick-add, check-in, onboarding answer, Talk message) also pushes into it alongside its existing local write; a debounced, connectivity-aware background flush sends queued items to a new lightweight ingestion endpoint immediately, rather than waiting for the next `syncEngine()` page-load trigger.
- **Stays untouched:** existing local stores and every screen reading from them — this adds a write path, it doesn't replace local storage.
- **Tech debt removed:** sets up the removal of the "local-store-then-lossy-translate-at-sync-time" indirection — the actual removal of the old batch path is a later, separate step, once the Outbox has proven reliable in production.
- **Tests:** offline-then-reconnect test (queue while offline, confirm correct flush on reconnect, confirm no duplicates given A4); dual-write consistency test (Outbox path and batch path must produce the same eventual rows while both run simultaneously).
- **User-visible behavior change:** Observations reach the server faster; no UI changes in this step itself.
- **New capability unlocked:** the shared infrastructure B3 and C2 both build on.

### B3. `user_memory` table + sync

- **Reused:** B2's Outbox, applied to a new destination; existing `profile-store.ts`/`ciatta-store.ts` read/write functions — call sites unchanged.
- **Changes:** new `user_memory` table (architecture §2.2); identity/settings/priorities/lifecycle-flag writes route through the Outbox to it, in addition to their existing local write; a one-time backfill push for existing users' current local state.
- **Stays untouched:** every screen reading identity/settings/priorities — local storage remains the fast-read source for rendering; the server copy is a durability mirror.
- **Tech debt removed:** "identity/settings/priorities exist only in localStorage, invisible to the server" — named directly in the architecture's simplification table.
- **Tests:** backfill idempotency (running it twice doesn't duplicate or corrupt); a reinstall-simulation test (clear local storage, confirm fresh hydration from `user_memory`).
- **User-visible behavior change:** none day-to-day; the real payoff is specifically surviving a reinstall — worth a manual QA pass confirming that actually works, since it's the entire point.
- **New capability unlocked:** the first tangible fix for "Ciatta forgets me if I reinstall," for the identity/preference slice.

### B4. Server Persistent Evidence module

- **Reused:** the confidence-weighting pattern already proven in `src/lib/evidence/pipeline.ts` (source quality, temporal continuity, sensor agreement, coverage, completeness) — ported, not reinvented; `observations.server.ts`'s existing `listObservations`/`within` helpers.
- **Changes:** new `src/server/engine/evidence.server.ts`, inserted into `pipeline.server.ts` between Observation and Memory/Belief-revision; computes confidence-scored Evidence per domain, reading band/weight definitions from the Ruleset (A1).
- **Stays untouched:** `understanding.server.ts`'s `synthesise()` — not yet wired to consume this (that's C1); ships and is verifiable in isolation (e.g. via a diagnostic-only read path) before anything depends on it.
- **Tech debt removed:** none directly yet — net-new capability; the removal (raw-heuristic `resolveState`/`resolveDepth`) happens in C1.
- **Tests:** unit tests against fixture Observation sets with known expected confidence outputs; a parity-of-intent comparison against the client Evidence module's output shape, to catch semantic drift between the two implementations early rather than after both have shipped independently.
- **User-visible behavior change:** none — nothing reads this yet.
- **New capability unlocked:** the direct, hard prerequisite for C1 — the single most consequential piece of new infrastructure in this plan, inert and risk-free until wired in.

---

## Phase C — Depends on Phase B

### C1. Persistent Understanding consumes real Evidence — as a shadow computation

Revised under the Behavioral Equivalence constraint. Originally scoped as a direct rewrite with expected drift; that's no longer acceptable as a migration step.

- **Reused:** `understanding.server.ts`'s overall shape and `synthesise()`'s call signature; `beliefs.server.ts`'s RULES and revision formula, entirely unchanged; the *existing* `resolveState()`/`resolveDepth()` heuristics — kept live and serving real traffic throughout this step, not replaced yet.
- **Changes:** B4's Evidence-based computation is wired in as a **parallel, non-serving path** — for every `synthesise()` call, both the existing heuristic and the new Evidence-based logic compute an answer; only the existing heuristic's answer is returned to the caller. The new path's output is logged (state, depth, and the qualitative label each would produce) for comparison, not shown to anyone.
- **Stays untouched:** everything a user or any other stage actually sees — `pipeline.server.ts`'s return value is unchanged, because the shadow path's output is never returned.
- **Tech debt removed:** none yet, deliberately — removing the heuristic is the *next* step, gated on proof, not this one.
- **Tests:** an offline comparison harness run against real historical observation history — for each account, does the shadow path's qualitative output (recover/steady/strong; the depth band that drives copy thresholds) match what the live heuristic actually produced at that point in time, within a stated tolerance? This is the actual gate, not a human spot-check.
- **User-visible behavior change:** **none.** The shadow path never serves a response.
- **New capability unlocked:** real evidence for whether Evidence-based Understanding is behaviorally equivalent to today's heuristic. Two honest outcomes once the comparison data is in, and this step doesn't presuppose which one:
  - **Equivalent within tolerance** → a follow-up step (not detailed here, since it's now just an engineering cutover with a proven-safe basis) promotes the shadow path to live, and the old heuristic is finally removed as tech debt.
  - **Not equivalent** → the divergence is the actual finding. Whether to accept it — because the new computation is more accurate and the old one was simply wrong — becomes a separate, explicit product decision, made with real comparison data in hand, not guessed at in advance.

### C2. BLE → server Observation bridging

- **Reused:** the existing local BLE `sessions/` module's own knowledge of when a wear session ends; B2's Outbox as transport.
- **Changes:** at session end, a summary (not per-packet data) is pushed through the Outbox as one or more Observations, classified Raw Sensor (A2), tagged to the session.
- **Stays untouched:** the entire live BLE pipeline's real-time behavior — Immediate Understanding keeps working exactly as today during an active session; this only adds a post-session summary push.
- **Tech debt removed:** "the BLE pipeline's local Observations never reach the server table at all" — the single biggest source-integration gap named in the migration analysis.
- **Tests:** an end-to-end test connecting a simulated Arc session, ending it, confirming a correctly-shaped, correctly-classified Observation lands server-side; a volume sanity check confirming summary-only (not per-packet) behavior over a long simulated session.
- **User-visible behavior change:** none — the data lands server-side; nothing yet interprets it into anything a person sees (see "New belief RULES for sensor-derived domains" under Deferred Product Decisions below).
- **New capability unlocked:** makes the deferred sensor-domain belief work possible for the first time — there's no sensor data server-side to write a belief rule about before this step.

---

## Phase D — Depends on Phase C (architecture-only)

D1 and D2 from the original draft of this plan are no longer here — see "Deferred Product Decisions" below. Both change what a person actually sees or what Ciatta actually believes, which the Behavioral Equivalence constraint excludes from the migration itself. Phase D's only remaining item is purely structural.

### D3. Narrative re-pointed to the Living Health Model

- **Reused:** `narrative.server.ts`'s existing pure functions (`standingLine`, `headlineFor`, `evidenceFor`) almost entirely unchanged internally — smallest-logic-change step in Phase D.
- **Changes:** call sites shift from calling these directly with inline `Understanding` to calling them against the now-complete Living Health Model — a call-site change only. `narrative.server.ts`'s functions themselves consume no new fields they didn't already read; `user_memory` context becoming available doesn't mean these functions start using it in this step.
- **Stays untouched:** the actual copy/wording logic entirely.
- **Tech debt removed:** minor — makes the architecture's description of Narrative literally accurate in the call graph, not just aspirationally true.
- **Tests:** output-parity tests — same input data, same output text, before and after.
- **User-visible behavior change:** none, by design and by test.
- **New capability unlocked:** none directly new — a consistency step that sets up future narrative work (including the deferred items below) on solid ground.

---

## Deferred Product Decisions (Post-Migration)

Not part of this migration. Each of these changes what a person actually sees or what Ciatta actually believes — excluded from the migration itself by the Behavioral Equivalence constraint, regardless of how directly the frozen architecture motivates them. Each requires its own explicit, separate approval before implementation, sequenced only after the architecture underneath it (Phase A–D) is live and proven equivalent. Kept here, specified, so they aren't lost — not scheduled.

### Cut over C1's shadow computation to live

Once C1's comparison harness shows the Evidence-based computation is either equivalent to the current heuristic (a safe, low-drama cutover — the old heuristic is retired as tech debt, nothing else changes) or meaningfully more accurate (a real product decision: is the improved accuracy worth the specific behavior shift it causes for the affected accounts, decided with real comparison data in hand rather than guessed at now).

### `today.tsx` re-scoped — Immediate Understanding narrowed to present-moment-only

The frozen architecture's authority rule (§1.5) isn't fully enforced in the UI until this ships — `today.tsx` still lets Immediate Understanding win the headline when `today.state === "ready"`. This is a real, direct, user-visible change for engaged Arc wearers (Today's headline stops reflecting live sensor state the instant it's confident) and needs its own product review of the resulting "live" treatment specifically, not just an architecture sign-off. Sequenced after C1's cutover, not before — narrowing Immediate's authority before Persistent Understanding is proven as good would be a straightforward regression, not an improvement.

### New belief RULES for sensor-derived domains

Genuinely new capability, not a refactor — the first time a heart-rate pattern observed via Arc could become part of the durable, account-level "what Ciatta believes." Real, desirable, and exactly what the architecture is for — but it's Ciatta starting to interpret a category of signal it doesn't interpret today, which is a product change by definition. Sequenced after C2 (BLE data reaching `observations` at all) and ideally after C1's cutover, so new beliefs are built on the accuracy-proven Evidence stage rather than the shadow one.

---

## Phase E — Separately gated, last by design

### E1. Verified Communication Layer + Talk LLM

- **Reused:** Phase 2 (2.5)'s grounded-scripted `replyTo()`, kept as the explicit fallback for verification failures and model-unavailability; the unified Observation-writing path from Talk (Phase 2, 2.1), solidified by B2.
- **Changes:** the largest net-new build in this plan — LLM provider integration, structured Understanding Package retrieval, citation-tagged generation, deterministic verification (architecture §5.1–§5.2). Not detailed further here — explicitly gated by its own cost/provider/safety/compliance sign-off per the frozen architecture's §7/§8, unchanged.
- **Stays untouched:** everything upstream — a pure consumer of the Living Health Model.
- **Tech debt removed:** the last item in the whole plan — "Talk is honest but not generative."
- **Tests:** adversarial tests targeting verification specifically (attempt to elicit uncited claims, confirm stripping); fallback tests (simulate model failure, confirm graceful degradation to the scripted response, never a broken partial reply).
- **User-visible behavior change:** yes, substantially — Talk becomes genuinely generative, bounded to only ever state what the Living Health Model actually supports.
- **New capability unlocked:** the full realization of Principle 5 — Talk as Ciatta's voice, not a chat product bolted on.

---

## First Implementation Milestone

**Recommendation: A3, Adaptation extraction.**

Reasoning, against the same bar every item above was held to:

- **Zero dependencies.** Every other Phase A item either produces inert new infrastructure (A1, A2) or fixes a narrow, self-contained correctness issue (A4). A3 is the only one that's both fully self-contained *and* delivers an immediately real piece of the architecture — Adaptation stops being a documented concept and becomes actual, callable code.
- **Lowest possible risk category.** It's a pure extraction of already-working, already-in-production logic behind a stable interface, with no new schema, no new data flow, and no new infrastructure decisions required first. The golden-output tests described above are the entire safety net, and they're straightforward to write against the current code today.
- **Builds momentum before the harder decisions.** Every subsequent phase involves real schema design (A1, B3, B4), a new transport mechanism (B2), or a shadow-computation discipline that has to be gotten right the first time it's used (C1). Proving the "extract behind a stable interface, verify with golden-output tests, ship with zero behavior change" pattern once, cheaply, here, is worth doing before relying on the same discipline for higher-stakes steps.
- **Trivially satisfies Behavioral Equivalence.** Unlike C1 (which needs a real shadow-mode harness to prove equivalence) or the deferred product decisions (which are excluded from this plan entirely), A3 is behavior-preserving by construction — a pure extraction with golden-output tests as direct proof, not an inference.

Not writing any code yet. Waiting for approval on A3 before starting.
