# shellcheck shell=bash
# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers for RufayQ Android smoke tooling.
# Sourced by:
#   - scripts/qa/android-smoke-report.sh   (single-shot QC artifact)
#   - scripts/qa/android-splash-smoke.sh   (multi-row CI matrix)
# ─────────────────────────────────────────────────────────────────────────────

: "${PKG:=com.rufayq.app}"
: "${SPLASH_HEX:=0B2A3A}"
: "${BLACK_HEX:=000000}"

# ── logging ─────────────────────────────────────────────────────────────────
log()  { printf '\033[36m[smoke]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m  %s\n' "$*"; }
err()  { printf '\033[31m[fail]\033[0m  %s\n' "$*"; }
ok()   { printf '\033[32m[pass]\033[0m  %s\n' "$*"; }

require_tool() {
  command -v "$1" >/dev/null 2>&1 || { err "missing required tool: $1"; exit 7; }
}

# ── adb helpers ─────────────────────────────────────────────────────────────
device_summary() {
  local model ver
  model=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r')
  ver=$(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
  printf '%s (Android %s)' "${model:-unknown}" "${ver:-?}"
}

resolve_launch_activity() {
  local resolved
  resolved=$(adb shell cmd package resolve-activity --brief "$PKG" 2>/dev/null \
    | tail -n1 | tr -d '\r')
  if [ -n "$resolved" ] && [[ "$resolved" == *"/"* ]]; then
    printf '%s' "$resolved"
  else
    printf '%s/.MainActivity' "$PKG"
  fi
}

local_capacitor_mode() {
  if [ -f capacitor.config.ts ] && grep -qE 'server:\s*\{' capacitor.config.ts; then
    if grep -qE "url:\s*['\"]https?://" capacitor.config.ts; then
      local url
      url=$(grep -oE "url:\s*['\"][^'\"]+" capacitor.config.ts | head -n1 | sed "s/url:[[:space:]]*['\"]//")
      printf 'remote-url (%s)' "$url"
    else
      printf 'remote-url (server block, no url parsed)'
    fi
  else
    printf 'bundled (no server block — loads dist/ via file://)'
  fi
}

screenshot() {
  local path="$1"
  adb exec-out screencap -p > "$path" 2>/dev/null
}

start_logcat() {
  local path="$1"
  adb logcat -c
  adb logcat \
      Capacitor:* CapacitorPlugins:* chromium:* \
      AndroidRuntime:E ActivityManager:W WebViewChromium:W \
      lowmemorykiller:* lmkd:* art:E \
      FirebaseApp:* FirebaseMessaging:* FirebaseInstanceId:* FA:* GoogleApiManager:* \
      PushNotifications:* *:F \
    > "$path" 2>/dev/null &
  echo $!
}

stop_logcat() {
  kill "$1" 2>/dev/null || true
  wait "$1" 2>/dev/null || true
}

has_marker() {
  local marker="$1" lc="$2"
  grep -qF "$marker" "$lc"
}

# ── pixel sampling ──────────────────────────────────────────────────────────
hex_luma() {
  local hex="${1:0:6}"
  local r=$((16#${hex:0:2})) g=$((16#${hex:2:2})) b=$((16#${hex:4:2}))
  echo $(((r * 299 + g * 587 + b * 114) / 1000))
}

is_blank_or_splash() {
  local png="$1"
  if command -v magick >/dev/null 2>&1; then
    local hex
    hex=$(magick "$png" -resize 1x1\! -format '%[hex:p{0,0}]' info: 2>/dev/null | tr 'a-f' 'A-F')
    [ "${hex:0:6}" = "$SPLASH_HEX" ] || [ "$(hex_luma "$hex")" -lt 16 ]
    return $?
  elif command -v convert >/dev/null 2>&1; then
    local hex
    hex=$(convert "$png" -resize 1x1\! -format '%[hex:p{0,0}]' info: 2>/dev/null | tr 'a-f' 'A-F')
    [ "${hex:0:6}" = "$SPLASH_HEX" ] || [ "$(hex_luma "$hex")" -lt 16 ]
    return $?
  else
    # Pure-bash heuristic: a solid-colour PNG compresses to a tiny file.
    local size
    size=$(stat -c%s "$png" 2>/dev/null || stat -f%z "$png")
    [ "$size" -lt 25000 ]
    return $?
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# classify_case <logcat_path> <react_mounted_yn> <post_splash_01>
#
# Emits a single line:   <case_n>|<human label>|<comma-sub-tags>
#
# Case taxonomy (renumbered from earlier free-form classify_logcat):
#   1 — JS never reached React boot
#   2 — Remote URL / network failure
#   3 — JS / chunk load failure
#   4 — Native crash
#   5 — WebView renderer crash
#   6 — Memory pressure
#
# Severity order when multiple patterns match (highest first):
#   4 native > 5 webview > 6 memory > 2 network > 3 chunk > 1 no-react
# Exception: if React never mounted AND a network error is present, prefer 2
# because the network error explains why boot didn't happen.
#
# Sub-tags (do not change the case number):
#   FIREBASE_INIT_FAIL  ERROR_BOUNDARY  RENDERED_BLANK
# ─────────────────────────────────────────────────────────────────────────────
classify_case() {
  local lc="$1" react_marker="$2" post_splash="$3"

  local has_native has_webview has_memory has_network has_chunk has_no_react
  has_native=0; has_webview=0; has_memory=0
  has_network=0; has_chunk=0; has_no_react=0

  grep -qiE 'FATAL EXCEPTION|AndroidRuntime: FATAL' "$lc" 2>/dev/null && has_native=1
  grep -qiE 'RenderProcessGone|Renderer process .*gone|render process .*killed|WebView .*crashed' "$lc" 2>/dev/null && has_webview=1
  grep -qiE 'OutOfMemoryError|lowmemorykiller|lmkd.*kill|Low on memory|onTrimMemory.*(CRITICAL|MODERATE)' "$lc" 2>/dev/null && has_memory=1
  grep -qiE 'ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|net::ERR_|net::ERR_FAILED|WebViewClient.*error' "$lc" 2>/dev/null && has_network=1
  grep -qiE 'ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module|Unexpected token|SyntaxError|ReferenceError' "$lc" 2>/dev/null && has_chunk=1
  [ "$react_marker" != "yes" ] && has_no_react=1

  local case_n=0 case_label=""
  if   [ "$has_native"  = "1" ]; then case_n=4; case_label="Native crash"
  elif [ "$has_webview" = "1" ]; then case_n=5; case_label="WebView renderer crash"
  elif [ "$has_memory"  = "1" ]; then case_n=6; case_label="Memory pressure"
  elif [ "$has_network" = "1" ]; then case_n=2; case_label="Remote URL / network failure"
  elif [ "$has_chunk"   = "1" ]; then case_n=3; case_label="JS / chunk load failure"
  elif [ "$has_no_react" = "1" ]; then case_n=1; case_label="JS never reached React boot"
  fi

  # No-react + network present → prefer Case 2 (network explains no-react).
  if [ "$has_no_react" = "1" ] && [ "$has_network" = "1" ] && [ "$case_n" != "2" ]; then
    case_n=2; case_label="Remote URL / network failure"
  fi

  # ── sub-tags ──────────────────────────────────────────────────────────────
  local tags=()
  if grep -qiE 'Default FirebaseApp is not initialized|Missing google_app_id|google-services\.json.*missing|SERVICE_NOT_AVAILABLE|google-services' "$lc" 2>/dev/null; then
    tags+=("FIREBASE_INIT_FAIL")
  fi
  if has_marker '[RufayqStartup] ErrorBoundary rendered' "$lc"; then
    tags+=("ERROR_BOUNDARY")
  fi
  if [ "$react_marker" = "yes" ] && [ "$post_splash" = "1" ]; then
    tags+=("RENDERED_BLANK")
  fi

  local sub_csv=""
  if [ "${#tags[@]}" -gt 0 ]; then
    sub_csv=$(IFS=','; echo "${tags[*]}")
  fi

  printf '%s|%s|%s\n' "${case_n:-0}" "${case_label:-Unknown}" "$sub_csv"
}
