# Nothing-inspired data layer for Ciatta

Nothing's aesthetic is cold, monochrome and industrial — the opposite of Ciatta's warm, intimate voice. So rather than adopting its look, Ciatta adopts the one thing it does better than anyone: making technical data read as honest instrumentation.

Ciatta keeps its warm canvas (#F8F6F3), Instrument Serif editorial voice, Living Clay accent and soft radii. Nothing's contribution is a single new visual register used only for machine-generated metadata.

## What gets built

**A mono metadata register**

One new type treatment for data that came from the system rather than from the user: timestamps, confidence values, source tags, learning state, session identifiers, sample counts. Monospace, small, tracked-out, uppercase, muted — quiet enough to sit under editorial copy without competing with it.

**Where it appears**

- Today: the confidence and source line under the primary insight, and the metadata line on evidence rows.
- Engine trace: step labels, confidence deltas, and object identifiers.
- Diagnostics: all numeric readouts, session timings, and quality figures.

**Hairline discipline**

Replace the remaining soft separators in these data areas with true hairline rules, so grouped metadata reads as a technical table rather than as a card stack.

## What deliberately does not change

- No grey canvas, no black-and-red palette, no 0px corners.
- Headlines stay Instrument Serif — no monospace or dot-matrix display type.
- No changes to user-authored content (Teach entries, Journey narrative, Profile prose), which stay fully editorial.
- No layout restructuring, no new routes, no engine or data-model changes.

## Technical notes

- Add a monospace font family plus a `--font-mono` token in `src/styles.css`, loaded via a `<link>` in `src/routes/__root.tsx` (never `@import` in CSS on this stack).
- Add a `data-label` utility next to the existing `label-caps` utility: mono family, ~0.6875rem, uppercase, ~0.08em tracking, muted foreground token.
- Apply `data-label` in `src/routes/_authenticated/index.tsx` (confidence/source and evidence metadata), `src/routes/engine-trace.tsx`, and `src/routes/diagnostics.tsx`.
- Hairlines use existing border tokens at 1px — no new colour values, no hardcoded colour utilities.
