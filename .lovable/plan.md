The consolidated FCM hardening plan is good, but please verify it is actually implemented in the repo and live domain.

  
Please make only the scoped changes listed below.

1. In `src/lib/native/push.ts`:

   - Add PushNotifications listeners before calling `PushNotifications.register()`.

   - Wrap every native/plugin call in try/catch:

     - requestPermissions

     - createChannel

     - addListener

     - register

     - token upsert

   - Return a structured `PushRegistrationResult` with:

     web, not_native, missing_plugin, permission_denied, firebase_not_configured, registration_failed, token_upsert_failed, listener_setup_failed, already_registered, unknown.

   - Add `[RufayqStartup]` logs for:

     Push registration attempt

     Push permission result

     Push listener setup success/fail

     Push native register success/fail

     Push token received

     Push token upsert success/fail

     Push registration failed safely: <reason>

   - Classify Firebase-native errors such as:

     Default FirebaseApp is not initialized

     Missing google_app_id

     SERVICE_NOT_AVAILABLE

     google-services

     FirebaseMessaging

     as `firebase_not_configured` where applicable.

2. In `src/components/PushPermissionPrompt.tsx`:

   - Keep native prompt user-action only.

   - Wrap `enable()` in try/catch.

   - Unexpected failures must show a toast and log `[RufayqStartup] Push registration failed safely: unknown`, not throw.

3. In `src/pages/Index.tsx`:

   - Remove automatic `registerPush(...)` after patient login.

   - Replace it with:

     `[RufayqStartup] Auto-push disabled, awaiting user opt-in`

   - Push registration should only happen after the user taps Enable.

4. In `scripts/qa/android-splash-smoke.sh`:

   - Extend log filters for:

     FirebaseApp

     FirebaseMessaging

     google_app_id

     google-services

     SERVICE_NOT_AVAILABLE

     registrationError

     PushNotifications

   - Add report checklist:

     React mounted: yes/no

     Push prompt mounted: yes/no

     Push registration attempted: yes/no

     Firebase initialized: yes/no

     Token received: yes/no

     Token saved to backend: yes/no

     Error boundary rendered: yes/no + error name/message

   - Add classification:

     LIKELY FIREBASE NOT CONFIGURED

5. Add `docs/qa/fcm-verification.md`:

   - Include exact commands to verify:

     android/app/google-services.json exists

     package_name is [com.rufayq.app](http://com.rufayq.app)

     Google Services Gradle plugin is applied

     POST_NOTIFICATIONS permission exists

     fresh APK build/install

     adb logcat filter

     expected good/bad FCM signs

   - Cross-link it from `docs/mobile-setup.md` and `docs/qa/android-splash-handoff-smoke.md`.

Important:

- Do not claim browser preview proves FCM. The push prompt does not normally show on web because `isNative` is false.

- For browser preview, it is enough that direct `registerPush()` returns a safe web/not_native result if invoked by a test harness.

- Real FCM verification requires Android native project + google-services.json + adb logcat.

Final response must include:

- changed files,

- exact markers added,

- confirmation that auto-registration was removed,

- smoke-script classification output,

- local Android verification commands,

- and whether adb showed token receipt/token backend save.

&nbsp;