# Phase 3 Migration Gap Analysis

Compares the current Ciatta codebase against the frozen `INTELLIGENCE_ARCHITECTURE.md`, stage by stage. This is an analysis document, not an implementation plan — no code changes here. Every migration step described below is designed to leave the app in a working state on its own; none require a big-bang cutover.

---

## Observation

**Current implementation.** `observations` (Postgres) already exists with almost the right shape — `subject_id`, `occurred_at`, `source`, `category`, `value`, `context: jsonb`, `confidence`. But it's reached inconsistently:
- Quick-add events, check-ins, onboarding answers, and Talk messages exist only in `localStorage` and reach `observations` through a **batch translation** (`use-engine.ts`'s `fromQuickAdd`/`fromCheckIns`/`fromOnboarding`), sent only when `syncEngine()` runs (triggered by page loads via `useEngine()`), not immediately on write.
- Oura, WHOOP, and Fitbit already have the *closest existing thing* to a proper source adapter — real OAuth token exchange, a generic `createOAuthProvider()` dataset-to-Observation mapper, and a scheduled sync endpoint (`/api/public/health/sync.ts`). This is a real, working alignment worth recognizing, not just a gap.
- Apple Health is push-based (the device pushes samples; `apple-health.server.ts` maps them) — structurally closer to "immediate" than the quick-add/check-in path, though not going through the same mapper as the OAuth sources.
- The Arc/BLE pipeline's own internal "Observation" concept (`src/lib/observations/`) is **entirely separate and local-only** — it never reaches the server `observations` table at all today. This is a distinct concept from the server's `observations`, despite the name collision.
- No epistemic classification exists in any form — no column, no concept.

**Desired implementation.** Every source writes Observations immediately (via a local Outbox for offline resilience), each carrying one of the five epistemic classes (§1.4 of the architecture).

**Gap.**
1. No immediate-write path for local sources — only batch/pull, triggered by navigation.
2. No epistemic classification column or values anywhere.
3. The BLE pipeline's local Observations never reach the server table.
4. Quick-add/check-in/onboarding/Talk go through a lossy translation step rather than a direct adapter.

**Recommended migration strategy** (each sub-step independently shippable):
1. Add an `evidence_class` column to `observations`, nullable initially; backfill existing rows by a simple heuristic from `source` (quick_add/check_in/teach → Self-Reported, apple_health/oura/whoop/fitbit → Raw Sensor, onboarding → Self-Reported). Zero behavior change — purely additive.
2. Build the Outbox as a new local queue that write-throughs immediately for new writes going forward, running **alongside** the existing batch-sync path, not replacing it — the old path is the safety net during the transition. Remove the batch path only once the Outbox has proven reliable.
3. Migrate the Oura/WHOOP/Fitbit adapter to also stamp `evidence_class` — smallest possible lift, since the adapter pattern already exists; good first real-world validation of the classification model.
4. BLE → server bridging (session-end summaries, not per-packet streaming) is its own, later, higher-risk step — sequenced after the Outbox exists, described further in the dependency graph below.

**Complexity:** Medium. Mostly additive; the real risk is in the dual-write transition period, not the schema change itself.

**Risks:** the Outbox introduces a new local-queue failure mode that needs the same honest-failure treatment established in Phase 1 (1.7) — a stuck queue must never fail silently. Backfilling `evidence_class` on months of existing rows needs a safe, reversible script. BLE bridging touches a code path that doesn't exist today at all and deserves its own focused design pass when its turn comes, not a quick flag-flip.

---

## Evidence

**Current implementation.** This is the largest structural gap in the whole system. **A distinct Persistent Evidence stage does not exist server-side at all.** `understanding.server.ts`'s `synthesise()` operates directly on raw `Observation[]` with simple heuristics — `resolveState()` checks yesterday's raw values by category/value match, `resolveDepth()` is a hand-tuned formula over category breadth, recency count, held-belief count, and days-known. There's no confidence-weighted fusion of multiple observations into a scored Evidence object the way the architecture describes.

Client-side (Immediate), the equivalent **does** exist and is genuinely well-built: `src/lib/evidence/` computes real multi-factor confidence (source quality, temporal continuity via gap-variance, sensor agreement via coefficient-of-variation, time coverage, completeness), with named weights. This is real math, already working — it's Persistent Evidence that's missing, not Evidence as a concept.

Also relevant: `context.server.ts` already provides real contextual enrichment (cycle phase/day, life stage, recent sleep/activity, time of day) stamped onto every observation — useful existing infrastructure, though it's enrichment, not confidence-weighted fusion, and doesn't map cleanly onto any single one of the seven requested stages on its own.

No Interpretation Ruleset exists in any form yet, client or server — the client's thresholds are hardcoded directly in `intelligence/processors.ts`/`evidence/pipeline.ts`.

**Desired implementation.** Both Immediate and Persistent Evidence exist as real, confidence-weighted fusion stages, both reading from the same Interpretation Ruleset.

**Gap.** Persistent Evidence doesn't exist as a concept. The Interpretation Ruleset doesn't exist in any form.

**Recommended migration strategy:**
1. Build the Interpretation Ruleset table, seeded **verbatim** with the current client-side threshold values extracted from `intelligence/processors.ts` — day one is behaviorally identical to today, just sourced from one place. Read-only at first (no write path needed until personalization, §4, is real).
2. Point the client's Immediate Evidence/Understanding at the Ruleset (fetch, cache, version-check) instead of its hardcoded constants — low risk, since the values don't change, only where they come from. This is the first real proof the mechanism works.
3. Build a real Persistent Evidence module server-side (e.g. `evidence.server.ts`), inserted into `pipeline.server.ts` between Observation and Understanding, **porting** the confidence-fusion patterns already proven client-side rather than inventing new math — this is the single largest genuinely-new build in this entire migration.
4. Only after that, refactor `understanding.server.ts`'s `resolveState`/`resolveDepth` to consume real Evidence objects instead of reading raw Observations directly.

**Complexity:** High. Steps 1–2 are low-risk and mechanical; steps 3–4 are genuinely new server-side logic and the biggest single item in this whole analysis.

**Risks:** replacing heuristic depth/state resolution with real Evidence-weighted computation will change the actual numbers, even though the raw depth value is never shown (it's explicitly "internal only" per the existing code comment) — but the *qualitative state labels and copy thresholds* derived from it are user-visible, so this needs a real before/after comparison against existing accounts, not an assumption that internal-only means invisible.

---

## Immediate Understanding

**Current implementation.** `src/lib/intelligence/` (threshold-banding into domain status via `processors.ts`, trend detection via `statusOf`) already **is** Immediate Understanding — a strong, working alignment, just not yet named that or scoped that way in the UI. The only source feeding it today is Arc/BLE, which is expected and correct — Immediate Understanding exists for real-time sensor responsiveness specifically.

**Desired implementation.** Same computation, sourced from the shared Interpretation Ruleset (not hardcoded thresholds), and scoped in the UI so it is *only* ever authoritative for present-moment claims — never for anything describing the person generally.

**Gap.** Two distinct things: (1) hardcoded thresholds — addressed by the Evidence migration above; (2) **a real, current conflict with the frozen architecture** — `today.tsx`'s existing precedence logic (even after Phase 2's 2.4 fix, which made the *labeling* honest) still lets Immediate Understanding provide Today's headline/standing/evidence whenever `today.state === "ready"`. Under the frozen architecture, that's Persistent-only territory, full stop. This is not a plumbing gap, it's a scoping conflict that needs a real product/UI decision.

**Recommended migration strategy.** Sequence this *after* Persistent Understanding is real and trustworthy (see below) — re-scope `today.tsx` so headline/standing/evidence are always Persistent-sourced, and Immediate Understanding's role narrows to explicitly-present-moment UI (a live orb pulse, a "reading now" state). This deliberately revisits 2.4 a second time, tightening what was already made honest into what the frozen architecture actually requires.

**Complexity:** Medium — the computation barely changes; the work and risk are entirely in the UI re-scoping.

**Risks:** a highly-engaged Arc wearer today sometimes gets a more confident, more immediate answer from Immediate Understanding than Persistent Understanding can offer yet — removing that could read as *less* responsive if the "live" treatment isn't designed to feel satisfying on its own. Needs real design attention, not just a backend swap; must not ship until Persistent Understanding (below) is good enough that this isn't a net regression.

---

## Persistent Understanding

**Current implementation.** `understanding.server.ts`'s `synthesise()` is real, working, server-side, and account-tied — genuinely aligned in *placement*. `beliefs.server.ts`'s six `RULES` implement reasonable revision mechanics (diminishing-returns strength formula, support/contradiction tracking, status transitions) — the *mechanism* is sound, just narrow: six fixed-domain rules, fed directly by raw Observations (`rule.weigh(o, all)`), not by any Evidence-fusion stage.

**Desired implementation.** Persistent Understanding synthesizes from real Persistent Evidence (once built above), across a genuinely extensible set of domains, consistently respecting the Interpretation Ruleset.

**Gap.** Entirely downstream of the Evidence gap. No sensor-derived domains exist among the six rules today, because no sensor data reaches `observations` at all yet (see Observation §, BLE bridging).

**Recommended migration strategy.** New rules/domains are added incrementally, each a small, additive, individually-reviewable change — exactly the extensibility the architecture promises — sequenced strictly after Evidence exists and after BLE data starts reaching `observations`. Not a rewrite of the six existing rules.

**Complexity:** Medium, but fully sequenced behind Evidence and BLE-bridging — mostly rule-authoring once the prerequisites exist.

**Risks:** unconstrained rule/domain growth risks recreating the same governance problem the Interpretation Ruleset was built to solve, on the belief side instead of the threshold side. Worth eventually bringing belief `RULES` under similar version/rollout discipline — not required for the first new rule, worth flagging before this grows past a handful.

---

## User Memory / Living Health Model

**Current implementation.** The `user_memory` table doesn't exist. Identity, settings, and priorities are entirely local (`profile-store.ts`, `ciatta-store.ts`), with zero server presence — not competing with anything, just missing. `beliefs`, `memories`, `understanding_snapshots`, and `relationship_events` already exist, already work, and need no changes.

**Desired implementation.** `user_memory` live and populated; the Living Health Model (this table plus the four existing ones) is the sole read-source for Adaptation and Narrative.

**Gap.** Purely additive — nothing conflicts.

**Recommended migration strategy.**
1. Create the `user_memory` table (trivial migration, no data to move yet).
2. Route identity/settings/priorities/lifecycle-flag writes through it, reusing the *same* Outbox mechanism being built for Observations — this is genuinely incremental once the Outbox exists, not a separate mechanism.
3. One-time backfill: on next load, push each existing user's current local identity/settings/priorities/lifecycle state up once, idempotently.

**Complexity:** Low — the least architecturally risky item in this entire analysis, and it directly reuses infrastructure being built for Observations anyway.

**Risks:** minimal. The only real one is backfill ordering — never let a stale local value overwrite a newer server value if the backfill somehow runs from two devices; same "fill gaps, never overwrite non-empty" rule that applies to Observation sync generally.

---

## Adaptation

**Current implementation.** Real, working, but scattered and unnamed: `buildTeachSuggestions()` (client), `curiosity.server.ts`'s `suggestionsFor()` and `followUpFor()` (server — already reading from `Understanding` directly, already well-aligned in spirit), `onboarding-flow.ts`'s adaptive branching (client, local), and Today's focus-selection (embedded inside the Narrative Engine's output construction rather than being its own upstream decision).

