# Native app opens the waitlist instead of Ciatta

## What's happening

Nothing is broken in the app. It's a routing consequence of the earlier change: `/` is now the waitlist landing page, and the app itself lives at `/today` behind the sign-in gate. A native wrapper (WebView / Capacitor) always boots at `/`, so it lands on the marketing page and never reaches the app.

Also worth knowing: this project is a server-rendered TanStack Start app, so a native shell must load it from a URL (the published site), not from a folder of bundled static files. A "bundle the build output into Xcode" approach will show a blank or broken page regardless of routing.

## The fix

Make the entry point aware of who's asking:

1. Add a small native-context detector (Capacitor bridge present, `standalone` display-mode, or a `?app=1` / custom user-agent marker set by the shell).
2. In the root route, when the context is native, redirect `/` to the app instead of rendering the landing page:
   - signed in and onboarded -> `/today`
   - signed in, onboarding incomplete -> resume onboarding
   - not signed in -> `/auth`
3. Keep the website behaviour identical: on a normal browser, `/` still renders the waitlist page exactly as it does today. Nothing about the landing design, the app screens, or the auth flow changes.
4. Keep `/waitlist` working as-is so existing links don't break.

## Wrapper configuration (your side)

- Point the native WebView / Capacitor `server.url` at `https://ciatta.io` (or `https://ciatta.io/today`, which the redirect step also handles).
- Do not ship a static copy of the build output.
- Allow the Supabase domain and Google sign-in domains in the shell's allowed-navigation list, or OAuth will dead-end inside the WebView.

## Technical notes

- New helper `src/lib/native-shell.ts`: `isNativeShell()` checking `window.Capacitor?.isNativePlatform?.()`, `window.ciattaHealth` (already used for the HealthKit bridge), `navigator.standalone`, `display-mode: standalone`, and a `?app=1` query flag persisted to `localStorage`.
- `src/routes/index.tsx`: keep the current component and `head()`; add a client-only effect/`beforeLoad` guard that navigates to `/today` or `/auth` when `isNativeShell()` is true. Guarded so SSR and prerender still render the landing HTML (no session exists at build time).
- Session/onboarding state is read with the existing `supabase.auth.getSession()` + onboarding store, matching what `/_authenticated` already does.
