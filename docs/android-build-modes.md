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

**Critical caveat:** before installing this APK on a device, the fixed React
code MUST be published to `https://rufayq.com`. The Lovable preview URL
showing `[RufayqStartup] React mounted` does NOT prove the device WebView is
running the new code — it is loading whatever is live at rufayq.com.

How to build an installable APK in remote mode:

```bash
MODE=remote ./scripts/build-android-apk.sh
# → android/app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️  `npx cap sync android` by itself does NOT produce an APK. It only copies
> web assets + plugins into the Android project. You still need Gradle
> (`./gradlew assembleDebug`) or Android Studio to assemble the APK. The
> script above wraps that.

## 2. Bundled / offline mode (store releases & local fix verification)

- The `server` block is stripped before `npx cap sync android`.
- WebView loads bundled `dist/` assets via `file://`.
- Works offline (subject to the app's own offline cache layer).
- Required for Google Play submission.
- **Recommended for verifying any startup/splash fix** — the JS that runs is
  the JS in the APK, with no dependency on what rufayq.com is currently
  serving.

How to build an installable APK in bundled mode (for local device tests):

```bash
./scripts/build-android-apk.sh          # MODE=bundled is the default
# → android/app/build/outputs/apk/debug/app-debug.apk
```

How to build a release AAB for Google Play submission:

```bash
./scripts/build-android.sh
# → android/app/build/outputs/bundle/release/app-release.aab
```

Note: `app-release.aab` is **not** directly installable via `adb install`.
Use the APK script above for device smoke tests.

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
