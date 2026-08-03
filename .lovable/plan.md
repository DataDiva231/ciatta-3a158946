# Publish Ciatta: backend answer + native entry fix

## The backend question, answered

You do **not** need a separate backend to publish Ciatta natively.

- The database and auth are Lovable Cloud (Supabase under the hood). Schema lives in `supabase/migrations/`.
- All server logic runs as TanStack Start server functions on Lovable's hosted server runtime — declared in `src/lib/*.functions.ts`, implemented in `src/server/**` (engine, evidence, guidance, health, security). There are no edge functions.
- The native app is a shell that loads the published site, so it uses the exact same backend as the web app. A separate Supabase project would also mean re-hosting the server runtime — not worth it for launch.

## What to change

Only the app's entry point for the native shell. Two small pieces:

1. **Native shell detection** — a tiny browser-only helper that reports whether the app is running inside a Capacitor/WebView wrapper (Capacitor global, or a standalone display-mode launch).
2. **Root route behaviour** — on `/`, when the native shell is detected, redirect once to `/today` (the `_authenticated` gate already bounces unauthenticated users to `/auth`, and `/auth` already resumes onboarding). On a normal browser, `/` keeps rendering the waitlist landing page exactly as it does today. No visual changes anywhere.

Alongside that, set the native wrapper's start URL to `https://ciatta.io/today` so cold starts skip the landing page entirely; the detector then covers deep links and any wrapper that ignores the start URL.

## Technical notes

- New file `src/lib/native-shell.ts` — `isNativeShell()`, guarded for SSR (returns false on the server) so the landing page still server-renders and stays crawlable.
- `src/routes/index.tsx` — add a client-side effect (not `beforeLoad`, which is isomorphic and would break SSR/SEO of the landing page) that navigates to `/today` with `replace: true` when `isNativeShell()` is true.
- No changes to `_authenticated/route.tsx`, `src/start.ts`, migrations, RLS, or any component styling.

## After the change

Publish to `ciatta.io`, then verify in the published app: sign-in, email verification return, and one engine sync call (Today loads its understanding), and confirm the native shell opens straight into the app rather than the waitlist.
