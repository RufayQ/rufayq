Please implement the Android splash-handoff / blackout fix based on the investigation below. Do not add unrelated features or redesign existing UI.

Context:

The issue is likely not primarily “excessive memory.” It is more likely a native WebView startup / splash-handoff problem because:

- `capacitor.config.ts` points to `https://rufayq.com`, but `scripts/build-android.sh` removes the entire `server` block before `npx cap sync android`.

- APKs/AABs built with that script therefore use bundled `dist/` assets, not `https://rufayq.com`.

- The React app has dark/blank fallbacks such as route fallback/auth fallback that can look like a black screen if auth, session, chunks, or network stalls.

- There is no explicit `SplashScreen.hide()` call from the React boot path, so the app depends on Capacitor defaults instead of a controlled “React is alive” signal.

- Memory remains possible only if logs show `OutOfMemoryError`, `Renderer process gone`, `Low memory killer`, WebView renderer crashes, or similar indicators.

Goal:

Make Android startup deterministic and debuggable. The app should never silently appear as a black/navy screen after the native splash. It should either:

1. hand off into the app,

2. show a branded RufayQ loading/auth/offline/error state, or

3. produce a smoke-test report that clearly categorizes the likely failure.

Please make the following changes.

---

## 1. Add explicit Capacitor splash handoff

Add a small native-safe startup helper that hides the Capacitor native splash screen after the first React paint.

Requirements:

- Use `@capacitor/splash-screen`.

- Only run inside native Capacitor, not normal web preview/browser.

- Do not throw if Capacitor plugins are unavailable.

- Schedule hide after React has mounted/painted, for example using `requestAnimationFrame`.

- Add a short fallback timeout so the native splash cannot stay forever if a route chunk, auth check, or network call stalls.

- Keep the helper small and reusable, for example:

  - `src/lib/native/splashHandoff.ts`

  - or a similarly appropriate location.

Suggested behavior:

- On app boot, once React is alive, call `SplashScreen.hide()`.

- Also set a fallback timer around 1500–3000ms to call hide if the first paint path stalls.

- Guard this with `Capacitor.isNativePlatform()` or equivalent.

- Catch and log errors non-fatally.

Then wire this helper into the main app bootstrap path, such as `src/App.tsx`, `src/main.tsx`, or the existing top-level app shell.

Important:

- Do not wrap imports in try/catch.

- Avoid changing unrelated app behavior.

- The purpose is a controlled “React is alive, hide native splash” signal.

---

## 2. Replace silent black fallbacks with branded visible loading UI

Find the app’s dark/blank loading fallbacks, especially:

- route-level fallback in `App.tsx` / router lazy loading,

- auth/session fallback such as `AppAuthGuard`,

- any full-screen fallback that currently renders a plain dark or empty screen.

Replace them with a branded RufayQ startup/loading screen.

Requirements:

- The screen should make it clear the app is loading, not blacked out.

- It should use existing project styling/design tokens where possible.

- Include simple branding text such as “RufayQ” and a loading message like:

  - “Preparing your care experience…”

  - “Loading securely…”

- Keep it lightweight and safe for initial boot.

- Avoid network-dependent images.

- Reuse one shared component if practical, for example:

  - `src/components/common/AppStartupFallback.tsx`

  - `src/components/AppStartupFallback.tsx`

  - or an existing shared UI location.

Use this same branded fallback for:

- lazy route fallback,

- auth guard loading,

- any current blank/dark full-screen loading state that can appear during startup.

Do not introduce a heavy dependency just for this screen.

---

## 3. Clarify Android build modes

Update the Android build/run documentation and scripts so it is obvious whether a build is:

### Remote URL mode

- Loads `https://rufayq.com`

- Requires network

- Uses the `server.url` block in `capacitor.config.ts`

### Bundled mode

- Loads local `dist/`

- Should work offline

- Removes or omits the `server` block before Capacitor sync/build

Specifically:

- Inspect `scripts/build-android.sh`.

- If it removes the `server` block, make its output/logging explicitly say that the resulting Android build is “bundled/offline mode.”

- If there is a separate workflow for remote URL mode, document it.

- If no remote build script exists, add clear comments/docs explaining how to run each mode without accidentally confusing them.

- Update relevant docs, for example existing Android/QA docs or create a small `docs/android-build-modes.md` if no suitable doc exists.

Do not silently change build mode behavior unless needed. The main fix is clarity and startup handling.

---

## 4. Upgrade the Android splash smoke report diagnostics

Update `scripts/qa/android-splash-smoke.sh` so the generated report helps distinguish memory problems from loading/startup problems.

Extend log capture/filtering to flag these categories:

### Network/WebView load failures

Look for indicators such as:

- `ERR_NAME_NOT_RESOLVED`

- `ERR_INTERNET_DISCONNECTED`

- `ERR_CONNECTION`

- `net::ERR`

- WebView page load failures

### JS/chunk/load failures

Look for:

- failed dynamic imports,

- chunk load errors,

- missing asset errors,

- JavaScript exceptions during startup.

### Native crashes

Look for:

- `FATAL EXCEPTION`

- `AndroidRuntime`

- process crash messages.

### WebView renderer crashes

Look for:

- `Renderer process gone`

- `RenderProcessGone`

- WebView renderer crash messages.

### Memory pressure indicators

Look for:

- `OutOfMemoryError`

- `Low memory`

- `lowmemorykiller`

- `LMKD`

- `Trim memory`

- `onTrimMemory`

The report should include a “Likely failure category” or similar summary, for example:

- `PASS: splash handed off`

- `LIKELY NETWORK / REMOTE URL LOAD FAILURE`

- `LIKELY JS / CHUNK LOAD FAILURE`

- `LIKELY NATIVE CRASH`

- `LIKELY WEBVIEW RENDERER CRASH`

- `POSSIBLE MEMORY PRESSURE`

- `UNKNOWN: no clear indicator found`

Also add a preflight/report line showing whether the installed app/test target appears to be:

- Remote URL mode,

- Bundled mode,

- or Unknown.

If it is not possible to reliably inspect the installed app mode from adb, then report “Unknown” and include the local `capacitor.config.ts` mode as a hint. Do not make the script brittle.

Keep the script POSIX/bash-safe and avoid requiring optional tools unless gracefully checked.

---

## 5. Validation

After making changes, run the checks that are available in this project.

At minimum:

- Syntax-check changed shell scripts:

  - `bash -n scripts/qa/android-splash-smoke.sh`

  - `bash -n scripts/build-android.sh` if modified

- Run TypeScript/build checks if available:

  - `npm run typecheck`

  - or the project’s equivalent

- Run lint/build/test only if dependencies are available.

If some commands cannot run because dependencies or Android device/emulator are unavailable, clearly state that as an environment limitation.

The final proof should be a fresh install on a physical Android device/emulator using the updated smoke script.

---

## Acceptance criteria

This fix is complete when:

1. The app explicitly calls `SplashScreen.hide()` from the React/native boot path after React is alive.

2. The native splash has a fallback hide timeout so it cannot hang indefinitely.  
  
3. Web preview/browser behavior is unaffected.

4. Startup/auth/route loading states are visibly branded and no longer look like a black screen.

5. Android build mode docs/script output clearly distinguish remote URL mode from bundled/offline mode.

6. The Android smoke script report flags likely causes including:

   - network failure,

   - JS/chunk failure,

   - native crash,

   - WebView renderer crash,

   - memory pressure.

7. Existing app behavior is not otherwise changed.

8. The final response lists changed files and exact validation commands/results.

&nbsp;