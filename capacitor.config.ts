import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Rufayq.
 *
 * Single-app build hosting BOTH personas (Patient + Doctor). The persona is
 * chosen at runtime via a role selector after sign-in.
 *
 * appId: com.rufayq.app  (single store listing per platform)
 *
 * Hot-reload during development points at the Lovable sandbox preview so
 * native shells reflect web changes immediately. Remove the `server.url`
 * block before producing a production / store-submission build.
 */
const config: CapacitorConfig = {
  appId: 'com.rufayq.app',
  appName: 'Rufayq',
  webDir: 'dist',
  server: {
    url: 'https://aacabea3-4cbd-4aa0-9a0a-eaba72cdef9b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
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
