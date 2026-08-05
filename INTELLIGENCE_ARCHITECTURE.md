# Ciatta Intelligence Architecture

**Status: FROZEN.** This is the canonical architectural document for Ciatta's intelligence layer. It describes what Ciatta *is*, conceptually — stable regardless of implementation details. Future implementation work conforms to this document; it doesn't get incidentally redefined by individual features. Amendments require a deliberate revision, discussed and dated, not a quiet drift.

This document has two distinct kinds of content, clearly separated:

- **The Architecture (§1–§8)** — the conceptual model. What Ciatta fundamentally is. This is frozen.
- **[Future Simplifications](#future-simplifications)** — engineering opportunities that become realistic later, as the codebase evolves. These are not prerequisites for the architecture and don't block anything. They describe *how the implementation may improve over time*, not what Ciatta is.

It supersedes the engineering-first Phase 3 proposals in `PRODUCT_COHERENCE_ROADMAP.md` (kept there for history), which optimized for where computation happens. This document optimizes for the actual competitive advantage: **every interaction contributes to one continuous understanding of the person, regardless of where it came from.**

---

## 1. The Core Principle: One Intelligence

### The pipeline

```
Source → Observation
              │
              ├──→ Immediate Evidence → Immediate Understanding ────┐
              │         (device, recent window)                     │
              │                                                      ├──→ Living Health Model → Adaptation → Today's Narrative
              └──→ Persistent Evidence → Persistent Understanding ──┘
                        (server, full history)
```

**Sources**: Apple Health, Arc, WHOOP, Fitbit, Talk, Teach, Journal, Clinical Records, and anything added later.

**The invariant that makes this real, not aspirational**: everything from Observation onward is *identical in shape* regardless of which source produced it. A source's only job is to become an Observation. Nothing downstream branches on which source it came from, beyond the epistemic classification (§1.4) used for trust-weighting. "Everything downstream" has two parallel instantiations — Immediate and Persistent — each answering a different question, both converging at the Living Health Model.

### 1.1 The Interpretation Ruleset — a single source of truth for what things mean

Immediate and Persistent Understanding are allowed separate *responsibilities*. They are not allowed separate *opinions* about what a given reading means. A heart rate of 95 either counts as elevated for this person or it doesn't — that determination cannot depend on which half of the system happened to answer.

The resolution: physiological thresholds, evidence bands, confidence-weighting formulas, and status-transition rules (what counts as "settled" vs. "elevated," how support and contradiction accrue toward a belief) are authored in exactly one place — the **Interpretation Ruleset**, versioned and owned server-side, alongside Persistent Understanding.

- **Persistent Evidence/Understanding** reads the Ruleset directly — it's authored right where it runs.
- **Immediate Evidence/Understanding** — which must keep running on-device, offline-capable, without a network round-trip per reading — fetches and locally caches the current Ruleset, versioned so staleness is always detectable, and applies *exactly those numbers* to whatever recent local Observations it's reasoning over.

This is a rule about **data, not computation location**. The client may (and must) implement its own fusion arithmetic, because it has to run standalone. It may never implement its own *definition* of what a number means. When personal calibration exists (§4), it's carried as a subject-specific layer on top of this same canonical Ruleset — meaning Immediate Understanding isn't reasoning about a person in a historical vacuum even though it doesn't have their full history: it doesn't need the history, because the interpretation it's applying already reflects whatever the server currently knows about them.

**Governance, stated as a requirement, not left to discipline.** A single canonical Ruleset means a bad change to it now affects Immediate and Persistent identically, everywhere, at once — there's no longer an independent second implementation to disagree and surface the bug by contradiction. This is the direct cost of removing drift risk, and it has to be answered structurally: **a new Ruleset version must be validated against recent historical observation data before it activates, and rolls out staged (a subset of subjects first) rather than globally and instantly.** This is part of the architecture, not an implementation nicety — the Ruleset is powerful enough that its own change-management is a first-class architectural concern.

### 1.2 Responsibility of each stage

- **Observation** — a single, timestamped, minimally-interpreted raw claim: source, an epistemic classification (§1.4), category, value, free-form context. The only stage a source integration ever writes to, and the only stage that's truly singular — captured once, read by both understanding modes below.

- **Immediate Understanding** — device-local, real-time, computed from a recent window of local Observations against the locally-cached Interpretation Ruleset. Its job is **responsiveness**: the orb reacting to a heartbeat *now*, without waiting on a network round-trip. Necessarily partial — it doesn't have, and doesn't need, the person's full history to do its job. This is concretely what the existing client-side `features` → `evidence` → `intelligence` pipeline already computes.

- **Persistent Understanding** — server-side, longitudinal, computed from the full synced Observation history across every device and session, against the canonical Interpretation Ruleset. Its job is **the actual answer to "who is this person, as best I can tell so far."** Anything that claims to describe the person generally — not just this moment — draws from here.

- **Living Health Model** *(§1 renames "User Memory" — same layer, sharper description; see §2)* — not a passive record. It's the continuously evolving representation of who Ciatta currently understands this person to be. Every durable conclusion from either Immediate or Persistent Understanding updates it. Everything past this point — Adaptation, Narrative — reads *only* from the Living Health Model's current state, never by re-deriving Understanding a second time at the point of use. Not every momentary conclusion is written here — only what's crossed a confidence/stability threshold, the same "never overstate certainty" discipline established in §4.

- **Adaptation** — takes the current Living Health Model and decides how Ciatta's interface, suggestions, and behavior should change in response — not what to *say* (Narrative's job) but what to *surface, ask, or prioritize*. Concretely, in the current codebase this already exists in unnamed, scattered form: `buildTeachSuggestions()`, the adaptive branching in `onboarding-flow.ts`, `curiosity.server.ts`'s `followUpFor`, and Today's `focus` selection are all, in spirit, Adaptation decisions made ad hoc today, each in a different file, with no shared concept tying them together. Like Understanding, Adaptation has an Immediate flavor (an instant local reaction — a haptic, a visual state change) and a Persistent flavor (which Teach suggestions to surface, computed deliberately from the Living Health Model) — the same responsiveness-vs.-considered-judgment split, one stage later. Adaptation inherits §4's "never overstate certainty" discipline directly — it is not a blank check to act on thin confidence just because it's a new stage.

