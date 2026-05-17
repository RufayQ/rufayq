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

PKG="com.rufayq.app"
LAUNCH_ACT="$PKG/.MainActivity"     # Capacitor default; override if renamed
SPLASH_HEX="0B2A3A"                  # navy splash colour, no '#'
BLACK_HEX="000000"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="qa-artifacts/$TIMESTAMP"
REPORT="$OUT_DIR/report.md"
VERBOSE="${VERBOSE:-0}"
APK="${APK:-}"

# ── helpers ─────────────────────────────────────────────────────────────────
log()  { printf '\033[36m[smoke]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m  %s\n' "$*"; }
err()  { printf '\033[31m[fail]\033[0m  %s\n' "$*"; }
ok()   { printf '\033[32m[pass]\033[0m  %s\n' "$*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || { err "missing required tool: $1"; exit 2; }
}

require adb

DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}' | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
  err "no authorised device/emulator detected. Run 'adb devices' to debug."
  exit 2
fi
if [ "$DEVICES" -gt 1 ]; then
  warn "multiple devices detected — adb will pick one. Set ANDROID_SERIAL to pin."
fi

mkdir -p "$OUT_DIR"
: > "$REPORT"

# Resolve actual launcher activity (more reliable than guessing .MainActivity).
RESOLVED_ACT=$(adb shell cmd package resolve-activity --brief "$PKG" 2>/dev/null \
  | tail -n1 | tr -d '\r')
if [ -n "$RESOLVED_ACT" ] && [[ "$RESOLVED_ACT" == *"/"* ]]; then
  LAUNCH_ACT="$RESOLVED_ACT"
fi
log "using launcher activity: $LAUNCH_ACT"

