# Android Splash Handoff — E2E Device Smoke Test

Purpose: catch the "blacked-out app" regression where the Capacitor WebView never
hands off from the navy `#0B2A3A` splash because the configured `server.url`
(or the bundled `dist/`) fails to render.

Run on a **physical Android device or emulator** after every change to:

- `capacitor.config.ts` (`server.url`, `cleartext`, splash config)
- `android/app/src/main/AndroidManifest.xml` (network security, intent filters)
- `public/sw.js`, `src/lib/registerSW.ts` (anything cached at first paint)
- A new release candidate APK / AAB before Play upload

---

## Pre-flight (one-time per machine)

```bash
adb devices                       # device must be listed and "device", not "unauthorized"
adb shell settings get global airplane_mode_on    # 0 = off
```

Install the release-candidate APK fresh (uninstall first to guarantee a cold
launch with no cached state):

```bash
adb uninstall com.rufayq.app || true
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## Test matrix

Every row must pass before the build ships.

| # | Scenario                              | Network            | Expected outcome                                                            | Max time |
|---|---------------------------------------|--------------------|-----------------------------------------------------------------------------|----------|
| 1 | Fresh install, first launch           | Wi-Fi online       | Splash → RufayQ landing/auth screen renders; no navy hang                   | ≤ 3 s    |
| 2 | Warm relaunch (kill + reopen)         | Wi-Fi online       | Splash → last screen or auth; smooth handoff                                | ≤ 2 s    |
| 3 | Cold launch, airplane mode ON         | No network         | Either (a) cached shell renders with offline notice, or (b) explicit "no connection" screen — **never** infinite navy | ≤ 4 s |
| 4 | Cold launch, captive-portal Wi-Fi     | Wi-Fi, no internet | Same as #3 — must not hang on splash                                        | ≤ 5 s    |
| 5 | Cold launch, slow 3G (throttled)      | 400 kbps           | Splash holds, then handoff to app                                           | ≤ 10 s   |
| 6 | Background → foreground after 5 min   | Wi-Fi online       | Returns to last screen, no re-splash loop                                   | ≤ 1 s    |
| 7 | Deep link from notification           | Wi-Fi online       | Opens directly to target screen                                             | ≤ 3 s    |

**Failure signal for any row:** the navy splash (`#0B2A3A`) is still visible
after the max time, OR the WebView is white/empty, OR `logcat` shows
`ERR_*` from `chromium`/`Capacitor`.

---

## Automated runner

`scripts/qa/android-splash-smoke.sh` automates rows 1, 2, 3, and 6 and prints
a pass/fail report. Manual rows (4, 5, 7) still need a human.

```bash
./scripts/qa/android-splash-smoke.sh
```

Exit code `0` = all automated rows passed. Non-zero = at least one row failed;
re-run with `VERBOSE=1` to see captured screenshots and logcat slices.

Outputs land in `./qa-artifacts/<timestamp>/`:

- `row-<n>-pre.png` — screenshot just after launch
- `row-<n>-post.png` — screenshot after the handoff window
- `row-<n>-logcat.txt` — filtered logcat (Capacitor + chromium)
- `report.md` — human-readable summary, ready to paste into a PR

---

## Manual verification cheatsheet

If you do not have the script:

1. **Force-stop and clear:** `adb shell pm clear com.rufayq.app`
2. **Cold launch:** `adb shell monkey -p com.rufayq.app -c android.intent.category.LAUNCHER 1`
3. **Watch logcat in another tab:**
   `adb logcat -s Capacitor:* chromium:* CapacitorPlugins:* AndroidRuntime:E`
4. **Screenshot at t = 3 s:** `adb exec-out screencap -p > t3.png`
5. If `t3.png` is solid navy → FAIL. Capture full logcat and attach to bug.

---

## What "PASS" means

A passing run proves:

- `server.url` resolves and renders from a real device (not just a desktop browser).
- TLS / network-security config does not block the load.
- The splash plugin hides on `DOMContentLoaded` (or your configured event), not on a fixed timer that masks a broken load.
- Offline launch degrades gracefully — no infinite splash.

If row 3 (airplane mode) regresses, the symptom is identical to the original
"blacked out app" bug. Investigate the same way: check `capacitor.config.ts`,
WebView console (`chrome://inspect`), and `registerSW.ts` for any blocking
import.
