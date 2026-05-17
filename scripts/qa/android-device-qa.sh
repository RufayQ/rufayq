#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-command Android device QA
#
# Verifies a connected device, clean-uninstalls com.rufayq.app, builds an
# installable APK via scripts/build-android-apk.sh, installs it, runs the
# splash-handoff smoke test, and prints the report path + final classification.
#
# Usage:
#   ./scripts/qa/android-device-qa.sh                  # bundled debug APK
#   MODE=remote ./scripts/qa/android-device-qa.sh      # remote-URL shell
#   VARIANT=Release VERBOSE=1 ./scripts/qa/android-device-qa.sh
#
# Env:
#   MODE      bundled (default) | remote   — forwarded to build-android-apk.sh
#   VARIANT   Debug   (default) | Release  — forwarded; drives APK output path
#   VERBOSE   0 (default) | 1              — forwarded to smoke script
#   APP_ID    com.rufayq.app (default)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_ID="${APP_ID:-com.rufayq.app}"
MODE="${MODE:-bundled}"
VARIANT="${VARIANT:-Debug}"
VERBOSE="${VERBOSE:-0}"

info()  { printf '\033[36m[qa]\033[0m %s\n' "$*"; }
ok()    { printf '\033[32m[qa]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[qa]\033[0m %s\n' "$*"; }
fail()  { printf '\033[31m[qa]\033[0m %s\n' "$*" >&2; exit 1; }

# ── Preflight ───────────────────────────────────────────────────────────────
command -v adb >/dev/null 2>&1 || fail "adb not found on PATH"

DEVICE_LINES=$(adb devices | awk 'NR>1 && NF>=2 {print}')
AUTH_COUNT=$(printf '%s\n' "$DEVICE_LINES" | awk '$2=="device" {c++} END {print c+0}')
UNAUTH=$(printf '%s\n' "$DEVICE_LINES" | awk '$2=="unauthorized" {c++} END {print c+0}')
OFFLINE=$(printf '%s\n' "$DEVICE_LINES" | awk '$2=="offline" {c++} END {print c+0}')

if [ "$AUTH_COUNT" -eq 0 ]; then
  [ "$UNAUTH" -gt 0 ] && fail "device is unauthorized — accept the USB debugging prompt and retry"
  [ "$OFFLINE" -gt 0 ] && fail "device is offline — reconnect USB and retry"
  fail "no authorised Android device/emulator detected. Run 'adb devices' to debug."
fi
if [ "$AUTH_COUNT" -gt 1 ]; then
  fail "multiple devices connected ($AUTH_COUNT). Disconnect extras or set ANDROID_SERIAL."
fi

SERIAL=$(printf '%s\n' "$DEVICE_LINES" | awk '$2=="device" {print $1; exit}')
info "device: $SERIAL"
info "app:    $APP_ID"
info "mode:   $MODE   variant: $VARIANT"

# ── Verify build script ─────────────────────────────────────────────────────
BUILD_SCRIPT="scripts/build-android-apk.sh"
if [ ! -f "$BUILD_SCRIPT" ]; then
  fail "$BUILD_SCRIPT is required for android-qa. Add/fix the APK build script first."
fi
[ -x "$BUILD_SCRIPT" ] || chmod +x "$BUILD_SCRIPT"

# ── Clean uninstall ─────────────────────────────────────────────────────────
info "uninstalling $APP_ID (if installed)…"
adb uninstall "$APP_ID" >/dev/null 2>&1 || true
ok "uninstall step complete"

# ── Build APK ───────────────────────────────────────────────────────────────
info "building APK via $BUILD_SCRIPT…"
MODE="$MODE" VARIANT="$VARIANT" "./$BUILD_SCRIPT"

LOWER_VARIANT=$(printf '%s' "$VARIANT" | tr '[:upper:]' '[:lower:]')
APK_PATH="android/app/build/outputs/apk/${LOWER_VARIANT}/app-${LOWER_VARIANT}.apk"

if [ ! -s "$APK_PATH" ]; then
  fail "APK missing or empty at $APK_PATH — scripts/build-android-apk.sh did not produce it"
fi
ok "APK ready: $APK_PATH"

# ── Install ─────────────────────────────────────────────────────────────────
info "installing APK on $SERIAL…"
adb install -r "$APK_PATH" >/dev/null || fail "adb install failed for $APK_PATH"
ok "install complete"

# ── Run smoke test ──────────────────────────────────────────────────────────
SMOKE_SCRIPT="scripts/qa/android-splash-smoke.sh"
[ -f "$SMOKE_SCRIPT" ] || fail "$SMOKE_SCRIPT not found"

info "running splash-handoff smoke test…"
set +e
APK="$APK_PATH" VERBOSE="$VERBOSE" "./$SMOKE_SCRIPT"
SMOKE_STATUS=$?
set -e

# ── Report summary ──────────────────────────────────────────────────────────
REPORT="$(find qa-artifacts -path '*/report.md' -type f -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr | head -n1 | awk '{print $2}')"

if [ -n "${REPORT:-}" ] && [ -f "$REPORT" ]; then
  REPORT_ABS="$(cd "$(dirname "$REPORT")" && pwd)/$(basename "$REPORT")"
  BYTES="$(wc -c < "$REPORT" | tr -d ' ')"
  CLASSIFICATION="$(awk 'NF {line=$0} END {print line}' "$REPORT")"
  echo
  info "Report:               $REPORT_ABS"
  info "Report size:          ${BYTES} bytes"
  info "Final classification: ${CLASSIFICATION}"
else
  warn "no qa-artifacts/*/report.md found — smoke script may have aborted early"
fi

if [ "$SMOKE_STATUS" -ne 0 ]; then
  fail "smoke test failed (exit $SMOKE_STATUS)"
fi
ok "all phases passed"