- **Today's Narrative** — the rendered, human-facing expression of what Adaptation selected and the Living Health Model supports, for a specific surface. Produces *words*, never new claims — it phrases what the layers beneath it already established and selected. For Talk specifically, Narrative generation passes through the Verified Communication Layer (§5).

### 1.3 How a new source plugs in

**An adapter that emits Observations in the standard shape.** Immediate and Persistent Understanding both read from the same Observation stream; a new source doesn't need to know either exists, let alone integrate with both separately.

### 1.4 Observation Classification — by epistemic meaning, not by source

The earlier three-bucket trust model (`sensor_continuous` / `self_report` / `clinical_authoritative`) under-modeled a real category: a third-party's own *computed inference* — a WHOOP recovery score, an Oura readiness score — is neither raw sensor data nor a self-report. It's someone else's model output, arriving as if it were observed fact. Classifying it the same as raw heart-rate data would silently inherit another company's undisclosed assumptions as Ciatta's own signal.

Five classes, by what kind of knowledge is actually entering the system:

- **Raw Sensor Observation** — direct, minimally-processed physical measurement from a device Ciatta reads directly (Arc, Apple HealthKit raw samples). High volume, low individual confidence, meaningful in aggregate. Accrues confidence through repetition and fusion.
- **Self-Reported Observation** — a person's own words or taps (Talk, Teach, Quick Add, check-ins). Sparse, high-context, meaningful per instance — doesn't need repetition to matter the way sensor noise does, but can be revised by later, conflicting self-reports.
- **Clinical Observation** — a fact established by a credentialed external authority (clinician, lab). High confidence on arrival; doesn't need repeated occurrence to be believed; held rather than weighed against contradicting Evidence the way a self-report is.
- **External Intelligence Observation** — a computed output from a third-party system Ciatta doesn't control (a WHOOP recovery score, an Oura readiness score, any future third-party insight). Genuinely useful signal, but it carries its provenance all the way through to Narrative — Ciatta can *use* it, but is never allowed to present it as if Ciatta itself determined it. "WHOOP says your recovery is low," never "I've noticed your recovery is low," for anything sourced this way.
- **Inferred Observation** — something Ciatta itself concluded (a belief, a pattern) that gets fed back into the system as a new input for further reasoning — the mechanism by which Understanding can become context for future Evidence-weighing. Always traceable back to the Understanding that produced it, and weighted lower than direct evidence in further reasoning, to avoid a self-referential loop where Ciatta's own past conclusions reinforce themselves without new real signal.

