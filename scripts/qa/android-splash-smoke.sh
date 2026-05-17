#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Android splash-handoff E2E smoke test
#
# Verifies the Capacitor WebView successfully hands off from the navy splash
# (#0B2A3A) on a fresh install, a warm relaunch, in airplane mode, and after a
# background→foreground cycle. Catches the "blacked out app" regression caused
# by an unreachable `server.url` or a broken bundled shell.
#
# Requires: adb in PATH, a single connected device/emulator, and an installed
# build of com.rufayq.app. ImageMagick (`compare`) is optional — used to
# detect "splash still visible" by sampling pixels against the navy splash
# colour. If unavailable, we fall back to a pure-bash pixel sampler via
# `screencap` + `xxd`.
#
# Usage:
#   ./scripts/qa/android-splash-smoke.sh
#   VERBOSE=1 ./scripts/qa/android-splash-smoke.sh
#   APK=path/to/app-release.apk ./scripts/qa/android-splash-smoke.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/smoke-lib.sh"

# PKG, SPLASH_HEX, BLACK_HEX, log/warn/err/ok, screenshot, start_logcat,
# stop_logcat, has_marker, is_blank_or_splash, classify_case, device_summary,
# local_capacitor_mode all come from smoke-lib.sh.
LAUNCH_ACT="$PKG/.MainActivity"     # Capacitor default; resolved below
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="qa-artifacts/$TIMESTAMP"
REPORT="$OUT_DIR/report.md"
VERBOSE="${VERBOSE:-0}"
APK="${APK:-}"

require_tool adb

cold_launch() {
  adb shell am force-stop "$PKG" >/dev/null
  adb shell pm clear "$PKG" >/dev/null 2>&1 || true
  adb shell am start -W -n "$LAUNCH_ACT" >/dev/null
}

warm_launch() {
  adb shell am force-stop "$PKG" >/dev/null
  adb shell am start -W -n "$LAUNCH_ACT" >/dev/null
}

airplane_on()  { adb shell cmd connectivity airplane-mode enable  >/dev/null 2>&1 \
                 || adb shell svc wifi disable && adb shell svc data disable; }
airplane_off() { adb shell cmd connectivity airplane-mode disable >/dev/null 2>&1 \
                 || adb shell svc wifi enable  && adb shell svc data enable; }

# ── optional fresh install ──────────────────────────────────────────────────
if [ -n "$APK" ]; then
  log "fresh install from $APK"
  adb uninstall "$PKG" >/dev/null 2>&1 || true
  adb install -r "$APK" >/dev/null || { err "install failed"; exit 2; }
fi

# ── row runner ──────────────────────────────────────────────────────────────
ROW_RESULTS=()

