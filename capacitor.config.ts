import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ciatta.app',
  appName: 'Ciatta',
  webDir: '.output/public',
  // Points at the permanent Cloudflare Worker deployment — this app needs
  // its TanStack Start server (SSR + API/auth routes), so the native shell
  // loads it remotely rather than bundling a static export.
  server: {
    // /auth as the entry point: the installed app should open straight to
    // sign-in, not the marketing/waitlist landing page (that's for web
    // visitors, not people who already installed the app).
    url: 'https://ciatta.ciatta-jm.workers.dev/auth',
    cleartext: false,
    // Shown in place of a blank WKWebView when the remote load itself fails
    // (no connectivity, DNS, etc.) — bundled locally in webDir as a static
    // page (public/offline.html), separate from the React app since it has
    // to render with zero network and zero JS bundle available. Capacitor's
    // own WKNavigationDelegate handles the swap; no native code needed.
    errorPath: 'offline.html',
    // Without this, Capacitor's default navigation policy blocks the
    // in-webview redirect chain Google/Apple sign-in relies on (our own
    // origin -> Supabase's auth server -> the provider's consent page ->
    // back to Supabase -> back to our origin) — the redirect just silently
    // never happens, with no error, leaving the "handoff" screen stuck
    // forever.
    allowNavigation: [
      'mngieubkdtpcanwfuctp.supabase.co',
      'accounts.google.com',
      'appleid.apple.com',
    ],
  }
};

export default config;
