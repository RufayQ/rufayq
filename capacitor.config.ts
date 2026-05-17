import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Rufayq.
 *
 * Single-app build hosting BOTH personas (Patient + Doctor). The persona is
 * chosen at runtime via a role selector after sign-in.
 *
 * appId: com.rufayq.app  (single store listing per platform)
 *
 * `server.url` points the native shell at the live published web app so the
 * Android/iOS build always reflects the latest deployed version. The Lovable
 * sandbox preview URL (`id-preview--…lovableproject.com`) must NOT be used
 * here — it is gated to the Lovable iframe and renders blank inside a native
 * webview, causing the splash to hang forever (the "blacked out" symptom).
 *
 * For a true offline store build, remove the `server` block entirely so the
 * shell loads bundled `dist/` assets via `file://`.
 */
const config: CapacitorConfig = {
  appId: 'com.rufayq.app',
  appName: 'Rufayq',
  webDir: 'dist',
  server: {
    url: 'https://rufayq.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0B2A3A', // navy from design tokens
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#C5965A', // gold accent
    },
  },
};

export default config;
