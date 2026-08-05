# Ciatta Product Coherence Roadmap

Companion document to `IOS_LAUNCH_CHECKLIST.md`. Where that file tracks launch mechanics (infra, integrations, QA, App Store submission), this one tracks closing the gap between Ciatta's product vision — one continuous intelligence, built across every channel — and what's currently implemented, per the full codebase review conducted on 2026-08-04.

Working rules, same as the launch checklist: one task at a time, explain before changing, verify before marking done, preserve existing design language/architecture unless a change clearly improves coherence.

---

## Phase 1 — Immediate Launch Fixes

Low-risk, additive or corrective. Nothing here changes an architecture decision; everything here is fixing something wrong or missing inside the current design.

### 1.1 Fix Profile's hardcoded "Cycling" life stage
**Status: done.**
`useProfile()` in `src/lib/profile-data.ts` built a `snapshot` row claiming life stage was always "Cycling," regardless of what the user actually selected in onboarding. Fixed to read `identity.lifeStage` from `useIdentity()`, with life-stage-aware detail copy and an honest "Not set" fallback.

**Correction on severity, found during verification**: this `snapshot` array (and the "life-stage" row specifically) turns out to have no current renderer anywhere in the app — `profile.index.tsx` only ever reads `snapshot.find(id === "learning-since")` for one header string. The "for the metric detail screen" comment on `SnapshotRow` refers to a screen that doesn't exist yet. So this was never actually visible to a user in the shipped build; it was correct instinct from the review but not a live-impact bug. Kept the fix anyway — it's now correct data waiting for the screen that already expects it, at zero cost. Separately noticed while verifying: the `focus` lookup at `profile.index.tsx:429` searches `snapshot` for `id === "next"`, which no snapshot row ever has — always silently falls back to `"Recovery"`. Not fixed yet; flagged below as 1.1a.

- **Why it matters:** Low, revised down from the original review — inert today, but wrong data sitting in a struct documented as feeding a future screen is exactly the kind of thing that ships wrong the day that screen gets built, unless fixed now while it's cheap.
- **Dependencies:** None.
- **Complexity:** Trivial. Done.

### 1.1a Fix the dead `"next"` snapshot lookup
**Status: done.** Exposed `focus` directly on `ProfileView` (computed once inside `useProfile()`, same value already used in `story`) instead of the fragile `snapshot.find(id === "next")` lookup, which never matched anything and always silently fell back to `"Recovery"`. `profile.index.tsx` now reads `profile.focus` directly. Type-checked clean.
- **Why it matters:** Same class of bug as 1.1 — quietly wrong, currently low-visibility.
- **Dependencies:** None.
- **Complexity:** Trivial.

### 1.2 Fix "Understanding engine: On-device" false claim
**Status: done.** Changed the About section's value from "On-device" to "Ciatta's servers" — accurate for the server engine that actually produces the account-tied portrait/beliefs, and consistent with the app's existing "never sold or shared" trust framing rather than undercutting it.
- **Why it matters:** High relative to effort — a factual misstatement about how a health app handles your data, in the section that exists specifically to explain that.
- **Dependencies:** None.
- **Complexity:** Trivial (copy change).

### 1.3 Link Settings → Legal to the real Privacy/Terms content
**Status: done.** "Terms of use" and "Privacy policy" rows in Settings → Legal now link straight to the real `/terms` and `/privacy` pages instead of a one-line accordion summary. "Health disclaimer" and "Open source licences" don't have dedicated pages yet, so they keep their existing inline-expand behavior — writing real content for those is a legal-review task (`IOS_LAUNCH_CHECKLIST.md` Phase 7), not a wiring fix, so left alone deliberately.
- **Why it matters:** High — Apple's App Store review explicitly checks for a working, reachable privacy policy. A stub here risks a rejected submission, not just an unfinished feel.
- **Dependencies:** None — the real content already existed at `/privacy` and `/terms`; this was wiring, not writing.
- **Complexity:** Low.

### 1.4 Make notification settings honest
**Status: done.** Added a plain-language note above the notification toggles in Settings: notifications aren't sending yet, and what's chosen now is saved for when they do. Toggles stay fully interactive (forward-compatible) rather than disabled — the dishonesty was the silent gap between "looks live" and "nothing reads this," not the toggles' existence.
- **Why it matters:** High — this is a working-looking promise the app cannot currently keep. A user who opts in and never hears from the app again has been quietly misled by the UI, which is a worse outcome than not offering the toggle at all.
- **Dependencies:** None for the honest-relabel version (done here). A real implementation (APNs/local notifications) is bigger and belongs in Phase 2 or 3 once there's confidence about what should actually trigger a notification.
- **Complexity:** Low for the honest relabel (done); Medium–High for a real implementation (deferred).

