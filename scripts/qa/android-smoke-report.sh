#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RufayQ Android single-shot smoke report
#
# Runs ONE cold launch, captures the full adb logcat for the window, classifies
# the startup outcome into Case 1–6, and emits a single self-contained
# smoke-report.md that QC uploads into the admin panel.
#
# Usage:
#   ./scripts/qa/android-smoke-report.sh
#   PKG=com.rufayq.app ./scripts/qa/android-smoke-report.sh
#   WINDOW=6 ./scripts/qa/android-smoke-report.sh        # seconds to observe
#
# Exit codes:
#   0   PASS
#   1-6 FAIL — matches Case N
#   7   environment / preflight error
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/smoke-lib.sh"

WINDOW="${WINDOW:-5}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="qa-artifacts/android-smoke-$TIMESTAMP"
REPORT="$OUT_DIR/smoke-report.md"
LOGCAT="$OUT_DIR/logcat-full.txt"

require_tool adb

DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}' | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
  err "no authorised device/emulator detected. Run 'adb devices' to debug."
  exit 7
fi
if [ "$DEVICES" -gt 1 ]; then
  warn "multiple devices detected — adb will pick one. Set ANDROID_SERIAL to pin."
fi

mkdir -p "$OUT_DIR"

LAUNCH_ACT=$(resolve_launch_activity)
log "package:  $PKG"
log "activity: $LAUNCH_ACT"
log "window:   ${WINDOW}s"

# ── capture run ─────────────────────────────────────────────────────────────
LC_PID=$(start_logcat "$LOGCAT")
adb shell am force-stop "$PKG" >/dev/null
adb shell pm clear      "$PKG" >/dev/null 2>&1 || true
adb shell am start -W -n "$LAUNCH_ACT" >/dev/null
screenshot "$OUT_DIR/pre.png"
sleep "$WINDOW"
screenshot "$OUT_DIR/post.png"
stop_logcat "$LC_PID"

# ── inspect markers ─────────────────────────────────────────────────────────
react_marker="no"; hide_marker="no"; timeout_marker="no"; boundary_marker="no"; boundary_detail=""
push_attempt="no"; push_perm="no"; push_listener="no"; push_reg_ok="no"
token_recv="no"; token_save="no"; firebase_init="unknown"; push_err="no"; push_err_detail=""
push_prompt="no"

has_marker '[RufayqStartup] React mounted'                "$LOGCAT" && react_marker="yes"
has_marker '[RufayqStartup] SplashScreen.hide requested'  "$LOGCAT" && hide_marker="yes"
has_marker '[RufayqStartup] Splash fallback timeout fired' "$LOGCAT" && timeout_marker="yes"
if has_marker '[RufayqStartup] ErrorBoundary rendered' "$LOGCAT"; then
  boundary_marker="yes"
  boundary_detail=$(grep -F '[RufayqStartup] ErrorBoundary rendered' "$LOGCAT" | head -n1)
fi
has_marker '[RufayqStartup] Push prompt mounted'          "$LOGCAT" && push_prompt="yes"
has_marker '[RufayqStartup] Push registration attempt'    "$LOGCAT" && push_attempt="yes"
grep -qF  '[RufayqStartup] Push permission result'        "$LOGCAT" && push_perm="yes"
has_marker '[RufayqStartup] Push listener setup success'  "$LOGCAT" && push_listener="yes"
has_marker '[RufayqStartup] Push native register success' "$LOGCAT" && push_reg_ok="yes"
has_marker '[RufayqStartup] Push token received'          "$LOGCAT" && token_recv="yes"
has_marker '[RufayqStartup] Push token upsert success'    "$LOGCAT" && token_save="yes"
if grep -qiE 'FirebaseApp.*initialized|FirebaseInstanceId|FirebaseMessaging.*Started' "$LOGCAT"; then
  firebase_init="yes"
elif grep -qiE 'Default FirebaseApp is not initialized|Missing google_app_id|google-services\.json.*missing' "$LOGCAT"; then
  firebase_init="no"
