# FCM verification runbook (Android)

The Lovable sandbox cannot introspect the native `android/` project, so the
following checks **must** be run on the local machine that holds the Capacitor
Android project and a physical device / emulator. They confirm whether Firebase
Cloud Messaging is wired up natively — the TypeScript side
(`src/lib/native/push.ts`) is already hardened to fail safely if it is not.

Cross-linked from:
- [docs/mobile-setup.md](../mobile-setup.md)
- [docs/qa/android-splash-handoff-smoke.md](android-splash-handoff-smoke.md)

## 1. Native config file present

```bash
test -f android/app/google-services.json \
  && echo "google-services.json exists" \
  || echo "MISSING google-services.json"

grep -E '"package_name"|mobilesdk_app_id|project_id' android/app/google-services.json
```

Expected:

```
"package_name": "com.rufayq.app"
```

If the package name differs from `com.rufayq.app` (the `appId` in
`capacitor.config.ts`), FCM token registration will fail.

## 2. Google Services Gradle plugin applied

```bash
grep -RnE "com\.google\.gms\.google-services|google-services" \
  android/settings.gradle \
  android/build.gradle \
  android/app/build.gradle 2>/dev/null
```

Expected matches: the plugin classpath in `android/build.gradle` and
`apply plugin: 'com.google.gms.google-services'` (or the Kotlin DSL equivalent)
in `android/app/build.gradle`.

## 3. POST_NOTIFICATIONS permission (Android 13+)

```bash
grep -n 'POST_NOTIFICATIONS' android/app/src/main/AndroidManifest.xml
```

Expected:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## 4. Build & install a fresh debug APK

```bash
./scripts/build-android-apk.sh        # MODE=bundled default
adb uninstall com.rufayq.app || true
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 5. Capture FCM logs

```bash
adb logcat -c
adb shell monkey -p com.rufayq.app -c android.intent.category.LAUNCHER 1
sleep 10
adb logcat -d -v time | grep -Ei \
  'RufayqStartup|PushNotifications|FirebaseApp|FirebaseMessaging|FCM|google-services|google_app_id|Default FirebaseApp|registration|SERVICE_NOT_AVAILABLE|AndroidRuntime|FATAL EXCEPTION'
```

### Good signs

```
[RufayqStartup] Push registration attempt
[RufayqStartup] Push permission result: granted
[RufayqStartup] Push listener setup success
[RufayqStartup] Push native register success
[RufayqStartup] Push token received
[RufayqStartup] Push token upsert success
```

Or, if the user denies the permission:

```
[RufayqStartup] Push permission result: denied
[RufayqStartup] Push registration failed safely: permission_denied
```

App remains usable in both cases.

### Bad signs (native Firebase not configured)

Any of the following indicates Firebase is not wired up natively:

- `Default FirebaseApp is not initialized`
- `Missing google_app_id`
- `FirebaseOptions` errors at startup
- `google-services.json` not found / parse error
- `FirebaseMessaging` SERVICE_NOT_AVAILABLE
- `registrationError` event from `PushNotifications`

The smoke script
([`scripts/qa/android-splash-smoke.sh`](../../scripts/qa/android-splash-smoke.sh))
classifies any of these as **LIKELY FIREBASE NOT CONFIGURED** in the per-row
Markdown report.

## 6. Verify token saved to the backend

After a successful token reception, the row checklist in the smoke report
should show:

```
- Token received: yes
- Token saved to backend: yes
```

If `Token received: yes` but `Token saved to backend: no`, check the
`device_push_tokens` RLS policy for the signed-in user.
