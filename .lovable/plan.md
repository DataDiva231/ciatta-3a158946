## Ciatta MVP — product app

A mobile-first, phone-width app experience (no marketing site) with four tabs, styled from the Ciatta palette and the Coco/Olivia visual world, written in Rox's plain, human voice: short sentences, no hype, no clinical jargon.

### Design system
- Tokens from your palette in `src/styles.css`: Canvas `#FAF8F5`, Surface `#FFFCFA`, Secondary Surface `#F3F0EB`, Border `#E7E2DC`, text Graphite `#18181B` / Slate `#66615D` / Fog `#B9B3AD`, Accent Living Clay `#D96A58`, plus Soft Moss, Golden Wheat, Brick, Stone Blue for status.
- Typography: a warm serif for headlines (large, quiet, accent-highlighted key phrases like the Today mock) and a clean geometric sans for body/labels/UI.
- Soft radial warmth behind the hero, generous whitespace, hairline dividers, no cards-everywhere. Accent used sparingly (~5% of UI).
- Generated hero artwork: the luminous translucent figure with concentric dotted rings, in the Ciatta warm-light style.

### Screens

**Today** (`/`) — the narrative screen
- Greeting + date, hero figure with the aura rings.
- One serif headline stating the day's read ("Your body is asking for more recovery today.") with the key phrase in Living Clay.
- Stacked signal readouts (Sleep quality, Resting heart rate, Cycle phase, Temperature) each written as a sentence, not a metric tile.
- A "Prioritize …" guidance block closing the narrative.
- The narrative is selected from a small set of scripted states derived from the demo signals + your check-in, so it visibly shifts when you log something different.

**Teach Ciatta** (`/teach`)
- Chat-style surface where you teach Ciatta about your body. Canned, scripted replies (no live model) — Ciatta reflects back what it learned and stores it as a "known about you" fact.
- Quick prompts: "I get migraines before my period", "Coffee after 2pm wrecks my sleep", "I'm training for a half marathon".
- List of learned facts below, editable/removable.

**Journey** (`/journey`)
- 12-week trends for sleep, HRV, resting HR, cycle phase — lightweight SVG line/bar charts in accent + neutrals, no chart library chrome.
- "Emerging patterns" section: 2–3 written observations linking signals ("Your sleep dips 2 days before your period, consistently.").
- Cycle timeline strip showing phases across recent months.

**Profile** (`/profile`)
- Jenny's basics, connected devices — Ciatta Earring (streaming) and Ciatta Tampon (honeycomb sensing, last sync) with a calm status treatment.
- Daily check-in entry point: sleep felt, energy, mood, symptoms, cycle start toggle — this is the manual input that feeds Today and Journey.
- What Ciatta knows about you, data & privacy blurb.

### Data
- Simulated sensor baseline: 12 weeks of pre-seeded sleep/HRV/RHR/temperature/cycle values generated deterministically, shipped in the app.
- Manual check-ins and taught facts saved in browser storage on the device, layered on top of the baseline. No accounts, no backend, no AI calls.

### Technical notes
- TanStack Start routes: `src/routes/index.tsx` (Today), `teach.tsx`, `journey.tsx`, `profile.tsx`, each with its own head metadata.
- Persistent bottom tab bar rendered in `__root.tsx` around the outlet, with custom Ciatta iconography (sunrise, speech, trend, person) matching the mock.
- Shared modules: `src/lib/ciatta-data.ts` (seeded signals + derived state), `src/lib/ciatta-store.ts` (check-ins + facts in localStorage, hydration-safe), `src/lib/narrative.ts` (scripted insight selection).
- Chat UI built from AI Elements primitives for the transcript/composer, with scripted responses instead of a model.
- Phone-width container centered on desktop so it reads correctly on both.