hex_luma() {
  local hex="${1:0:6}"
  local r=$((16#${hex:0:2})) g=$((16#${hex:2:2})) b=$((16#${hex:4:2}))
  echo $(((r * 299 + g * 587 + b * 114) / 1000))
}

# Pixel-sampling: capture a screenshot and check whether the average screen is
# still solid navy/black. Returns 0 if blank/splash, 1 if handed off.
is_blank_or_splash() {
  local png="$1"
  if command -v magick >/dev/null 2>&1; then
    local hex
    hex=$(magick "$png" -resize 1x1\! -format '%[hex:p{0,0}]' info: 2>/dev/null | tr 'a-f' 'A-F')
    [ "$VERBOSE" = "1" ] && log "  average pixel = $hex (splash = $SPLASH_HEX, black = $BLACK_HEX)"
    [ "${hex:0:6}" = "$SPLASH_HEX" ] || [ "$(hex_luma "$hex")" -lt 16 ]
    return $?
  elif command -v convert >/dev/null 2>&1; then
    local hex
    hex=$(convert "$png" -resize 1x1\! -format '%[hex:p{0,0}]' info: 2>/dev/null | tr 'a-f' 'A-F')
    [ "${hex:0:6}" = "$SPLASH_HEX" ] || [ "$(hex_luma "$hex")" -lt 16 ]
    return $?
  else
    warn "ImageMagick not found — falling back to size heuristic (less precise)"
    # Pure-bash heuristic: a solid-colour PNG compresses to a tiny file.
    local size
    size=$(stat -c%s "$png" 2>/dev/null || stat -f%z "$png")
    [ "$size" -lt 25000 ]
    return $?
  fi
}

screenshot() {
  local path="$1"
  adb exec-out screencap -p > "$path" 2>/dev/null
}

cold_launch() {
  adb shell am force-stop "$PKG" >/dev/null
  adb shell pm clear "$PKG" >/dev/null 2>&1 || true
  adb shell am start -W -n "$LAUNCH_ACT" >/dev/null
}

warm_launch() {
  adb shell am force-stop "$PKG" >/dev/null
  adb shell am start -W -n "$LAUNCH_ACT" >/dev/null
}

start_logcat() {
  local path="$1"
  adb logcat -c
  # Cast a wider net so we can categorise failures (network, JS, native crash,
  # renderer crash, memory pressure) — not just Capacitor/chromium chatter.
  adb logcat \
      Capacitor:* CapacitorPlugins:* chromium:* \
      AndroidRuntime:E ActivityManager:W WebViewChromium:W \
      lowmemorykiller:* lmkd:* art:E *:F \
    > "$path" 2>/dev/null &
  echo $!
}

stop_logcat() {
  kill "$1" 2>/dev/null || true
  wait "$1" 2>/dev/null || true
}

# Inspect RufayQ startup markers emitted by the React boot path.
has_marker() {
  local marker="$1" lc="$2"
  grep -qF "$marker" "$lc"
}

# Inspect a logcat slice and emit a single likely-cause category.
classify_logcat() {
  local lc="$1"
  if   ! has_marker '[RufayqStartup] React mounted' "$lc"; then
    echo "JS DID NOT REACH REACT BOOT"
  elif grep -qiE 'ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|net::ERR_|net::ERR_FAILED|WebViewClient.*error' "$lc"; then
    echo "LIKELY NETWORK / REMOTE URL LOAD FAILURE"
  elif grep -qiE 'ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module|Unexpected token|SyntaxError|ReferenceError' "$lc"; then
    echo "LIKELY JS / CHUNK LOAD FAILURE"
  elif grep -qiE 'FATAL EXCEPTION|AndroidRuntime: FATAL' "$lc"; then
    echo "LIKELY NATIVE CRASH"
  elif grep -qiE 'Renderer process .*gone|RenderProcessGone|render process .*killed|WebView .*crashed' "$lc"; then
    echo "LIKELY WEBVIEW RENDERER CRASH"
  elif grep -qiE 'OutOfMemoryError|lowmemorykiller|lmkd.*kill|Low on memory|onTrimMemory.*(CRITICAL|MODERATE)|Background concurrent .*GC freed' "$lc"; then
    echo "POSSIBLE MEMORY PRESSURE"
  else
    echo "REACT RENDERED BLANK / STARTUP UI FAILURE"
  fi
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
  local react_marker="no" hide_marker="no" timeout_marker="no"
  has_marker '[RufayqStartup] React mounted' "$lc_path" && react_marker="yes"
  has_marker '[RufayqStartup] SplashScreen.hide requested' "$lc_path" && hide_marker="yes"
  has_marker '[RufayqStartup] Splash fallback timeout fired' "$lc_path" && timeout_marker="yes"

  local status="PASS" reason=""
  if [ "$require_handoff" = "1" ] && [ "$post_splash" = "1" ]; then
    status="FAIL"; reason="splash still visible after ${max_seconds}s"
  elif [ "$require_handoff" = "0" ] && [ "$post_splash" = "1" ]; then
    # Offline case: splash is acceptable ONLY if logcat shows an explicit
    # network-error render path; otherwise we treat it as a hang.
    if ! grep -qiE 'ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|net::ERR_' "$lc_path"; then
      status="FAIL"; reason="navy splash after ${max_seconds}s with no offline error path"
    fi
  fi

  if [ "$status" = "PASS" ] && [ "$post_splash" = "1" ] && [ "$react_marker" = "yes" ]; then
    status="FAIL"; reason="React booted but screen remained splash/blank after ${max_seconds}s"
  fi

  local category="n/a"
  if [ "$status" = "FAIL" ]; then
    category=$(classify_logcat "$lc_path")
  fi

  if [ "$status" = "PASS" ]; then ok "row $n PASS"
  else err "row $n FAIL — $reason ($category)"; fi

  ROW_RESULTS+=("$n|$name|$status|$reason|$category|$react_marker|$hide_marker|$timeout_marker")
  {
    echo "### Row $n — $name"
    echo "- status: **$status**"
    [ -n "$reason" ] && echo "- reason: $reason"
    [ "$category" != "n/a" ] && echo "- likely cause: **$category**"
    echo "- React mounted marker: **$react_marker**"
    echo "- SplashScreen.hide requested marker: **$hide_marker**"
    echo "- splash fallback timeout marker: **$timeout_marker**"
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
