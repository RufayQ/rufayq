# Mobile setup runbook

Step-by-step manual setup for engineers running the native builds on their
local machine. The Lovable sandbox cannot create the `android/` or `ios/`
folders — those steps **must** be done on your laptop after `git pull`.

## Prerequisites

| Need | Android | iOS |
|------|---------|-----|
| OS | macOS, Linux, or Windows | macOS only |
| IDE | Android Studio (Hedgehog or newer) | Xcode 15+ |
| SDK | Android SDK 34, build-tools 34 | iOS 16+ SDK |
| JDK | 17 | bundled with Xcode |
| Node | bun 1.x or node 20+ | bun 1.x or node 20+ |

For Android Auto testing you also need:
- The **Desktop Head Unit** (DHU) from Android Studio's SDK Manager.
- A real Android phone (Auto does not run in the standard emulator).

## First-time setup

```bash
git pull
bun install
bun run build           # produces dist/

# Add native projects (run once)
npx cap add android
# (on a Mac)
npx cap add ios

# Open in IDE
npx cap open android
npx cap open ios
```

## Daily loop

Web changes are picked up via the hot-reload `server.url` in
`capacitor.config.ts`. You only need to re-sync when you add a Capacitor
plugin or change native config:

```bash
bun run build
npx cap sync android
```

## Producing a release build (Android)

1. In `capacitor.config.ts`, remove or comment out the `server` block so the
   app loads bundled `dist/` instead of the Lovable preview.
2. `bun run build && npx cap sync android`
3. In Android Studio: **Build → Generate Signed Bundle / APK → Android App
   Bundle**. Use the production keystore stored in Lovable Cloud secrets
   (`ANDROID_KEYSTORE_*`).
4. Upload the `.aab` to Play Console.

## Producing a release build (iOS)

1. Same config edit as above.
2. `bun run build && npx cap sync ios`
3. In Xcode: **Product → Archive**, then **Distribute → App Store Connect**.

## Android Auto local testing

1. Install the **Desktop Head Unit** via Android Studio → SDK Manager → SDK
   Tools → Android Auto Desktop Head Unit emulator.
2. Plug in a phone with Android Auto installed and developer mode enabled.
3. On the phone: open Android Auto → tap version 10× → enable Developer
   Settings → "Start head unit server".
4. On the computer:
   ```bash
   adb forward tcp:5277 tcp:5277
   ~/Library/Android/sdk/extras/google/auto/desktop-head-unit
   ```
5. The DHU window opens with our app listed under apps. Pick **Rufayq** to
   launch the Car App service.

## Push notifications

1. In Firebase Console, create a project and add an Android app with
   `applicationId = com.rufayq.app`. Download `google-services.json` and
   place it in `android/app/`.
2. For iOS, generate an APNs key in the Apple Developer console and upload
   to Firebase.
3. Store the FCM server key as `FCM_SERVER_KEY` in Lovable Cloud secrets so
   our edge functions can dispatch.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `cap sync` fails with "platform not added" | Run `npx cap add android` (or `ios`) first. |
| White screen on launch | Check `capacitor.config.ts` `server.url` — must be reachable from the device. For release builds, it should be removed. |
| Plugin not found at runtime | `bun install` then `npx cap sync`. |
| Android Auto card never appears | Verify the `<service>` block in `AndroidManifest.xml` and that DHU is forwarded on `tcp:5277`. |