Every Observation carries one of these. The pipeline *stages* stay identical across all five — one pipeline, not five — but the Evidence stage's confidence math (both Immediate and Persistent) reads this classification and applies the appropriate trust profile, the same way it already applies different weighting per feature type today. This is what "one intelligence" means in practice: not one crude average of everything, but one consistent set of rules for how different kinds of knowledge earn trust. It's also the extensibility mechanism: any future source picks one of these five classes (or, rarely, a new class is added without disrupting the other four) — nothing about the pipeline itself changes.

### 1.5 Reconciliation — how Immediate and Persistent interact within the same session

This is fully defined, not an open question.

**The authoritative-domain split.** Immediate and Persistent are never allowed to answer the same question:

- Claims about **the present moment** ("your heart rate is doing this right now," the orb's live pulse, a "listening" state during an Arc session) — Immediate Understanding, always.
- Claims about **the person, generally** (Today's headline and standing, Journey's story, Talk's replies) — Persistent Understanding, always.

No surface silently picks whichever has the more confident answer — that precedence-guessing is what Phase 2 (2.4) already removed from `today.tsx`. There's nothing to arbitrate, because the two were never answering the same question.

**The Recency Window — the concrete mechanism for live sensor changes, recent observations, newly learned information, and ongoing conversations.** Any retrieval of Persistent Understanding (for Narrative, Talk, or Adaptation) is always two things together, not one:

1. The last fully-computed Persistent Understanding snapshot (patterns, beliefs, depth — the considered picture).
2. Any Observations from the current session or recent window that haven't yet been through a full synthesis pass — included as **raw, directly citable facts**, never as the basis for a *new derived claim* until they've actually gone through real Evidence fusion and Understanding synthesis.

Concretely: if someone tells Talk they just took a medication, the very next reply in the same conversation can say "you just mentioned that" — a true, raw fact — but cannot claim a *pattern* involving that medication until it's actually been processed. This single mechanism resolves live sensor changes, recent observations, newly-taught information, and ongoing conversations uniformly — not four separate patches, one rule about what "current" retrieval means.

This also resolves how Immediate Understanding avoids reasoning about a person in total isolation: it doesn't consult Persistent Understanding directly (that would reintroduce a network dependency it exists to avoid), but it *does* apply the same Interpretation Ruleset (§1.1), which already encodes whatever the server currently knows about this person's calibration. The Ruleset is the channel; Immediate Understanding isn't blind, it's just current-session-scoped.

### 1.6 Residual risks, named and accepted

- **The Interpretation Ruleset is a concentration of authority, on purpose, with a stated safeguard.** §1.1's staged-rollout-and-historical-validation requirement is the mitigation; it doesn't eliminate the risk that a bad Ruleset change now propagates everywhere identically, but it means that risk is managed structurally, not hoped away.
- **The Recency Window's raw-fact/derived-claim boundary depends on discipline at the point of use.** A pending, unsynthesized Observation is fair to cite verbatim ("you just told me X") but must never be treated as grounds for a new pattern-level claim. This boundary is stated here as a hard rule; enforcing it is part of the Verified Communication Layer's job (§5), not left to convention alone.
- **Citation-based verification (§5) prevents fabrication, not misapplication.** A response can correctly cite a real claim from the Living Health Model that's still the wrong one for the question asked (citing a mood-domain pattern when someone asked about something physical, for instance). Verification is a floor, not a guarantee of relevance — worth watching once this is real.
- **Extraction risk from Talk** — turning a sentence into an Observation is itself a place errors enter (a mishandled negation becomes a false Observation). Addressed with a confirmation-UX mitigation in §5, not fully eliminated.
- **Two live implementations of Evidence/Understanding logic (Immediate, Persistent) is an accepted, ongoing engineering cost**, even with a shared Ruleset removing the *interpretation* drift risk — the fusion *arithmetic* is still written twice. See [Future Simplifications](#future-simplifications).

---

## 2. Data Model

### 2.1 The three-way distinction (Principle 1)

Three concepts, three clear owners, deliberately not one grab-bag table:

| Concept | What it holds | Table(s) |
|---|---|---|
| **Observation** | Raw, source-agnostic, append-only — *what happened or was reported* | `observations` (existing) |
| **Living Health Model** | Durable, inferred, relational — *who Ciatta currently understands this person to be* | `user_memory` (new) + `beliefs` / `memories` / `understanding_snapshots` (existing) |
| **health_record** *(future)* | Externally sourced, clinically authoritative — *what a real medical record says*, never inferred | `health_record` (future, not built now) |

`observations`, `memories`, `beliefs`, and `understanding_snapshots` already exist and are already well-shaped for the Observation/Evidence/Understanding stages. `user_memory` is not a rename of those — it fills the specific gap those tables don't cover: durable facts about *this person and this relationship* that today live only in `localStorage`, with no server home at all.

**The Living Health Model, named precisely.** It is not simply stored memory. It's the continuously evolving representation of who Ciatta currently understands this person to be — every new durable Understanding updates it, and Narrative and Adaptation are generated *from* it, never from raw Understanding directly. Physically, it's implemented across `user_memory` (identity, preferences, relationship-lifecycle state) *together with* `beliefs`, `memories`, and `understanding_snapshots` (algorithmic patterns and confidence history) — several tables playing one conceptual role. That fragmentation is a real, named tradeoff, not an oversight; see [Future Simplifications](#future-simplifications) for the cleaner single-schema version this could become later.

### 2.2 What actually belongs in `user_memory`

| Currently local-only | New home | Why |
|---|---|---|
| Quick-add events | `observations`, immediately | Already a raw Observation — today's local-store-then-translate-at-sync step is unnecessary indirection (§6) |
| Check-ins | `observations`, immediately | Same |
| Talk messages | `observations`, immediately (Self-Reported) | Already unified with quick-add events in Phase 2 (2.1) |
| Onboarding answers | `observations`, immediately | Same pattern the engine already uses (`fromOnboarding()`), just no longer batched only at sync time |
| Identity (name, life stage, photo) | **`user_memory`** | A durable fact about the person, not an observation about their body |
| Settings (notifications, appearance, privacy) | **`user_memory`** | Preference, not observation |
| Priorities (health-area ranking) | **`user_memory`** | Same |
| Onboarding-completed / first-observation-done flags | **`user_memory`** | Relationship *lifecycle* state |
| Milestones (confidence thresholds crossed) | `relationship_events` (existing, unchanged) | Already the correct home |
| Beliefs / patterns | `beliefs` / `memories` (existing, unchanged) | Already correctly modeled |
| Depth/confidence snapshots | `understanding_snapshots` (existing, unchanged) | Already correct |
| Photos / documents | Supabase Storage + reference | Principle 3, §3 |
| Future clinical records | `health_record` (future) | Distinct provenance/trust class, kept structurally separate |
| Personal calibration overrides | `personalization_state` (§4), layered on the Interpretation Ruleset | Distinct from both raw Observation and general belief — a specific, narrow override |

Shape:

```
user_memory
  id             uuid, pk
  subject_id     uuid, fk → subjects(id) on delete cascade
  key            text            -- e.g. "identity.name", "settings.notifications", "lifecycle.onboarded"
  value          jsonb
  updated_at     timestamptz
  unique(subject_id, key)
```

A narrow key-value shape — durable relationship facts are heterogeneous and will keep growing, and this avoids a schema migration every time the client adds a new preference.

### 2.3 The Interpretation Ruleset (§1.1) — shape

```
interpretation_ruleset
  id             uuid, pk
  version        integer, unique
  domain         text            -- "cardiovascular", "sleep", "thermal", ...
  definition     jsonb           -- thresholds, bands, confidence weights, status-transition rules
  activated_at   timestamptz     -- null until the staged rollout (§1.1) completes
  created_at     timestamptz
```

Global by default (not subject-scoped — this is shared config, not personal data). Personal calibration (§4) is a *separate*, subject-scoped table (`personalization_state`) that layers on top of a specific Ruleset version rather than modifying it, which keeps the deletion invariant (§3) simple: a subject's calibration is personal data and gets deleted with them; the Ruleset itself is not personal data and is untouched by any single subject's deletion.

### 2.4 The Observation Outbox

Writing straight to `observations` on every tap would mean every quick-add log requires a live network round-trip — a real regression against the offline-first behavior Phase 1 deliberately protected. The resolution is a standard pattern: a **local outbox**. Every write commits instantly to a local queue; a background process flushes it to `observations` when connectivity exists, debounced the same way `ciatta-store.ts`'s `SYNC_EVENT` already batches local writes today. The queue is explicitly a *cache of pending Observations*, not a parallel data model.

### 2.5 `health_record` (future — sketched, not built)

An inferred belief is allowed to be wrong and revise as more Evidence arrives; a clinical record is not something Ciatta infers — it's a fact someone else already established, and Ciatta's job is to *hold* it accurately, not weigh it against contradicting Evidence.

```
health_record
  id                uuid, pk
  subject_id        uuid, fk → subjects(id) on delete cascade
  record_type       text        -- diagnosis | lab_result | prescription | imaging | note
  source_authority  text        -- provider/clinic name, or "self-uploaded"
  issued_at         timestamptz
  document_ref      text        -- Storage path to the original document (§3)
  verified          boolean
  extracted         jsonb       -- structured facts pulled from the document, if any
  created_at        timestamptz
```

Extracted facts may also be written as Clinical Observations, feeding the same pipeline as everything else. The source document itself is never rewritten the way Memory is allowed to evolve — two different mutability guarantees, for two genuinely different kinds of truth.

---

## 3. Deletion & Data Lifecycle (Principle 3)

**The invariant:** deleting an account removes database records, the Living Health Model, Storage objects, uploaded documents, and any exported memories. No orphaned personal data, ever.

**Database records.** `observations`, `user_memory`, `beliefs`, `memories`, `understanding_snapshots`, `relationship_events`, `personalization_state`, and (future) `health_record` all foreign-key to `subjects(id) on delete cascade`. Deleting `subjects` removes all of it, atomically. `interpretation_ruleset` is explicitly excluded — it's shared config, not personal data, and is untouched by any individual deletion.

**Storage objects.** Not cascadable by Postgres — a separate system. `forgetEverything()` must explicitly enumerate and delete every object under the user's Storage prefix *before* the database cascade runs, so a partial failure leaves a retryable state rather than an orphan.

**Exports must never create a server-side copy.** Generated on-demand, streamed directly, never cached or persisted server-side.

**Verification, not just good intentions.** A periodic reconciliation job scans for any row or Storage object referencing a `subject_id`/`user_id` that no longer exists in `subjects`, and alerts if found — the difference between a policy and an architecture.

---

## 4. Personalization Framework (Principle 4)

Ship the *shape* calibration will eventually use, wired to always defer to the current global Interpretation Ruleset defaults, with zero actual baseline computation yet.

```
personalization_state
  subject_id        uuid, fk → subjects(id) on delete cascade
  metric            text
  sample_count      integer       default 0
  confidence        numeric       default 0
  personal_baseline jsonb         -- null until confidence crosses threshold
  updated_at        timestamptz
  unique(subject_id, metric)
```

Conceptually, this is a per-subject override layered on the Interpretation Ruleset (§1.1/§2.3) — not a separate personalization system. Every read is wrapped by one function — *is there enough confidence to use a personal baseline, yes or no* — and until it's given real statistics, it always returns no. This is the literal on/off condition the architecture is built around, so there's no path to accidentally shipping overconfident personalization early.

Deferred to a later approved phase: the actual baseline computation (statistics, minimum sample size, outlier handling, cross-fade behavior).

---

## 5. Conversational Intelligence (Principle 5)

**Not implemented now — long-term architecture only.**

### 5.1 The flow

```
User → Talk → Understanding Engine → Living Health Model → LLM → Verification → Response
```

1. **User sends a message in Talk.** Sent to the server — never to an LLM directly. Keeps the provider key server-side only.
2. **The message becomes a Self-Reported Observation.** v1: the whole message as one Observation, matching Phase 2 (2.1)'s existing behavior, now landing in `observations` immediately via the Outbox. A future iteration could extract multiple discrete Observations from a richer message — a deliberate, separate enhancement, not required here.
3. **The Observation flows through the standard pipeline** — Persistent Evidence → Persistent Understanding → Living Health Model — identically to a WHOOP reading. Talk deliberately draws on *Persistent*, not Immediate, Understanding for replies (§1.5) — a reply shouldn't be shaped by the last few minutes of local sensor noise.
4. **Retrieval builds the Understanding Package** — not prose, a **structured, enumerable set of claims**, each with a stable ID (a belief key, an evidence domain+timestamp, a memory key), drawn from the last Persistent Understanding snapshot *plus* the Recency Window (§1.5) for anything from this session not yet fully synthesized.
5. **Generation.** The LLM produces a response as tagged fragments, each either citing specific claim IDs from the package or explicitly marked as no-claim (permitted only for conversational filler — "that sounds hard" — never for anything stated as fact about the person's body).
6. **Verification — deterministic, not another model call.** Every fragment citing a claim ID is checked against the actual retrieved package. Anything uncited-but-assertive, or citing an ID that isn't in the package, is stripped before assembly. If too much of the response fails verification, the system falls back to the same honest template Phase 2 (2.5) already established — "I don't know your patterns well enough yet to say" — never a partially-hallucinated response.
7. **The verified response returns to Talk.** The client never talks to the model provider directly.

### 5.2 Why this makes fabrication structurally impossible, not merely discouraged

The LLM has exactly two narrow roles — an input adapter (step 2) and a constrained output renderer (step 5) — and *no* role in deciding what's true. What makes this a hard guarantee rather than a prompt request is step 6: verification is a **mechanical check against a known, bounded set of IDs**, not a judgment call the model makes about itself. A claim either traces to something the retrieval step actually found, or it's removed — regardless of how convincingly the model phrased it. This is the concrete difference between "the LLM is instructed not to invent facts" (a request) and "an invented fact cannot survive assembly" (a property of the system).

### 5.3 Named risks

- **Extraction (step 2)** is a real failure surface — a misread negation creates a false Observation silently. v1 mitigation: a lightweight confirmation UX for anything extraction isn't confident about, rather than trusting the parse blindly.
- **Verification prevents fabrication, not misapplication** (§1.6) — a correctly-cited claim can still be the contextually wrong one.
- **The Recency Window's raw-fact boundary (§1.5) is enforced here specifically** — pending, unsynthesized Observations are citable as verbatim facts but must be excluded from supporting any newly-generated pattern-level claim. This is a concrete requirement on step 4/6's implementation, not a suggestion.

---

## 6. How This Simplifies the Current Architecture

| Today | Under this architecture |
|---|---|
| Adding a source touches `health-sources.functions.ts`, a provider file, and a bespoke path into `use-engine.ts` | One adapter emitting standard-shaped Observations. Nothing else changes. |
| Client sensor pipeline and server engine are two systems reconciled only by undocumented, guessed precedence logic in `today.tsx` | Two systems, each with a named job and defined scope (§1.5) — nothing to guess between |
| Client and server can independently define what a threshold means | One Interpretation Ruleset (§1.1); the client consumes it, never redefines it |
| `evidence_class` conflates raw sensor data with a third party's own computed inference | Five epistemic classes (§1.4) — a WHOOP score is never laundered as Ciatta's own finding |
| Quick-add events live in a local shape (`QuickAddEvent`); the engine only sees them via a lossy translation at sync time | One shape (`Observation`), written directly via the Outbox |
| Talk, Teach, and Quick Add each independently decide how content becomes durable | All three are Sources; all three become Observations identically |
| `buildTeachSuggestions`, onboarding branching, and `curiosity.server.ts`'s follow-ups are three unrelated implementations of "what should Ciatta ask next" | Three instances of one named stage (Adaptation) |
| Attachments, exports, and account deletion are three uncoordinated systems | One deletion invariant (§3), checked by a reconciliation job |
| Identity/settings/priorities exist only in `localStorage`, invisible to the server | Durable in `user_memory`, synced via the Outbox |
| "How confident is Ciatta about this person" has no consistent answer across screens | One Persistent Understanding, one confidence model, read consistently |
| An LLM (once added) could only be asked nicely not to hallucinate | Fabrication is structurally excluded by verification (§5.2) |

---

## 7. What This Document Does *Not* Decide

- The actual statistics behind per-user calibration (§4) — framework only.
- Multi-discrete-observation extraction from a single Talk message (§5) — v1 treats a message as one Observation.
- The LLM provider/model choice, cost model, and safety/compliance review for Talk — this document fixes the *architecture* the LLM sits inside; provider selection and cost/compliance sign-off remain separate, open decisions.
- The exact schema/format of the structured citation output in §5.1 step 5 (function-calling schema, tagged markdown, etc.) — an implementation choice within the architecture, not fixed here.
- `health_record` is sketched, not built.
- The exact statistical-validation criteria for a new Interpretation Ruleset version (§1.1) beyond "must be validated against history and staged" — the specific test suite is an implementation detail.

---

## Future Simplifications

These are real, worthwhile engineering goals — and explicitly **not** part of the architecture above. They describe how the implementation may improve as the codebase evolves, not what Ciatta fundamentally is. None of them block freezing this document, and none of them are prerequisites for building against it.

- **A shared computation module.** Right now, and for the foreseeable migration, Immediate and Persistent Understanding are two separately-authored implementations that both consume the same Interpretation Ruleset (§1.1) — which removes *interpretation* drift but not *arithmetic* duplication. A cleaner future state: the fusion/weighting logic itself as one isomorphic module, authored once, bundled into the client for on-device execution and imported server-side. Realistic once the current two implementations have stabilized against the shared Ruleset and the actual points of overlap are well understood from real usage — not before.
- **Consolidating the Living Health Model's tables.** `user_memory`, `beliefs`, `memories`, `understanding_snapshots`, and `relationship_events` currently play one conceptual role across five physical tables, held together by this document rather than by schema. A single table with a `kind` discriminator would be cleaner. Not worth the migration cost of touching four already-working tables now; worth revisiting once there's a concrete reason (a new feature that needs to query across them) rather than for tidiness alone.
- **Database-level Observation idempotency.** `observations` currently dedupes by reaching into `context->>externalId` with an application-level read-then-insert — not a real unique constraint. It works today, but it's a genuine (if narrow) race-condition risk, and the Outbox (§2.4) will make concurrent writes more common than today's occasional full-resync. A real `unique(subject_id, source, external_id)` constraint is the correct fix — worth doing as its own small, low-risk migration, independent of everything else in this document.
- **Removing `subjects.device_key`.** A vestigial column from an earlier anonymous-device-first design, now that subjects are keyed by `user_id`. Harmless, but a visible scar worth cleaning up opportunistically.
- **Leaner Immediate Understanding storage.** The current client pipeline persists `features`, `evidence`, and `intelligence` as three independently-versioned local stores. Once the Ruleset-driven design has proven out, this could likely collapse into a single, lighter rolling buffer rather than three separately-managed layers of local persistence.

---

## 8. Status

**Frozen as of this revision.** Principles 1–4 and the conceptual direction of Principle 5 are approved. The single-source-of-truth Interpretation Ruleset, the Verified Communication Layer, the Reconciliation model, the five-class Observation Classification, and the Living Health Model framing are all incorporated as core architecture, not proposals. Future Simplifications are recorded and explicitly deferred, not forgotten.

No code has been written against this document. The migration gap analysis, using this document as the source of truth, is the next step.
