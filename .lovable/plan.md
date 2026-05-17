## What I found

- The screenshot is no longer a pure native blackout: React is starting and the app error boundary is rendering `We hit a startup error`.
- `https://rufayq.com` is published with the startup markers: browser logs show `[RufayqStartup] React mounted` from the live custom domain.
- The patient shell chunk on the live domain contains the FCM/native push code (`PushNotifications`) and startup patient bootstrap code.
- FCM is a plausible suspect, not because of memory first, but because Capacitor push can crash/throw on Android if the native Firebase setup is incomplete or stale, especially around `PushNotifications.register()`.
- The current smoke script can classify black/splash screens, but it does not yet capture the new visible error-boundary case or include enough React error-boundary details.

## Plan

1. **Add startup phase markers around the real patient app mount path**
  - Add concise console markers in `Index.tsx` around: patient shell render, patient bootstrap start/end/fail, global chat setup, deep-link listener setup, push prompt mount, and push registration attempt.
  - Keep markers under the existing `[RufayqStartup]` prefix so adb/logcat can locate the exact point after which failure begins.
2. **Harden FCM/push so it cannot take down startup**
  - Change `src/lib/native/push.ts` so plugin import/permission/register/listener setup is fully guarded and logged.
  - Do not call native push registration automatically during startup; only after a user action or confirmed post-login path.
  - Catch and return structured reasons for failures such as missing plugin, Firebase not initialized, permission denied, or registration failure.
  - Ensure a push failure logs a warning and leaves the app usable.
3. **Avoid unauthenticated startup requests that are currently failing noisily**
  - Gate global chat unread tracking so it does not query protected chat tables for guest/unauthenticated users.
  - Gate audit writes for unauthenticated guest flows if the table rejects them, so repeated 401s don’t pollute startup diagnostics.
  - This does not add a new feature; it reduces startup failure surface.
4. **Improve the visible startup error screen diagnostics**
  - Keep the branded fallback, but include a short non-technical recovery message and log the actual error name/message to console/logcat.
  - Add a stable marker like `[RufayqStartup] ErrorBoundary rendered` so the smoke report can classify this as “React started, then render/startup error”.
5. **Update the Android smoke script classification**
  - Detect the error-boundary marker and classify it as `REACT STARTED THEN STARTUP ERROR BOUNDARY`.
  - Include nearby logcat excerpt lines around `RufayqStartup`, `PushNotifications`, `FirebaseApp`, `FCM`, `AndroidRuntime`, `OutOfMemoryError`, `ChunkLoadError`, and `net::ERR_*`.
  - Preserve existing cases for JS boot failure, remote URL/network failure, chunk load failure, renderer crash, and memory pressure.
6. **Document the correct FCM/native requirement without changing app features**
  - Update the Android smoke docs to state that if FCM is enabled, the Android project must include the correct Firebase config (`google-services.json`) before testing push registration.
  - Explicitly note that missing/invalid Firebase native config can present as a startup crash after React begins, not just as a push error.

### **1. Add phase markers, but make them ordered and searchable**

Ask them to add markers like:

`[RufayqStartup] main.tsx render start`  
`[RufayqStartup] React mounted`  
`[RufayqStartup] Index render start`  
`[RufayqStartup] Patient bootstrap start`  
`[RufayqStartup] Patient bootstrap success`  
`[RufayqStartup] Patient bootstrap failed: <name> <message>`  
`[RufayqStartup] Deep link listener setup start`  
`[RufayqStartup] Deep link listener setup success`  
`[RufayqStartup] Global chat setup start`  
`[RufayqStartup] Global chat skipped: unauthenticated`  
`[RufayqStartup] Push prompt mounted`  
`[RufayqStartup] Push registration attempt`  
`[RufayqStartup] Push registration failed safely: <reason>`  
`[RufayqStartup] ErrorBoundary rendered: <name> <message>`  


The ordering matters. You need to know the **last successful marker** before the error.

### **2. Do not auto-register push during startup**

This is especially important.

The current code registers push after successful patient login. 【F:src/pages/Index.tsx†L242-L251】

That is not exactly “cold app startup,” but it can still be part of the first-login startup path. I would ask Lovable to temporarily disable automatic post-login registration and leave push registration only behind a user tap until the app is stable.

### **3. Harden registerPush**

The push module should return structured results and never allow ordinary registration failures to escape.

