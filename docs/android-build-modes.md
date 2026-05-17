# Android build modes

The Rufayq Android shell can boot in **two completely different modes**.
Knowing which mode an APK/AAB is in is essential for diagnosing the "blacked
out app" symptom — they fail in different ways.

## 1. Remote URL mode (development / hot-reload)

- `capacitor.config.ts` keeps the `server` block:
  ```ts
  server: { url: 'https://rufayq.com', cleartext: false }
  ```
- WebView loads `https://rufayq.com` on every cold start.
- **Requires network.** No connectivity → splash hangs unless the controlled
  splash handoff fires (see `src/lib/native/splashHandoff.ts`).
- Useful for: hot-reload during development, quick QA of the live web app.
- Do **NOT** ship to Play Store in this mode (review risk + offline failure).

How to build it manually:

```bash
npx cap sync android
# open android/ in Android Studio and Run → app
```

## 2. Bundled / offline mode (store releases)

- The `server` block is stripped before `npx cap sync android`.
- WebView loads bundled `dist/` assets via `file://`.
- Works offline (subject to the app's own offline cache layer).
- Required for Google Play submission.

How to build it:

```bash
scripts/build-android.sh
```

This script prints `build mode: BUNDLED` during the sync step and restores the
original `capacitor.config.ts` on exit.

## How to tell which mode an installed APK is in

- Run `scripts/qa/android-splash-smoke.sh`. The report header now prints the
  **local** `capacitor.config.ts` mode as a hint (the installed APK itself is
  not introspected — see report header).
- Or check `adb logcat` during cold start:
  - Remote mode: WebView fetches `https://rufayq.com/...`
  - Bundled mode: WebView loads `file:///android_asset/public/index.html`

## Blackout failure modes by build mode

| Mode | Common cause of "black screen" |
|------|--------------------------------|
| Remote URL | `server.url` unreachable, DNS failure, captive portal, HTTPS error |
| Bundled    | `dist/` missing, JS chunk load failure, native crash |
| Either     | WebView renderer crash, severe memory pressure |

The splash smoke script (`scripts/qa/android-splash-smoke.sh`) categorises each
failure into one of these buckets in its Markdown report.
