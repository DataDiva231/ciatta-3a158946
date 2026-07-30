## Ciatta refinement pass

No new screens or data changes. This is a systematic pass over type, the hero visual, chrome, layout, and voice.

### 1. Typography
- Swap the Google Fonts link in the root layout: **Instrument Serif** (400 + italic) and **Inter** (400/500/600).
- `--font-serif: "Instrument Serif"`, `--font-sans: "Inter"` in `src/styles.css`. Instrument Serif renders larger than Newsreader at the same size, so headline sizes drop ~1–2px and tracking tightens slightly.
- Audit every `font-serif` usage. Keep serif only on: Today's greeting + understanding headline + guidance lead, Teach prompt, onboarding welcome/question/summary screens, Journey discovery headlines, major insight headlines, screen titles.
- Everything else — metrics, labels, chips, list rows, settings, forms, quick-add options, buttons, timeline meta — becomes Inter. Several places currently use serif for numbers and small values; those move to Inter with tabular figures.

### 2. One Understanding visual
- Retire the translucent bust figure (`ciatta-figure-cut`) and the separate aura/gradient motifs. The **breathing orb** becomes the single evolving Understanding mark.
- Build `src/components/ciatta/understanding.tsx`: one component taking `size` (sm/md/lg/hero) and `confidence` (0–100). Confidence drives scale, bloom opacity, and inner detail so the same object visibly matures as Ciatta learns.
- Reuse it on Today (hero), Teach, Journey discoveries (replacing `discovery-orb` tones with the shared mark), onboarding welcome + Building Your Understanding, and Quick Add's confirmation.
- Delete `discovery-orb.tsx` and the figure assets/preload once nothing references them.

### 3. Reduce visual noise
- Remove card containers and 1px borders where they only group content: Today's metric divider stack, Teach's "other ways" bordered grid, Journey cards, Profile grouped-list boxes, Quick Add option tiles.
- Replace with whitespace, generous vertical rhythm, a very soft tonal surface (`--surface`) where separation is genuinely needed, and one barely-there shadow token for elevation.
- Keep hairline dividers only in Settings-style lists where scanning matters.

### 4. Editorial composition
- Today: greeting and date top-left, orb offset asymmetrically, one large serif understanding statement, confidence as quiet inline text, two supporting lines in Inter, one guidance line. No stat rows reading like a dashboard.
- Teach: orb, one serif prompt, one primary action (Quick Add), secondary ways demoted to a plain text row.
- Journey: single-column editorial rhythm — big serif discovery headline, plain reasoning paragraph, generous section gaps.
- Profile: hero + long-form sections; groups become titled type blocks, not boxes.
- Quick Add: one question per screen, large serif question, unadorned options.

### 5. Voice component
- New `src/components/ciatta/voice.tsx` reused by Talk, Quick Add notes, and Teach: a calm circular presence (same Understanding language, not a mic glyph), an amplitude-reactive breathing ring while recording, live transcript rendered as editorial serif text rather than a form field, and copy framed as teaching ("Ciatta is listening…"). Wires to the existing `voice-memo.ts` / `api/transcribe` path unchanged.

### 6. Motion & color
- Standardize on fade, 2–4% scale, breathing loop, progressive reveal; strip any transform/slide beyond `slide-in-from-bottom-1/2`. Durations 300–700ms, `prefers-reduced-motion` respected.
- Keep the existing OKLCH palette. Audit clay usage down to accent-only (interaction, attention, confidence); semantic moss/wheat/brick reserved for real status.

### Technical notes
- Files touched: `src/routes/__root.tsx`, `src/styles.css`, all route files, `src/components/ciatta/*`.
- New: `understanding.tsx`, `voice.tsx`. Removed: `discovery-orb.tsx`, bust figure assets and its preload link.
- No changes to `narrative.ts`, `ciatta-store.ts`, `profile-data.ts`, `journey-data.ts`, or the onboarding flow graph — logic and data stay exactly as they are.
- Verified visually with Playwright across Today, Teach, Quick Add, Journey, Profile, and onboarding in light and dark.