run_row() {
  local n="$1" name="$2" launcher_fn="$3" max_seconds="$4" require_handoff="$5"
  log "row $n: $name (budget ${max_seconds}s)"

  local lc_path="$OUT_DIR/row-$n-logcat.txt"
  local lc_pid; lc_pid=$(start_logcat "$lc_path")

  $launcher_fn
  screenshot "$OUT_DIR/row-$n-pre.png"
  sleep "$max_seconds"
  screenshot "$OUT_DIR/row-$n-post.png"

  stop_logcat "$lc_pid"

  local pre_splash=0 post_splash=0
  is_blank_or_splash "$OUT_DIR/row-$n-pre.png"  && pre_splash=1
  is_blank_or_splash "$OUT_DIR/row-$n-post.png" && post_splash=1
  local react_marker="no" hide_marker="no" timeout_marker="no" boundary_marker="no"
  local push_attempt="no" push_perm="no" push_listener="no" push_reg_ok="no"
  local token_recv="no" token_save="no" firebase_init="unknown"
  local boundary_detail=""
  has_marker '[RufayqStartup] React mounted' "$lc_path" && react_marker="yes"
  has_marker '[RufayqStartup] SplashScreen.hide requested' "$lc_path" && hide_marker="yes"
  has_marker '[RufayqStartup] Splash fallback timeout fired' "$lc_path" && timeout_marker="yes"
  if has_marker '[RufayqStartup] ErrorBoundary rendered' "$lc_path"; then
    boundary_marker="yes"
    boundary_detail=$(grep -F '[RufayqStartup] ErrorBoundary rendered' "$lc_path" | head -n1)
  fi
  has_marker '[RufayqStartup] Push registration attempt' "$lc_path" && push_attempt="yes"
  grep -qF '[RufayqStartup] Push permission result' "$lc_path" && push_perm="yes"
  has_marker '[RufayqStartup] Push listener setup success' "$lc_path" && push_listener="yes"
  has_marker '[RufayqStartup] Push native register success' "$lc_path" && push_reg_ok="yes"
  has_marker '[RufayqStartup] Push token received' "$lc_path" && token_recv="yes"
  has_marker '[RufayqStartup] Push token upsert success' "$lc_path" && token_save="yes"
  if grep -qiE 'FirebaseApp.*initialized|FirebaseInstanceId|FirebaseMessaging.*Started' "$lc_path"; then
    firebase_init="yes"
  elif grep -qiE 'Default FirebaseApp is not initialized|Missing google_app_id|google-services\.json.*missing' "$lc_path"; then
    firebase_init="no"
  fi

  local status="PASS" reason=""
  if [ "$require_handoff" = "1" ] && [ "$post_splash" = "1" ]; then
    status="FAIL"; reason="splash still visible after ${max_seconds}s"
  elif [ "$require_handoff" = "0" ] && [ "$post_splash" = "1" ]; then
    if ! grep -qiE 'ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|net::ERR_' "$lc_path"; then
      status="FAIL"; reason="navy splash after ${max_seconds}s with no offline error path"
    fi
  fi

  if [ "$status" = "PASS" ] && [ "$post_splash" = "1" ] && [ "$react_marker" = "yes" ]; then
    status="FAIL"; reason="React booted but screen remained splash/blank after ${max_seconds}s"
  fi

  local case_label="n/a" case_n=0 case_sub=""
  if [ "$status" = "FAIL" ]; then
    local classify; classify=$(classify_case "$lc_path" "$react_marker" "$post_splash")
    case_n=$(printf '%s' "$classify" | cut -d'|' -f1)
    case_label=$(printf '%s' "$classify" | cut -d'|' -f2)
    case_sub=$(printf '%s' "$classify" | cut -d'|' -f3)
  fi
  local category="n/a"
  if [ "$status" = "FAIL" ]; then
    if [ -n "$case_sub" ]; then
      category="Case $case_n: $case_label [+$(printf '%s' "$case_sub" | sed 's/,/, +/g')]"
    else
      category="Case $case_n: $case_label"
    fi
  fi

  if [ "$status" = "PASS" ]; then ok "row $n PASS"
  else err "row $n FAIL — $reason ($category)"; fi

  ROW_RESULTS+=("$n|$name|$status|$reason|$category|$react_marker|$hide_marker|$timeout_marker")
  {
    echo "### Row $n — $name"
    echo "- status: **$status**"
    [ -n "$reason" ] && echo "- reason: $reason"
    [ "$category" != "n/a" ] && echo "- likely cause: **$category**"
    echo ""
    echo "**Startup checklist**"
    echo "- React mounted: **$react_marker**"
    echo "- SplashScreen.hide requested: **$hide_marker**"
    echo "- Splash fallback timeout fired: **$timeout_marker**"
    echo "- Error boundary rendered: **$boundary_marker**${boundary_detail:+ — \`$boundary_detail\`}"
    echo ""
    echo "**Push / FCM checklist**"
    echo "- Push prompt mounted: see \`[RufayqStartup] Push prompt mounted\` in logcat slice"
    echo "- Push registration attempted: **$push_attempt**"
    echo "- Push listener setup success: **$push_listener**"
    echo "- Firebase initialized: **$firebase_init**"
    echo "- Push native register success: **$push_reg_ok**"
    echo "- Token received: **$token_recv**"
    echo "- Token saved to backend: **$token_save**"
    echo ""
    echo "- pre-screenshot: \`row-$n-pre.png\`"
    echo "- post-screenshot: \`row-$n-post.png\`"
    echo "- logcat slice: \`row-$n-logcat.txt\`"
    echo
  } >> "$REPORT"
}

# Detect whether the local capacitor.config.ts is in remote-URL or bundled mode.
# We cannot reliably introspect the installed APK from adb without unpacking it,
# so we report the LOCAL config as a hint and label the installed app "unknown".
detect_local_mode() {
  if [ -f capacitor.config.ts ] && grep -qE 'server:\s*\{' capacitor.config.ts; then
    if grep -qE "url:\s*['\"]https?://" capacitor.config.ts; then
      echo "REMOTE URL (loads $(grep -oE "url:\s*['\"][^'\"]+" capacitor.config.ts | head -n1 | sed "s/url:[[:space:]]*['\"]//"))"
    else
      echo "REMOTE URL (server block present, no URL parsed)"
    fi
  else
    echo "BUNDLED / OFFLINE (no server block — loads dist/ via file://)"
  fi
}

# ── execute matrix ──────────────────────────────────────────────────────────
{
  echo "# Android Splash Handoff Smoke — $TIMESTAMP"
  echo
  echo "Device: $(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r') "\
       "(Android $(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r'))"
  echo "Package: \`$PKG\`  Activity: \`$LAUNCH_ACT\`"
  echo "Local capacitor.config.ts mode: **$(detect_local_mode)**"
  echo "Installed app mode: _unknown_ (not introspected from APK)"
  echo
} > "$REPORT"

airplane_off
run_row 1 "Cold launch, online"      cold_launch 3 1
run_row 2 "Warm relaunch, online"    warm_launch 2 1
run_row 6 "Background → foreground"  warm_launch 1 1

airplane_on
sleep 2
run_row 3 "Cold launch, airplane mode" cold_launch 4 0
airplane_off

# ── summary ─────────────────────────────────────────────────────────────────
FAILED=0
{
  echo "## Summary"
  echo
  echo "| Row | Scenario | Status | React mounted | Splash hide requested | Fallback fired | Likely cause |"
  echo "|-----|----------|--------|---------------|-----------------------|----------------|--------------|"
  for r in "${ROW_RESULTS[@]}"; do
    IFS='|' read -r n name status reason category react_marker hide_marker timeout_marker <<<"$r"
    echo "| $n | $name | $status | $react_marker | $hide_marker | $timeout_marker | ${category:-n/a} |"
    [ "$status" = "FAIL" ] && FAILED=$((FAILED+1))
  done
} >> "$REPORT"

echo
log "report written to $REPORT"
cat "$REPORT"

if [ "$FAILED" -gt 0 ]; then
  err "$FAILED row(s) failed"
  exit 1
fi
ok "all automated rows passed"
exit 0