fi
if grep -qiE 'registrationError|Push.*error|PushNotifications.*error|FCM.*error' "$LOGCAT"; then
  push_err="yes"
  push_err_detail=$(grep -iE 'registrationError|Push.*error|PushNotifications.*error|FCM.*error' "$LOGCAT" | head -n1)
fi

post_splash=0
is_blank_or_splash "$OUT_DIR/post.png" && post_splash=1

# ── classify ────────────────────────────────────────────────────────────────
CLASSIFY=$(classify_case "$LOGCAT" "$react_marker" "$post_splash")
CASE_N=$(printf '%s' "$CLASSIFY" | cut -d'|' -f1)
CASE_LBL=$(printf '%s' "$CLASSIFY" | cut -d'|' -f2)
CASE_SUB=$(printf '%s' "$CLASSIFY" | cut -d'|' -f3)

# Verdict: PASS only if React mounted AND post screen is not splash/black
if [ "$react_marker" = "yes" ] && [ "$post_splash" = "0" ] && [ "$CASE_N" = "0" ]; then
  VERDICT_LINE="Verdict: PASS"
  EXIT_CODE=0
else
  # If no concrete case was detected but post is still splash/blank, fall back to Case 1.
  if [ "$CASE_N" = "0" ]; then
    CASE_N=1
    CASE_LBL="JS never reached React boot"
  fi
  sub_suffix=""
  if [ -n "$CASE_SUB" ]; then
    sub_suffix=$(printf '%s' "$CASE_SUB" | sed 's/,/, +/g')
    sub_suffix=" [+$sub_suffix]"
  fi
  VERDICT_LINE="Verdict: FAIL — Case $CASE_N: $CASE_LBL$sub_suffix"
  EXIT_CODE="$CASE_N"
fi

# ── emit report ─────────────────────────────────────────────────────────────
{
  echo "# RufayQ Android Smoke Report — $TIMESTAMP"
  echo
  echo "Device: $(device_summary)"
  echo "Package: \`$PKG\`"
  echo "Activity: \`$LAUNCH_ACT\`"
  echo "Local capacitor mode: **$(local_capacitor_mode)**"
  echo "Observation window: ${WINDOW}s"
  echo
  echo "$VERDICT_LINE"
  echo
  echo "## Startup checklist"
  echo
  echo "- React mounted: **$react_marker**"
  echo "- SplashScreen.hide requested: **$hide_marker**"
  echo "- Splash fallback timeout fired: **$timeout_marker**"
  if [ -n "$boundary_detail" ]; then
    echo "- ErrorBoundary rendered: **$boundary_marker** — \`$boundary_detail\`"
  else
    echo "- ErrorBoundary rendered: **$boundary_marker**"
  fi
  echo "- Post-screenshot is splash/black: **$([ "$post_splash" = "1" ] && echo yes || echo no)**"
  echo
  echo "## Push / FCM checklist"
  echo
  echo "- Push prompt mounted: **$push_prompt**"
  echo "- Push registration attempted: **$push_attempt**"
  echo "- Push permission result observed: **$push_perm**"
  echo "- Push listener setup success: **$push_listener**"
  echo "- Firebase initialized: **$firebase_init**"
  echo "- Push native register success: **$push_reg_ok**"
  echo "- Token received: **$token_recv**"
  echo "- Token saved to backend: **$token_save**"
  if [ -n "$push_err_detail" ]; then
    echo "- Push registration error: **$push_err** — \`$push_err_detail\`"
  else
    echo "- Push registration error: **$push_err**"
  fi
  echo
  echo "## Full adb logcat"
  echo
  echo '```log'
  cat "$LOGCAT"
  echo
  echo '```'
  echo
  echo "## Screenshots"
  echo
  echo "- \`pre.png\`"
  echo "- \`post.png\`"
} > "$REPORT"

ABS_REPORT="$(cd "$(dirname "$REPORT")" && pwd)/$(basename "$REPORT")"
echo
log "report written to: $ABS_REPORT"

if [ "$EXIT_CODE" = "0" ]; then
  ok "PASS"
else
  err "FAIL — Case $CASE_N: $CASE_LBL${CASE_SUB:+ [+$CASE_SUB]}"
fi
exit "$EXIT_CODE"