**Desired implementation.** One named Adaptation interface — a Persistent flavor (server, deliberate, e.g. which Teach suggestions to surface) and an Immediate flavor (client, instant reactions) — all reading from the Living Health Model.

**Gap.** Almost entirely organizational, not logical — the actual decisions being made are mostly already reasonable; they're just not unified, and focus-selection isn't yet separated from how it gets phrased.

**Recommended migration strategy.** Not a rewrite: extract the existing functions behind one shared module boundary (e.g. `adaptation.server.ts` aggregating the server-side pieces), one function moved at a time, each move behavior-preserving and independently shippable — a pure refactor. Open sub-decision worth resolving during implementation, not here: whether onboarding's branching logic (conceptually a Persistent-flavored decision, even though it currently runs entirely client-side) moves server-side or stays client-side but gets relabeled — either is defensible, worth a deliberate call rather than defaulting.

**Complexity:** Low–Medium — mostly mechanical extraction. The one place complexity hides is reconciling the client/server split for onboarding branching, noted above.

**Risks:** low technical risk; moderate *product* risk, since Today's focus-selection is user-visible and emotionally significant — needs behavior-parity testing during extraction, not just code review, since even a subtly different focus choice would be noticeable.

---

## Narrative

**Current implementation.** The best-aligned stage in the entire codebase. `narrative.server.ts` is already a clean, dedicated module — pure functions (`standingLine`, `headlineFor`, `evidenceFor`) mapping `Understanding` → text, exactly matching the architecture's description of Narrative: produces words, never new claims. Client-side, `intelligence/presentation.ts` does the equivalent for Immediate Understanding's own copy. Both already exist and already work.