Suggested result shape:

`type PushRegistrationResult =`  
  `| { ok: true }`  
  `| {`  
      `ok: false;`  
      `reason:`  
        `| "web"`  
        `| "not_native"`  
        `| "missing_plugin"`  
        `| "permission_denied"`  
        `| "firebase_not_configured"`  
        `| "registration_failed"`  
        `| "listener_setup_failed"`  
        `| "unknown";`  
      `message?: string;`  
    `};`  


And it should log with startup markers:

`[RufayqStartup] Push registration attempt`  
`[RufayqStartup] Push permission result: granted/denied`  
`[RufayqStartup] Push register failed safely: firebase_not_configured ...`  


### **4. Capture the error boundary’s actual error**

The boundary should log:

`console.error("[RufayqStartup] ErrorBoundary rendered", {`  
  `name: error.name,`  
  `message: error.message,`  
  `stack: error.stack,`  
`});`  


The UI can stay non-technical, but adb/logcat needs the actual error.

### **5. Update smoke classification for visible error-boundary state**

This is a good addition. The smoke script should now distinguish:

`PASS: app rendered normal screen`  
`JS DID NOT REACH REACT BOOT`  
`REACT STARTED THEN STARTUP ERROR BOUNDARY`  
`REACT RENDERED BLANK / STARTUP UI FAILURE`  
`LIKELY REMOTE URL / NETWORK FAILURE`  
`LIKELY JS / CHUNK LOAD FAILURE`  
`LIKELY PUSH / FIREBASE STARTUP FAILURE`  
`LIKELY NATIVE CRASH`  
`LIKELY WEBVIEW RENDERER CRASH`  
`POSSIBLE MEMORY PRESSURE`  
`UNKNOWN`  


---

## **What I would send back to Lovable**

Paste this:

`This discovery makes sense, but please prove FCM/push with ordered markers and the actual error boundary payload.`  
  
`The screenshot showing “We hit a startup error” means React is starting and the native splash handoff is no longer the only failure. Please treat this as “React started, then startup/render error,” not as a pure native blackout.`  
  
`Please implement the following narrowly:`  
  
`1. Add ordered startup markers under the exact prefix [RufayqStartup]:`  
   `- main.tsx render start`  
   `- React mounted`  
   `- Index render start`  
   `- patient bootstrap start/success/fail`  
   `- global chat setup start/skipped/success/fail`  
   `- deep-link listener setup start/success/fail`  
   `- push prompt mounted`  
   `- push registration attempt`  
   `- push registration success/fail-safe with reason`  
   `- ErrorBoundary rendered with error name/message`  
  
`2. In the error boundary, log the actual caught error:`  
   `- error.name`  
   `- error.message`  
   `- error.stack`  
   `- component stack`  
   `Keep the user-facing screen simple, but adb/logcat must contain the real error.`  
  
`3. Harden src/lib/native/push.ts:`  
   `- Do not let permission/register/listener/channel setup throw into app startup.`  
   `- Wrap the whole native push flow in defensive try/catch.`  
   `- Return structured failure reasons:`  
     `web/not_native, missing_plugin, permission_denied, firebase_not_configured, registration_failed, listener_setup_failed, unknown.`  
   `- Log every phase with [RufayqStartup].`  
   `- If Firebase/native config is missing, log a warning and keep the app usable.`  
  
`4. Temporarily remove automatic push registration from first patient login/startup.`  
   `- Push registration should only happen after an explicit user action from the push prompt until startup is proven stable.`  
   `- The prompt can still mount, but it must not call native push APIs unless the user taps Enable.`  
  
`5. Gate global chat startup work for unauthenticated/guest users.`  
   `- Do not query protected chat tables or subscribe to protected realtime channels until a valid user/session or allowed guest condition is confirmed.`  
   `- Log skipped state with [RufayqStartup] Global chat skipped: unauthenticated.`  
  
`6. Update the Android smoke script:`  
   `- Detect [RufayqStartup] ErrorBoundary rendered.`  
   `- Classify that as REACT STARTED THEN STARTUP ERROR BOUNDARY.`  
   `- Include a nearby log excerpt around:`  
     `RufayqStartup, PushNotifications, FirebaseApp, FirebaseMessaging, FCM, AndroidRuntime, OutOfMemoryError, ChunkLoadError, net::ERR_.`  
   `- Add a specific classification for likely push/Firebase failure if Firebase/Push logs appear before the error boundary.`  
  