### 1.5 Reconcile "Ciatta Arc™" in Sources with the real BLE bridge
`profile-data.ts` hardcodes the Arc source as `active: false` / "Coming soon." That was accurate before this session — it no longer is, now that `CiattaBluetoothPlugin.swift` and the native adapter exist. It hasn't been tested against real hardware yet, so flipping it fully "live" would be premature, but the current copy is now stale in the other direction.
- **Why it matters:** Medium — a small trust/consistency detail, and a natural place to reflect real progress once hardware verification happens.
- **Dependencies:** Should follow, not precede, actual physical-device testing of the Arc BLE bridge (still outstanding from the earlier native-plugin work). Sequence this after that verification, not before.
- **Complexity:** Trivial once the dependency clears.

### 1.6 Add an offline / no-connectivity screen
**Status: done.** Two parts, since "offline" actually meant two different failure modes:
1. **Cold launch with no connectivity** (WKWebView can't even load the remote app — would otherwise be a blank screen): wired Capacitor's built-in `server.errorPath` config to a new static `public/offline.html` page. This is a documented, sanctioned Capacitor extension point (`WebViewDelegationHandler`'s `didFailProvisionalNavigation` already checks for it) — zero native Swift code changes, so zero risk to the OAuth/bridge behavior tuned earlier. Verified the file propagates through `npm run build` → `npx cap sync ios` → a full Xcode build correctly.
2. **Connectivity drops mid-session** (app already loaded and running): added `src/lib/use-online-status.ts` (a `useSyncExternalStore` hook, matching the codebase's existing pattern for external state) and `src/components/ciatta/offline-banner.tsx`, mounted in `__root.tsx`. Deliberately a small non-blocking banner, not a full-screen takeover — most logging (Teach, Quick Add, Talk) already works fully offline via localStorage, so blocking the whole app here would make it do *less* than it actually can.

Verified live: the native fallback builds and bundles correctly; the in-app banner appears/disappears correctly with simulated connectivity loss.
- **Why it matters:** High for a native app, and specifically relevant to a wearable companion likely used overnight, in transit, or anywhere connectivity is inconsistent.
- **Dependencies:** None architecturally — additive guard states, not a rework of the remote-load approach (that's the larger, deliberate architecture decision in Phase 3).
- **Complexity:** Low–Medium (done).

### 1.7 Surface local-save failures instead of failing silently
**Status: done.** `write()` in `ciatta-store.ts` now returns whether the localStorage write actually succeeded; `update()`/`updateWith()` propagate it; every hook built on them (`addEvent`, `addFact`, `saveCheckIn`, `removeFact`, `removeEvent`) now returns success/failure instead of assuming it. Updated every call site that previously showed a confirmation regardless of outcome: `quick-add.tsx`, `teach.tsx`, `teach-upload.tsx` (shared by capture/attach), `quick-add-sheet.tsx` (shared by Teach and First Observation), `first-observation.tsx`, `talk.tsx`, `check-in-form.tsx`, and `profile.edit.tsx` — each now shows a real "That didn't save. Try once more." state with a working retry, instead of a false "Thank you." Verified end-to-end with a simulated `localStorage.setItem` failure: the app correctly shows the failure state, and a real retry after storage recovers both updates the UI and actually persists the data.
- **Why it matters:** Medium-high — silent data loss is one of the worst failure modes for a health-logging app; the user has no way to know it happened.
- **Dependencies:** None.
- **Complexity:** Low (done) — mechanical once the core primitive returned a real signal, but touched every logging surface in the app.

### 1.8 Landing page → sign-up gap
**Status: resolved — intentional, not a gap.** Product decision made explicitly: the website stays a marketing site, not a web app or account-creation portal. No sign-up/auth is being added to it, and it will not redirect to `/auth`. The website is the public face of Ciatta; the iOS app is the product. What was flagged in the original review as an "accidental gap" is, by this decision, working as intended — `/` and `/waitlist` deliberately have no path into the authenticated app.

**Follow-up, once Ciatta is live on the App Store** (not before, and not part of this roadmap's Phase 1/2/3 work — tracked here for continuity):
- Replace or prominently supplement the primary landing CTA with "Download on the App Store," linking directly to the App Store listing.
- Keep the waitlist only if it still serves a marketing purpose post-launch (e.g. capturing interest ahead of an Android release) — not as a stand-in for a missing sign-up flow.
- **Why it matters:** Low now — resolved by decision, not by code. Matters again at App Store launch, when the CTA swap becomes the real conversion path.
- **Dependencies:** The App Store CTA swap depends on the app actually being approved and live (`IOS_LAUNCH_CHECKLIST.md` Phase 9) — not actionable yet.
- **Complexity:** Trivial when its time comes (a CTA/link change), not attempted now.

**Recommended Phase 1 order:** 1.2 → 1.3 → 1.1a → 1.4 → 1.7 → 1.6 → 1.5 (after Arc hardware verification) → 1.8 (pending your product decision). Ordered by a mix of "smallest and most obviously correct first" and "highest trust-risk relative to effort first." 1.1 is already done.

---

## Phase 2 — Product Coherence

These make Ciatta *feel* like one intelligence rather than several systems sharing a screen. Riskier than Phase 1 because they touch shared data models and multiple surfaces, but none require a full pipeline rewrite.

### 2.1 Unify Talk and Quick Add's underlying record model
**Status: done.** Investigating this surfaced a bigger gap than the original review had visibility into: `use-engine.ts` (the bridge to the server-side "Understanding" engine) already reads `QuickAddEvent`s and specifically special-cases `category === "Note"` as a `"teach"`-sourced observation — meaning free text typed into Teach's Composer already flowed into the server-tied beliefs/portrait. Talk's `LearnedFact`s, on a separate store, **never reached the server engine at all** — only the local Journey timeline saw them. So the real fix wasn't inventing a shared type; it was routing Talk through the pathway that already existed and already worked.

`useLearnedFacts()` in `ciatta-store.ts` no longer owns its own `ciatta.facts.v1` store. It's now a thin derived view over `useQuickAddEvents()`, filtering `category === "Note"` — the same category Teach's free-text box and First Observation already write to. `addFact`/`removeFact` keep their exact same signatures (nothing in `talk.tsx` or `journey-data.ts` had to change), but now go through `addEvent`/`removeEvent` underneath. A one-time migration folds any pre-existing `ciatta.facts.v1` entries into events on first load, then clears the old key, so nobody's already-taught facts disappear.

Verified live: seeded a legacy fact, confirmed it migrated into `ciatta.events.v1` as a `Note` event and rendered correctly in Talk's list; sent a new Talk message and confirmed it lands in the same unified event store; confirmed "Forget" removes it from both.
- **Why it matters:** Was already the single highest-leverage coherence fix by the original review's reasoning; turned out to matter even more than that — Talk's notes weren't just disconnected from Quick Add locally, they were invisible to the account's actual "Understanding" (beliefs, portrait, server-driven Today headline) entirely.
- **Dependencies:** None blocking. Now that it's done, 2.4 (smoothing the intelligence hand-off) has one fewer asymmetry to paper over.
- **Complexity:** Medium (done) — no UI changes to either screen, contained to `ciatta-store.ts`.

### 2.2 Consolidate the duplicated Quick Add implementations
**Status: done.** `CATEGORY_ORDER` now lives once, in `src/lib/quick-add.ts` alongside the rest of the shared flow logic, imported by both `quick-add.tsx` and `quick-add-sheet.tsx` instead of each declaring its own copy. `ProductGlyph` moved to a new `src/components/ciatta/product-glyph.tsx`, taking a `size` prop — worth noting, the two copies weren't quite byte-for-byte identical as the original review had it: the full-page version rendered icons at 44px and the sheet at 34px, a deliberate difference for the two contexts. The shared component preserves both sizes exactly (`size={44}` default for the full page, `size={34}` passed explicitly in the sheet) rather than flattening them to one — the duplication was the SVG path data, not the sizing decision, and only the former needed fixing.

Verified live: both surfaces render pixel-identical to before (confirmed via screenshot and a DOM check for `svg[width="44"]` on the full page and `svg[width="34"]` in the sheet).
- **Why it matters:** This is the exact shape of bug already caught once this session (a fix applied to one copy, silently missing from the other). Every future change to the add-flow now only has to be made once.
- **Dependencies:** None. Done after 2.1, so there was only one flow's data model to consolidate against.
- **Complexity:** Medium (done) — mechanical, no UX changes to either surface.

### 2.3 Consolidate the two camera implementations
**Status: done — smaller than expected.** Checking `CameraCapture` first found it already correctly imports and uses `src/lib/image.ts`'s shared `downscaleCanvas`/`fileToDataUrl` — no duplication there at all. The actual duplicate was narrower: `TeachUpload`'s local `makeThumbnail()` function (used by `capture.tsx`/`attach.tsx`) reimplemented `fileToDataUrl()` almost line-for-line, differing only in JPEG quality (0.7 vs. 0.8, not a documented intentional choice — just independent drift). Removed `makeThumbnail()` entirely and pointed `TeachUpload` at the shared `fileToDataUrl()` instead, standardizing on the existing 0.8 quality.

Verified live: uploading a photo through `/capture` still produces a working preview via the shared function.
- **Why it matters:** Lower urgency than 2.2, as expected — these really are two different UX patterns (live viewfinder vs. simple file picker) that legitimately need to stay separate. This was purely about not re-tuning the same compression logic twice.
- **Dependencies:** None.
- **Complexity:** Low (done) — one function removed, one import added.

### 2.4 Smooth the hand-off between the BLE-intelligence voice and the server-engine voice
**Status: done, scoped to the concrete bug this actually was.** Tracing the precedence logic in `today.tsx` found something more specific and more fixable than a vague "personality swap": whichever source provides the headline (`today` = sensor intelligence, or `view` = server engine) was already computed consistently across `headline`/`standing`/`evidence`/`depth` — but the status line underneath (`today.confidenceLabel` + `today.updatedLabel`) **always** described the sensor pipeline's own state, even in the (very common — this is the default for any user who hasn't connected an Arc sensor yet) case where the engine view was the one actually speaking above it. That's not just a tone mismatch, it's a wrong caption: a sensor status like "Paused" or "Waiting to listen" sitting under a headline that has nothing to do with the sensor.

Introduced one shared `usingIntelligence` boolean (matching the exact condition `headline` already used) and reused it for `standing`/`evidence`/`depth` too, replacing four separately-re-derived near-duplicate conditions with one — verified behaviorally identical in every branch, including the `view?.headline` fallback edge case, before changing anything visible. Then fixed the actual bug: the status line now shows the sensor's real status only when the sensor is actually the one speaking; otherwise it shows a plain, honest "From what you've shared" instead of a mismatched sensor caption.

Deliberately did **not** add a symmetric "reading your Arc sensor" cue on the intelligence side — `today.confidenceLabel`'s existing values ("Learning," "I'm listening," etc.) already read as sensor-flavored in context, so adding a second explicit label there would be redundant, not clarifying. Also left "Today's focus" (always engine-sourced, by design) untouched — that's an intentional specialization in the current architecture, not incoherence.

Verified live: for a freshly onboarded user with no wearable ever connected — the realistic default case — the engine view already wins by design (the server always returns *something*, even a "getting to know you" placeholder, while the local sensor pipeline sits not-ready until a device connects), and the status line now correctly reads "From what you've shared" instead of the sensor-specific label it used to show in that exact scenario.
- **Why it matters:** High for the "continuous relationship" premise specifically — the mismatched status line was a small but real crack in it, visible to essentially every user before their first wearable connection.
- **Dependencies:** Benefited from 2.1 being done first, as expected.
- **Complexity:** Medium (done) — contained entirely to `today.tsx`, no changes to either pipeline.

### 2.5 Give Talk's replies real grounding
**Status: done, and turned out to be a more serious issue than "unconvincing."** Reading `replyTo()` closely, every branch wasn't just generic scripted copy — it asserted a *specific, already-observed correlation* as present-tense fact for every single user, regardless of whether they'd ever logged anything or connected a sensor: "I already see your sleep soften in the two days before you bleed," "your temperature is still elevated at 11pm" on late-caffeine nights, and so on. That's not unconvincing chatbot theater, it's a fabricated claim about a specific person's body, stated with false confidence, in the app's most explicitly "intelligent" surface.

`replyTo()` now takes an `established` boolean, sourced from the same real signal Today's orb already uses (`views.today.depth` from the server engine, thresholded at 40 — never surfaced as a raw number, matching how depth is used everywhere else). Below that threshold, replies are honest that Ciatta doesn't know the person's patterns well enough yet to say anything real, while still engaging warmly with what they said. At or above it, replies can reference that real understanding exists without inventing a specific pattern that was never actually computed. No model call, no cost/infra decision — still fully deterministic and scripted, just no longer lying.

Verified live: a fresh test account (zero real understanding depth) sending "I get migraines before my period" now gets the honest low-depth reply, not the fabricated sleep-correlation claim.
- **Why it matters:** High — confirmed even more than the original review's framing: Talk was the one place actively fabricating specific claims about a user's own body, not just failing to impress.
- **Dependencies:** Benefited from 2.1, as expected — Talk's replies and its "What Ciatta has learned" list now draw from the same real record the rest of the app does.
- **Complexity:** Medium (done) — bounded to grounded scripted responses, deliberately not the same task as the Phase 3 real-model integration.

**Recommended Phase 2 order:** 2.1 → 2.2 → 2.4 → 2.5 → 2.3. Data-model unification first since it de-risks everything downstream of it; the two duplication-cleanups (2.2, 2.3) are independent and can slot in wherever convenient; 2.5 sequenced after 2.1 for the reason above.

---

## Phase 3 — Architecture

**Superseded by `INTELLIGENCE_ARCHITECTURE.md` (frozen) and `PHASE_3_MIGRATION_ANALYSIS.md`.** The proposals below were engineering-first (organized around where computation happens, client vs. server). After review, the direction changed to organize around the product principle instead — one continuous understanding, regardless of source. `INTELLIGENCE_ARCHITECTURE.md` is now the canonical, frozen architectural document; `PHASE_3_MIGRATION_ANALYSIS.md` is the stage-by-stage gap analysis and dependency-ordered implementation plan against it. What follows below is kept for history, not as an active plan.

---

Ground truth used throughout: the server engine's schema already exists and is more capable than the earlier review gave it credit for. `subjects` is keyed 1:1 by `user_id` (confirmed in `identity.server.ts`: "a person is their authenticated account") — so account-level understanding is already correctly unified across devices today, not fragmented per-device. `observations` already has generic `source`/`category`/`value`/`context jsonb`/`confidence` columns — it's not schema-limited to quick-add/check-in data, it just isn't fed anything else yet. `beliefs` already has a generic `domain`/`statement`/`strength`/`support`/`contradiction`/`status` shape — the current six-belief limitation is in `beliefs.server.ts`'s application-level `RULES` array, not the table. This matters: several of the proposals below are more "extend existing infrastructure" than "build new infrastructure," which changes their real cost.

---

### 3.1 — Minimum viable server sync for local-only data

**Problem.** Onboarding, check-ins, quick-add events (facts now merged in), milestones, priorities, identity, and settings live only in `localStorage`. Reinstall or switch devices, and all of it is gone — only the server engine's belief system (fed by a one-way, lossy translation of this same data) survives, and even that reconstructs nothing of the original records.

**Proposal.** Two real designs, presented as a genuine choice:

- **Option A — single JSONB snapshot per user (recommended for v1).** One new table, `local_state`, one row per `user_id`, holding a JSONB blob shaped exactly like what `exportAllData()` in `ciatta-store.ts` already produces (it already knows how to serialize the full local bundle — this reuses that, doesn't invent a new shape). Client debounces a write (e.g. 3–5s after the last local change, piggybacking on the existing `SYNC_EVENT` dispatch from `ciatta-store.ts`) plus explicit sync points: app foreground, before sign-out, before delete. On load, if local storage is empty but the server row isn't, hydrate from it — that's the reinstall/new-device restore path.
- **Option B — normalized per-record-type tables**, mirroring `observations`'s existing pattern (a `local_events`-style table with real rows, incremental upsert instead of whole-blob rewrite). More work up front, but queryable, supports partial sync, and composes more naturally with 3.2 later (structured data is easier to also feed into the belief engine than a JSONB blob is).

**Recommendation:** start with Option A. It's a fraction of the engineering cost, reuses code that already exists and is tested (`exportAllData`), and directly solves the actual problem stated (durability, not real-time multi-device collaboration). Explicitly **not** in scope for v1: live multi-device sync with conflict resolution. The realistic failure mode this fixes is "I reinstalled" or "I got a new phone," not "I'm editing the same check-in on two phones at once" — that's a materially harder problem (needs real conflict resolution or a CRDT-style model) that this app's usage pattern doesn't obviously require yet. If it's ever needed, Option B is the natural upgrade path, and this proposal shouldn't foreclose it.

**Tradeoffs.** Option A is cheap but write-amplifying (every sync re-uploads the whole bundle — fine at personal-health-app data volumes, likely kilobytes over years, but worth confirming that assumption rather than assuming it). It's also not queryable server-side, which matters if 3.2 later wants structured access to this data (it would need its own parallel path regardless, via `observations`, so this isn't actually a blocker — just worth naming so it isn't rediscovered as a surprise later).

**Migration.** No user-facing migration in the traditional sense — this is net-new durability, not a schema change to existing data. The real design problem is the **first-sync precedence rule**, because three distinct states need different handling and must never be confused: (1) brand-new user, nothing anywhere — trivial; (2) existing local data, never synced before — push to server, no merge needed; (3) returning on a new device, server has data, local is empty — pull and hydrate. The dangerous case is a local store that's non-empty but *older* than a previous sync (e.g. an app was reinstalled without clearing local storage first, or two devices both have partial history) — recommend the conservative rule of **never silently overwrite a non-empty side with data from the other; only fill gaps additively**, and if a genuine conflict is ever detected, surface it rather than resolve it silently (a "restore from cloud" affordance the person confirms, not an automatic merge).

**Risks.** Getting the merge logic wrong is the single scariest failure mode in this whole roadmap — a bad "last write wins" could destroy real user history, which is categorically worse than the current "everything is fragile" state, because it would be silent. RLS must exactly mirror the proven pattern already used for `observations`/`beliefs` (`subjects.user_id = auth.uid()`); a misconfigured policy on a new table is a real data-exposure risk, not a hypothetical one. And the debounced-write mechanism needs to be built carefully against the `SYNC_EVENT`/`usePersistentState` pattern already fixed twice this session (Phase 1's render-purity bug) — same class of bug is easy to reintroduce here if the sync trigger isn't kept outside any React render/updater path.

**Strengthens the vision by:** being the most direct fix to "continuous relationship" of anything in this roadmap. Every other coherence improvement in Phase 2 assumed the data survives long enough to matter — right now it structurally doesn't, for most of what makes Ciatta feel like it knows you.

---

### 3.2 — Unify the BLE intelligence pipeline and the server engine

**Problem.** Two real systems, not one: the client-side sensor pipeline (`observations` → `features` → `evidence` → `intelligence`, genuine statistical computation — RMSSD HRV, multi-factor confidence weighting, trend detection — but ephemeral and local-only) and the server engine (durable, account-tied via the schema above, but currently only six hardcoded belief templates whose *text* never varies). They're glued together purely by `today.tsx`'s display-time precedence logic (which Phase 2 made honest about which one is speaking, but didn't unify).

**Proposal.** Three strategies, ordered by ambition:

- **Option A — server ingests sensor summaries as observations (recommended starting point).** Extend `use-engine.ts`'s observation-building to also emit periodic (session-end, not per-packet — see Risks) summaries of the client intelligence layer's output — e.g. `{source: "arc_sensor", category: "cardiovascular", value: "settled", confidence: 0.82, context: {...}}` — into the *same* `observations` table quick-add/check-ins already write to. This is mostly plumbing: the table already accepts this shape. The real work is in `beliefs.server.ts`: its `RULES` currently pattern-match narrowly on categories like `"Cycle"`; they'd need new rules recognizing sensor-derived categories (cardiovascular, sleep quality, recovery, etc.).
- **Option B — client pulls server beliefs into its own fusion pipeline**, teaching `intelligence/pipeline.ts` to treat account-level beliefs as another evidence source alongside sensor evidence, reusing its existing confidence-weighted fusion logic instead of building a second one server-side. Keeps all the *reasoning* in one place (the client, where it already works), but means the durable, account-level "Understanding" still wouldn't itself reflect sensor nuance — only the live client render would.
- **Option C — the full merge.** Move the statistical computation itself server-side, operating on synced raw observations (this depends on 3.1 existing first), with the client's local pipeline reduced to a real-time preview layer that reconciles against the server's eventual computation. This is the complete expression of "one understanding," and the most expensive by a wide margin — realistically a multi-session project of its own, not a single Phase 3 item.

**Recommendation:** Option A as the concrete v1 — it's additive, doesn't require moving working computation, and produces a real, visible result (an account's stored beliefs actually reflecting wearable data for the first time). Treat Option C as the honest long-term direction worth aiming at, not something to attempt now.

**A sub-decision worth flagging explicitly:** the six-belief system's fixed-statement-text model is a poor fit for continuously-varying sensor metrics. Rather than bolting more canned templates onto it, consider porting the *pattern* the client's `intelligence/processors.ts` already uses successfully — threshold-banded, deterministic sentence construction from real computed values — server-side, instead of inventing a third copy of "how do we turn a number into a sentence." Recommend deciding this explicitly as part of approving 3.2, not defaulting into it.

**Migration.** Additive only — existing rules and their belief rows keep working unmodified. Optional bonus: a one-time backfill of currently-stored local intelligence session history into `observations`, similar in spirit to the facts→events migration already done in 2.1 — worth doing if there's real accumulated session history worth preserving by the time this ships, skippable if not.

**Risks.** Beyond the belief-modeling question above: sync cadence needs real thought — an earring that can be worn continuously must not stream every packet server-side (cost and noise); session-end summaries are the right default, not continuous streaming. And this is the one item in Phase 3 with a genuine **privacy-surface increase** worth naming directly: today, granular biometric detail (HRV, temperature, wear sessions) never leaves the device. Syncing summaries of it — even coarse, even session-level — means more sensitive health data landing in the durable server-side store than exists there today. That's not a reason not to do it (it's necessary for the stated product vision), but it's a real expansion of what a future breach could expose, and probably deserves its own explicit mention in the privacy policy rather than assuming the existing "your health data is yours" language already covers it.

**Strengthens the vision by:** being the deepest, most literal expression of "one continuous intelligence" in this entire roadmap — a heart-rate reading and a typed symptom finally feeding the same durable understanding, not two systems that happen to share a screen.

---

### 3.3 — Real object storage for attachments

**Problem.** Photos are inline base64 data URLs inside `QuickAddEvent.metadata`, in `localStorage`. Documents don't even persist their bytes — only filename and size.

**Proposal.** A private Supabase Storage bucket (e.g. `attachments`), path-scoped by `user_id` and secured by Storage RLS mirroring the pattern already proven on `observations`/`beliefs`. On capture, upload the real file to Storage; keep a small downscaled preview inline locally for instant UI (cheap, already exists via `image.ts`), and store a Storage path/reference in `metadata` instead of the full-resolution blob.

One real design choice to flag: **client-direct upload** (simpler, fewer moving parts, relies on Storage's own RLS) vs. **server-brokered upload** (a server function verifies auth and issues a signed URL/token, consistent with the `requireSupabaseAuth` + `guard()` pattern already used for `/api/transcribe`, and leaves room for future content scanning). Recommend server-brokered, for consistency with how every other authenticated write in this app already works, rather than introducing a second security model.

**Tradeoffs.** Server-brokered costs a little more latency and code than trusting Storage RLS directly; worth it for consistency and for not needing to reason about two different auth models in the codebase.

**Migration.** Existing inline base64 images (from this session's own testing, or any real pre-launch users) need a one-time pass: read, re-upload to Storage, replace the metadata field with a reference — same shape as the 2.1 facts→events migration, reusable pattern.

**Risks.** The one that's easy to miss: Storage objects become a **third place user data lives** (alongside `localStorage` and the engine's Supabase tables), and the app's existing "delete my data" / export flows (`exportAllData`, `deleteAllData`, `forgetEverything`) don't know about it yet. If this ships without wiring Storage into those flows, "Delete my data" quietly stops being true — a real breach of the privacy promise already made in the product, not a hypothetical one. This has to be part of the same change, not a follow-up. Also needs to inherit the 1.7 failure-handling pattern (a failed upload needs a real retry state, not a silent drop) and interact sensibly with offline handling (an upload attempted offline needs a queued-retry story).

**Strengthens the vision by:** durability again, for a specific data type — a photo shown to Ciatta shouldn't disappear on reinstall any more than a typed symptom should. Lower ambition than 3.1/3.2, but a real, contained, easily-parallelizable fix.

---

### 3.4 — Per-user baseline calibration instead of global thresholds

**Problem.** The intelligence layer's banding (`bpm < 60`, `stillness > 0.85`, etc.) is identical for every user regardless of individual physiology — undercutting the personalization promise at its statistical foundation.

**Proposal.** Replace fixed global bands with a per-user rolling baseline (mean, with real thresholds like a trimmed mean or median rather than a raw mean — see Risks) per metric, computed once enough history exists, with the current global bands staying as the cold-start default until then. Recommend a **hybrid split**: the server computes and maintains the durable rolling baseline (it needs long history, which only reliably exists post-3.1), while the client applies it locally in the existing threshold-banding logic — preserving the real-time responsiveness of the current pipeline instead of adding a server round-trip to every reading.

**Tradeoffs.** This is genuine statistics work, not a constants swap. Needs explicit answers to: how much history counts as "enough" to trust a personal baseline over the default (a minimum-sample-size gate); how to transition without a jarring "what counts as normal just changed" moment (recommend a confidence-weighted cross-fade — global band fading out as personal-band sample size grows in, not a hard cutover); and how to keep a rolling baseline from being polluted by an atypical stretch (illness, travel) skewing what "normal" means for weeks afterward.

**Dependencies.** Needs 3.1 (durable history to calibrate from) as a hard prerequisite — there's no reliable per-user baseline without data that survives past a single local session. Benefits from, but doesn't strictly require, 3.2.

**Migration.** None in the data sense (this is new computation over existing observation history, not a shape change) — but needs a validation phase before trusting it in copy shown to real users: recommend testing against real accumulated TestFlight data before this drives any user-facing language, given how easy it is for a subtly wrong baseline to make Ciatta sound *more* confidently wrong, not less.

**Risks.** The highest "don't overclaim" risk of the five. False confidence is worse than honest uncertainty, especially in a health context — this is the one item where I'd recommend erring conservative by default (wider bands, more hedged language, explicit "still calibrating" states) rather than optimizing for how personalized it sounds.

**Strengthens the vision by:** making "I understand *you*" literally true at the statistical level, not just in tone — right now that promise is aspirational copy sitting on top of identical thresholds for everyone.

---

### 3.5 — Real model behind Talk

**Problem.** Talk's replies (post-2.5) are honest and grounded, but still fully scripted — no model call. It's the app's most explicitly "intelligent" surface and the one place a person is most likely to notice it isn't generative.

**Proposal.** Replace `replyTo()` with a real LLM call, grounded in the person's actual accumulated context (recent events/facts, life stage, priorities, engine views) passed as structured context, not a free-floating prompt. `OPENAI_API_KEY` and an OpenAI integration already exist in this codebase (`/api/transcribe`) — reusing that provider is the lowest-friction default, but worth treating as a real choice (cost, quality, safety tooling) rather than an assumption, especially given the health context.

**Tradeoffs / required guardrails, not optional polish:**
- **Safety boundary:** an explicit system-prompt constraint enforcing what's already promised elsewhere in the app ("Ciatta is not a doctor and does not diagnose," from the Terms/About copy) — this needs to be a hard instruction to the model, not an assumption it'll behave.
- **Fallback:** keep the current grounded, scripted `replyTo()` as an explicit fallback for model errors/timeouts/rate limits — a broken model call must degrade to today's honest-but-scripted quality, never to nothing or to a raw error.
- **Cost and rate limiting:** needs the same `guard()` rate-limiting treatment `/api/transcribe` already has, plus a real cost-monitoring plan before wide rollout — per-message LLM cost at scale is a genuine operating expense, not a rounding error.
- **Latency:** real model latency is variable; likely wants streaming (the transcription endpoint already streams SSE — same pattern applies) rather than a long silent wait behind the current fake 700ms shimmer.
- **Data handling / compliance:** sending health-context to a third-party model provider needs to be consistent with the actual wording of the Privacy Policy (currently promises data isn't sold/shared — this is a normal, expected thing for an AI product, but must be disclosed, and the provider's data-retention/training-use terms for API calls need to be confirmed compatible before this ships, as a compliance checkpoint, not an engineering afterthought).

**Migration.** None structurally — additive replacement of one function. Strongly recommend shipping behind a gradual rollout (feature flag or staged group) rather than a hard cutover for every user on day one, given the cost and safety surface.

**Dependencies.** Needs 2.1 (already done — Talk reads the same record everything else does) and benefits significantly from 3.2 — a model answering from a still-fragmented understanding will say things that contradict the rest of the app, which is a worse outcome than the current honest-but-limited scripted replies.

**Risks.** The highest combined reputational, safety, and ongoing-cost risk of the five, by a clear margin — health-context hallucination is a real failure mode, not a theoretical one. Recommend this be genuinely last, with its own focused legal/safety review (Terms and Privacy Policy language, medical-disclaimer enforcement at the system-prompt level) as part of approval, not just an engineering sign-off.

**Strengthens the vision by:** finally making Talk match its own framing as the center of an "intelligent conversation" — but it's also the item most likely to introduce real new risk if rushed, which is why it's sequenced last and gated hardest.

---

**Recommended Phase 3 order:** 3.1 → 3.3 → 3.2 → 3.4 → 3.5, unchanged from the original sequencing — persistence first since everything else either depends on it or is cheaper with it in place, storage is a contained parallel win, and the two hardest/highest-risk items (pipeline unification, real-model Talk) come last, each preceded by the groundwork that makes them tractable rather than speculative. Each item above is a standalone proposal awaiting your review — none of it gets implemented until approved individually.

---

## Status

- Phase 1: 1.1, 1.1a, 1.2, 1.3, 1.4, 1.6, 1.7 done. 1.8 resolved by explicit product decision (native-app-only; website stays marketing-only — App Store CTA swap tracked as a post-launch follow-up). 1.5 is the only item still open, blocked on physical Arc hardware testing.
- Phase 2: 2.1, 2.2, 2.3, 2.4, 2.5 all done. Every item complete.
- Phase 3: not started.