**Desired implementation.** Same, reading from the Living Health Model instead of directly from `Understanding` once that exists; for Talk specifically, generation passes through the new Verified Communication Layer.

**Gap.** Minimal for Today/Journey/Profile — these mostly just need their input source re-pointed once Evidence/Living Health Model land underneath them, not rewritten. The real gap is entirely in Talk: no LLM, no citation/verification mechanism exists at all today (Talk's `replyTo()` is honestly-scripted per Phase 2.5, but not generative and has nothing resembling §5's Verified Communication Layer).

**Recommended migration strategy.** Today/Journey/Profile's narrative functions need no near-term change — leave them alone until the layers beneath them (Evidence, Living Health Model) actually exist, then re-point. Talk's evolution to a real LLM plus Verified Communication Layer is deliberately the last, most speculative piece, exactly as sequenced in the frozen architecture and gated by the same cost/safety/compliance review named there — not touched in this migration.

**Complexity:** Low for existing surfaces; High for Talk (unchanged from the original assessment — provider choice, cost, the full Verified Communication Layer build).

**Risks:** minimal for existing surfaces. Talk's risks are already fully documented in the architecture's §5/§7 and not restated here.

---

## Dependency Graph — Safest Implementation Order

Every arrow is a hard dependency (the item at the tail must exist before the item at the head is safe to build). Items with no incoming arrows in the same phase can proceed in parallel.

