# One-command Android device QA script

Wrap the existing pieces (`build-android-apk.sh` + `qa/android-splash-smoke.sh`) into a single entry point so a tester can run one command on a connected device.

## New file

`scripts/qa/android-device-qa.sh` — orchestrates:

1. **Preflight**: assert `adb` is on PATH and exactly one authorised device is connected (mirrors the smoke script's check, but fails earlier).
2. **Clean uninstall**: `adb uninstall com.rufayq.app` (suppress error if not installed).
3. **Build APK**: invoke `MODE="$MODE" VARIANT="$VARIANT" ./scripts/build-android-apk.sh`. `MODE` defaults to `bundled`, `VARIANT` to `Debug`. Both overridable via env.
4. **Install**: `adb install -r android/app/build/outputs/apk/<variant>/app-<variant>.apk` (path computed from `VARIANT`).
5. **Run smoke test**: `APK=<path> ./scripts/qa/android-splash-smoke.sh`, forwarding `VERBOSE`.
6. **Print report path**: locate the newest `qa-artifacts/<timestamp>/report.md`, print its absolute path, byte size, and the final classification line (last non-empty line of the report) so the tester sees pass/fail at a glance.

The script uses `set -euo pipefail`, color-coded `[qa]` log prefixes consistent with the smoke script, and exits non-zero with a clear message if any phase fails (build, install, smoke). If smoke fails, the report path is still printed before exiting.

## Usage

```bash
./scripts/qa/android-device-qa.sh                        # bundled debug APK
MODE=remote ./scripts/qa/android-device-qa.sh            # remote-URL shell
VARIANT=Release VERBOSE=1 ./scripts/qa/android-device-qa.sh
```

## Files touched

- **new**: `scripts/qa/android-device-qa.sh` (executable, `chmod +x`)
- **edit**: `docs/qa/android-splash-handoff-smoke.md` — add a "One-command run" section at the top pointing at the new script; keep the existing step-by-step instructions for advanced users.

Please add a diagnostic APK artifact preflight to `scripts/build-android-apk.sh`.

Important:

- Only touch `scripts/build-android-apk.sh`.

- Do not change Gradle files.

- Do not change Capacitor config.

- Do not change CI workflows.

- Do not change the release AAB script/path.

- This is only for APK build diagnostics.

Context:

The script currently has a terse post-Gradle check like:

```bash

[ -f "$OUT" ] || { echo "✗ APK not produced at $OUT"; exit 1; }

Please add a one-command Android device QA wrapper script.

Goal:

A tester with one connected Android device should be able to run a single command that:

1. verifies adb/device state,

2. clean-installs fresh APK,

3 builds APK,

4. installs it,

5. runs the Android splash test6 prints the report path and summary.

Important current context:

- This enhancement `scripts/build-androidk.sh` scripts/[buildandroid-apk.sh](http://buildandroid-apk.sh)` does not in the current branch, do silently invent incompatible behavior. Either:

 1. and say this wrapper depends on that script,

  . create/use it only it exists in theable branch APK builds supported.

- Do not modify Gradle, Capacitor config, CI workflows, or the existing smoke script.

- Do not change release AAB behavior.

- Keep this scoped to local connected-device QA.

Files to touch:

1. New executable file:

   `scripts/qa/android-device-qa.sh`

2. Edit:

   `docs/qa/android-splash-handoff-smoke.md`

Do not touch unrelated files.

---

## New script: `scripts/qa/android-device-qa.sh`

Create an executable Bash script with:

```bash

#!/usr/bin/env bash

set -euo pipefail

---

### **Logging**

Use color-coded [qa] prefixes fall when helpersinfo "[qa }  
{s $*"1; }

  
`Optionally colorize:`  
`- blue/info`  
`- green/success`  
`- red/failure`  
`- yellow/warning`  
  
`### Preflight`  
  
`1. Verify adb exists:`  
  
````bash`  
`command -v adb >/dev/null 2>&1 || fail "adb not found on PATH"`  


2. Verify exactly one authorized device is connected.

Use:

`adb devices`  


Parse only lines where the second column is device.

Fail clearly if:

- zero devices are connected,
- multiple devices are connected,
- a device is una offline- adb device connected Connect a and accept USB-Multiple adb devices. Disconnect extras up for this script  
line device. and accept the USB debugging prompt.`

Print the selected device serial.

### **Verify build script exists**

Before building, verify:

`[ -x scripts/build-android-apk.sh ]`  


If missing or not executable, fail with:

`scripts/build-android-apk.sh is required for android-qa. add/fix APK build script first.`  
  
`If present but not, clearly or run via bash scripts-android.sh`. failing clearly requested should be executable.`  
  
 `Clean uninstallRun:`  
  


uninstall "$APP"2>& ||```

Log were removed.

:

`MODEMODEIANT="$"scripts-android-apk.sh`` it, non a clear message Verify APK installAfter verify:`  
  
`bash[ - "$AP`  
  
 `or empty- path,`  
`- to IAN,`  
`- hint that scripts/build-androidk.sh` produced it.`  
  
 `Install APK`  
  
`Run:`  
  
`bashadb "$APK_PATH````  
  
`If install fails, non-zero with### Run smoke test`  
  
`:`  
  
`bashAPK="$_PATH VERBOSEVERBOSE" ./scripts/qa/android-splashoke.sh`  
```  
  
`Important- Capture the smoke exit code- If smoke still the newest before exiting non- not smoke output.`  
  
`Implementation approach:`  
  
`bashset +e`  
`="$APK" VERBOSEBOSE" ./scriptsqa/android-splashoke.sh`  
`SMOKE_STATUS=$set -e`  
 `always report summary Print newest report summary`  
  
`Locate newest report:`  
  


REPORT="$(find-artifacts -path '/null | head -n 1 || true)"

  
`If found:`  
`- print absolute path,`  
`- print byte size,`  
`- print final classification line.`  
  
`Absolute path:`  
  
`bash`  
`REPORT_AB "$REPORT")" pwd)/ "$REPORTByte size:`  
  
`bash`  
`BY="$(wc  | tr -d ' ')"`  


Final:

- last non-empty line of report:

bashCLASSIFICATION="$(awk 'NF line=$0 END { line }' "$REPORT"  
``Print:

`[ Report:/to/report[qa] Report: 45[] Final classification: PASS`  


If no report is found, print a warning but do not mask the original smoke status.

### **Exit behavior**

- If preflight/build/install fails: exit non-zero immediately with clear message.
- If smoke fails:
  - print report summary,
  - exit with the smoke status.
- If everything passes:
  - print report summary,
  - exit 0.

---

## **Docs update**

Edit docs/qa/android-splash-handoff-smoke.md.

Add a new section near the top:

`## One-command device QA`  
  
`For local device QA use wrapper:`  
  
````bash`  
`./scripts/qa-device-qa.sh`  


:

- MODE=bund  
VARIANT= _ID=comufay

Examples```bash  
MODE= ./qaqa VERBOSEscriptsqa.sh that one authorized,  
2. un.rufayq.app, 3. builds the APK through scripts/build-android-apk.sh, 4. installs the APK, 5. runs scripts/qa/android-splash-smoke.sh`,  
6. prints the newest report path, size, and final classification.

If smoke fails, the wrapper still prints the report path before exiting non-zero.

  
`Keep the existing step-by-step instructions below for advanced/manual users.`  
  
`---`  
  
`## Acceptance criteria`  
  
`1. scripts/qa/android-device-qa.sh exists and is executable.`  
`2. bash -n scripts/qa/android-device-qa.sh passes with with..`  
`.-apk.sh clearly does/s.`  
`6. Script computes APK path from VARIANT.`  
`7. Script forwards MODE, VARIANT, and VERBOSE.`  
`8. Script prints newest smoke report absolute path, byte size, and final classification.`  
`9. If smoke fails, the report summary is still printed before non-zero exit.`  
`10. Documentation includes the one-command usage section.`  
  
Out of scope

- No changes to `build-android-apk.sh`, the smoke script, Gradle, Capacitor config, or CI workflows.