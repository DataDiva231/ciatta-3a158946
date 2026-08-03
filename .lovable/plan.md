# Wrap Ciatta as a downloadable Android APK

No separate backend is needed. The database, auth and all server logic stay on Lovable Cloud + the hosted TanStack server runtime (`src/lib/*.functions.ts` → `src/server/**`). The Android app is a native shell that loads your published site, so it uses the same backend as the web app.

## Step by step (on your own machine, from the GitHub export)

1. Install prerequisites: Node/Bun, Android Studio (with the Android SDK and a JDK).
2. In the exported repo, add Capacitor:
   `bun add @capacitor/core @capacitor/cli @capacitor/android`
3. Initialise it: `bunx cap init Ciatta io.ciatta.app`
4. In `capacitor.config.ts`, point the shell at the live app instead of bundled files:
   `server: { url: "https://ciatta.io/today", cleartext: false }`
   This matters because Ciatta uses server-side rendering and server functions — there is no static folder to ship inside the APK.
5. Add the platform: `bunx cap add android`
6. Sync and open: `bunx cap sync android` then `bunx cap open android`
7. In Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s). The debug APK lands in
   `android/app/build/outputs/apk/debug/app-debug.apk` — that's the file you can download and sideload.
8. For a shareable/Play build, create a keystore and run Build → Generate Signed Bundle/APK.

## The one change needed in this project

Some wrappers ignore the configured start URL and boot at `/`, which is the waitlist landing page. So:

1. **New** `src/lib/native-shell.ts` — `isNativeShell()`: true when running inside a Capacitor/WebView wrapper (Capacitor global, or standalone display-mode launch). SSR-safe, returns false on the server.
2. **Edit** `src/routes/index.tsx` — a client-side effect (not `beforeLoad`, which would break SSR/SEO of the landing page) that navigates to `/today` with `replace: true` when `isNativeShell()` is true. The `_authenticated` gate already sends unauthenticated users to `/auth`.

In a normal browser, `/` renders the waitlist page exactly as it does today. No visual changes anywhere, no changes to auth, migrations, RLS, or components.

## Before building the APK

Publish the web app first (the shell loads the published URL), then confirm in the published app: sign-in, email verification return, and Today loading its understanding.