```
Phase A — Foundational, parallelizable, low risk
  [A1] Interpretation Ruleset v1 (seeded with current client values, read-only)
  [A2] observations.evidence_class column + backfill
  [A3] Adaptation extraction (pure refactor of existing logic)
  [A4] (Future Simplification, opportunistic, no dependency) DB-level Observation unique constraint

Phase B — Depends on Phase A, mostly parallelizable
  [B1] Client Immediate Understanding reads the Ruleset  ← depends on A1
  [B2] Observation Outbox (dual-write alongside existing batch sync)  ← depends on A2
  [B3] user_memory table + sync via Outbox  ← depends on B2
  [B4] Server Persistent Evidence module  ← depends on A1  (does not need B2 — can build/test against Observations already flowing via the existing batch path)

Phase C — Depends on Phase B
  [C1] Persistent Understanding refactored to consume real Evidence  ← depends on B4
  [C2] BLE → server Observation bridging (session-end summaries)  ← depends on B2

Phase D — Depends on Phase C
  [D1] today.tsx re-scoped: Immediate narrowed to present-moment-only  ← depends on C1 (Persistent must be trustworthy first)
  [D2] New belief RULES for sensor-derived domains  ← depends on C1 and C2
  [D3] Narrative re-pointed to the Living Health Model  ← depends on B3 and C1

Phase E — Separately gated, last by design
  [E1] Verified Communication Layer + Talk LLM  ← depends on C1 and D3, plus its own cost/safety/compliance sign-off (unchanged from the original proposal)
```

**Why this order is safe:** Phase A ships with zero behavior change (a new column, a new table nobody reads from yet, a refactor with identical output, an opportunistic constraint). Phase B is the first phase with new *behavior*, but each item is individually low-risk and reversible (a cache pointed at new data, a dual-write queue with the old path as a safety net, a new empty table being filled). Phase C is where real new server-side computation lands, but it's additive — nothing existing is removed or re-scoped yet. Only Phase D changes what the person actually sees on Today, and it's explicitly sequenced last among the core work, after Persistent Understanding has already been proven real. Phase E remains exactly where the frozen architecture already put it.

**What's deliberately absent from this graph:** every item listed under [Future Simplifications](INTELLIGENCE_ARCHITECTURE.md#future-simplifications) in the frozen architecture — the shared computation module, Living Health Model table consolidation, and (beyond A4) further schema cleanups. None of them are on this graph's critical path, by design.