`7. Update Android smoke docs:`  
   `- If FCM is enabled, Android must include the correct google-services.json.`  
   `- Missing/stale Firebase native config can present after React starts, especially if push registration is attempted.`  
  
`Please provide the adb evidence in this exact format:`  
  
`React mounted: yes/no`  
`Patient shell mounted: yes/no`  
`Patient bootstrap started: yes/no`  
`Patient bootstrap completed: yes/no`  
`Global chat setup attempted: yes/no`  
`Push prompt mounted: yes/no`  
`Push registration attempted: yes/no`  
`Push registration failed safely: yes/no + reason`  
`Error boundary rendered: yes/no + error name/message`  
`Splash hide requested: yes/no`  
`Classification: exact startup phase/cause`  
  
`Most important: include the actual error boundary error name/message from adb/logcat. Without that, FCM is only a plausible suspect, not proven.`  


---

## **What I would check on the device right now**

Run this against the failing device:

`adb logcat -c`  
`adb shell monkey -p com.rufayq.app -c android.intent.category.LAUNCHER 1`  
`sleep 8`  
`adb logcat -d -v time | grep -Ei 'RufayqStartup|We hit a startup error|ErrorBoundary|PushNotifications|FirebaseApp|FirebaseMessaging|FCM|google-services|AndroidRuntime|FATAL EXCEPTION|OutOfMemoryError|Renderer process|RenderProcessGone|ChunkLoadError|TypeError|ReferenceError|net::ERR_'`  


### **If you see this**

`[RufayqStartup] Push registration attempt`  
`FirebaseApp...`  
`[RufayqStartup] ErrorBoundary rendered ...`  


Then FCM/push is very likely involved.

### **If you see this**

`[RufayqStartup] Index render start`  
`[RufayqStartup] ErrorBoundary rendered TypeError ...`  


with no push/Firebase logs, then it is probably a normal React render/bootstrap bug, not FCM.

### **If you see this**

`ChunkLoadError`  
`Failed to fetch dynamically imported module`  


then it is a deployment/chunk mismatch.

### **If you see this**

`net::ERR_NAME_NOT_RESOLVED`  
`net::ERR_INTERNET_DISCONNECTED`  


then it is remote URL/network loading.

### **If you see this**

`Renderer process gone`  
`OutOfMemoryError`  
`lowmemorykiller`  


then memory/WebView renderer crash becomes much more likely.

---

## **My recommendation**

I would approve Lovable’s plan **with one correction**:

> *Do not assume FCM is the cause yet. Instrument first, disable automatic push registration during startup, and require the error boundary’s real error message from adb/logcat.*

The plan is good because it turns the next run into a deterministic answer:

`React mounted: yes`  
`Splash hide requested: yes`  
`Error boundary rendered: yes`  
`Push registration attempted: yes/no`  
`Error: exact message`  


That is exactly what you need now.

---

## **Commands I used to validate the current repo state**

- ✅ rg -n "PushNotifications|registerPush|push|notification|global chat|unread|audit|RufayqStartup|ErrorBoundary|setupDeep|deep link|useEffect" src/lib src/pages src/components src/hooks -S
- ✅ nl -ba src/lib/native/push.ts | sed -n '1,260p'; rg -n "push|Push|notification|deep|chat|bootstrap|useEffect|RufayqStartup|setup" src/pages/Index.tsx -S
- ✅ nl -ba src/pages/Index.tsx | sed -n '238,310p'; nl -ba src/components/PushPermissionPrompt.tsx | sed -n '1,120p'; nl -ba src/hooks/useGlobalChat.ts | sed -n '1,200p'; nl -ba src/hooks/usePatientBootstrap.ts | sed -n '1,80p'## Short answer  
Expected result

After implementation, adb/logcat should answer the key question directly:

```text
React mounted: yes/no
Patient shell mounted: yes/no
Push registration attempted: yes/no
Push registration failed safely: yes/no + reason
Error boundary rendered: yes/no + error message
Splash hide requested: yes/no
Classification: exact startup phase/cause
```

If FCM is the cause, the next smoke report should show React booting, then a push/Firebase-related marker or native log before the error boundary/crash. If FCM is not the cause, the added markers will show the next failing phase without changing unrelated features.