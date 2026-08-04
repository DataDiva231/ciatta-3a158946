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
    cleartext: false
  }
};

export default config;
