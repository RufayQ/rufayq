#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# build-android-apk.sh — produce an installable APK for local device testing.
#
# Why this exists:
#   `npx cap sync android` only copies web assets + plugins into the Android
#   project. It does NOT assemble an APK. You still need Gradle / Android
#   Studio to actually build one. This script wraps the full flow.
#
# Two modes:
#   MODE=remote   — keep capacitor.config.ts server.url (loads https://rufayq.com).
#                   The APK is a thin shell; the live published site is the runtime.
#                   ⚠️ You MUST publish the fixed React code to rufayq.com FIRST,
#                   otherwise the device will still load the old, broken bundle.
#   MODE=bundled  — strip server.url, ship local dist/ assets via file://.
#                   The fixes ship inside the APK. No publish step required.
#
# Defaults to MODE=bundled because that is the only mode that proves the
# locally-built JS is what runs on device.
#
# Outputs:
#   android/app/build/outputs/apk/debug/app-debug.apk
#
# Requirements (local workstation, NOT the Lovable sandbox):
#   - JDK 17 on PATH
#   - Android SDK platform-tools + build-tools 34
#   - `npx cap add android` already run once
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODE="${MODE:-bundled}"
VARIANT="${VARIANT:-Debug}"   # Debug or Release

CANONICAL_SERVER_URL="https://rufayq.com"
CAP_CONFIG_TS="capacitor.config.ts"
CAP_CONFIG_BAK="capacitor.config.ts.bak"
ANDROID_CAP_JSON="android/app/src/main/assets/capacitor.config.json"

command -v java >/dev/null || { echo "✗ java not on PATH"; exit 1; }
command -v npx  >/dev/null || { echo "✗ npx not on PATH";  exit 1; }
[ -f android/gradlew ] || { echo "✗ run 'npx cap add android' first"; exit 1; }

echo "[qa] mode: $MODE"
echo "[qa] variant: $VARIANT"

# ── Recover from a prior interrupted run of the OLD script ────────────────
# The previous implementation mutated capacitor.config.ts and stored the
# original in capacitor.config.ts.bak. SIGKILL / power loss could leave the
# source file stripped and the .bak orphaned. Recover before doing anything.
if [ -f "$CAP_CONFIG_BAK" ]; then
  echo "[qa] found stale $CAP_CONFIG_BAK from a previous run"
  if ! grep -q "$CANONICAL_SERVER_URL" "$CAP_CONFIG_TS" 2>/dev/null \
     && grep -q "$CANONICAL_SERVER_URL" "$CAP_CONFIG_BAK"; then
    mv "$CAP_CONFIG_BAK" "$CAP_CONFIG_TS"
    echo "[qa] recovered $CAP_CONFIG_TS from stale $CAP_CONFIG_BAK"
  else
    rm -f "$CAP_CONFIG_BAK"
    echo "[qa] discarded stale $CAP_CONFIG_BAK (source file already intact)"
  fi
fi

# ── Integrity check on the source TS config ───────────────────────────────
# We never write to capacitor.config.ts in this script, but if a previous
# run of the old script (or a human edit) left it stripped, fail loudly.
if ! grep -q "$CANONICAL_SERVER_URL" "$CAP_CONFIG_TS"; then
  echo "✗ $CAP_CONFIG_TS is missing the canonical server URL ($CANONICAL_SERVER_URL)."
  echo "  Restore it before building:"
  echo "    git checkout -- $CAP_CONFIG_TS"
  exit 2
fi
echo "[qa] $CAP_CONFIG_TS source integrity: OK"

echo "▶ web build"
if command -v bun >/dev/null; then bun install --frozen-lockfile && bun run build
else                                npm ci && npm run build
fi

echo "[qa] running npx cap sync android"
npx cap sync android
echo "[qa] generated Capacitor JSON: $ANDROID_CAP_JSON"

# ── Patch ONLY the generated Android JSON ─────────────────────────────────
# cap sync regenerates this file on every build, so any mutation here is
# transient and self-healing. capacitor.config.ts is never touched.
patch_android_capacitor_json_for_bundled() {
  if [ ! -f "$ANDROID_CAP_JSON" ]; then
    echo "[qa] ✗ generated Capacitor JSON not found: $ANDROID_CAP_JSON" >&2
    echo "[qa] Did npx cap sync android complete successfully?" >&2
    exit 2
  fi

  echo "[qa] Capacitor JSON keys before bundled patch:"
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log('  ' + Object.keys(obj).sort().join(', '));
  " "$ANDROID_CAP_JSON"

  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    delete obj.server;
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  " "$ANDROID_CAP_JSON"

  echo "[qa] Capacitor JSON keys after bundled patch:"
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log('  ' + Object.keys(obj).sort().join(', '));
    if (Object.prototype.hasOwnProperty.call(obj, 'server')) {
      console.error('[qa] ✗ bundled patch failed: generated JSON still contains server');
      process.exit(2);
    }
  " "$ANDROID_CAP_JSON"

  echo "[qa] bundled mode: server removed from generated Android JSON"
}

verify_remote_json_has_server() {
  if [ ! -f "$ANDROID_CAP_JSON" ]; then
    echo "[qa] ✗ generated Capacitor JSON not found: $ANDROID_CAP_JSON" >&2
    exit 2
  fi
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const expected = process.argv[2];
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!obj.server || obj.server.url !== expected) {
      console.error('[qa] ✗ remote mode expected server.url=' + expected);
      process.exit(2);
    }
    console.log('[qa] remote mode: generated Android JSON keeps server.url=' + obj.server.url);
  " "$ANDROID_CAP_JSON" "$CANONICAL_SERVER_URL"
}

if [ "$MODE" = "bundled" ]; then
  patch_android_capacitor_json_for_bundled
elif [ "$MODE" = "remote" ]; then
  echo "  ⚠️  Publish the fixed code to rufayq.com BEFORE installing this APK,"
  echo "      otherwise the device will load the old bundle and the fix will not run."
  verify_remote_json_has_server
else
  echo "✗ MODE must be 'bundled' or 'remote' (got: $MODE)"; exit 1
fi

echo "▶ gradle assemble$VARIANT"
( cd android && ./gradlew --no-daemon "assemble$VARIANT" )

LOWER_VARIANT=$(echo "$VARIANT" | tr '[:upper:]' '[:lower:]')
OUT="android/app/build/outputs/apk/$LOWER_VARIANT/app-$LOWER_VARIANT.apk"

# ── Preflight: did Gradle actually produce the APK at the expected path? ──
# Gradle can exit 0 without emitting the APK we expect (wrong variant name,
# cached no-op task, build-type rename, multi-module flavor, cleaned output
# dir). A bare `[ -f ]` check leaves the user staring at one cryptic line,
# so dump enough context to act on.
echo "▶ preflight: APK artifact"
echo "  expected: $OUT"
if [ ! -f "$OUT" ]; then
  echo ""
  echo "✗ APK PREFLIGHT FAILED"
  echo "  Gradle finished but no APK was produced at the expected path:"
  echo "    $OUT"
  echo ""
  echo "  Contents of android/app/build/outputs/apk/ (what Gradle DID emit):"
  if [ -d android/app/build/outputs/apk ]; then
    ( cd android/app/build/outputs/apk && find . -maxdepth 3 -type f -name '*.apk' -printf '    %p  (%s bytes)\n' 2>/dev/null \
      || find . -maxdepth 3 -type f -name '*.apk' -exec ls -l {} \; | sed 's/^/    /' )
  else
    echo "    (directory does not exist — Gradle never wrote any APK output)"
  fi
  echo ""
  echo "  Common causes & fixes:"
  echo "    • VARIANT='$VARIANT' does not match a build type in android/app/build.gradle."
  echo "      → Re-run with VARIANT=Debug (default) or VARIANT=Release."
  echo "    • A productFlavor is configured — APK lands under apk/<flavor>/<variant>/."
  echo "      → Inspect android/app/build.gradle for 'productFlavors { … }'."
  echo "    • android/ was wiped between sync and assemble."
  echo "      → Re-run this script from a clean checkout."
  exit 2
fi
if [ ! -s "$OUT" ]; then
  echo "✗ APK PREFLIGHT FAILED: $OUT exists but is empty (0 bytes)."
  echo "  Delete it and re-run: rm '$OUT' && ./scripts/build-android-apk.sh"
  exit 2
fi

SIZE=$(du -h "$OUT" | cut -f1)
SHA=$(shasum -a 256 "$OUT" 2>/dev/null | awk '{print $1}')
[ -n "$SHA" ] || SHA=$(sha256sum "$OUT" 2>/dev/null | awk '{print $1}')
echo "  ✓ found, size=$SIZE sha256=${SHA:-unavailable}"
echo ""
echo "✓ APK ready"
echo "  path : $OUT"
echo "  size : $SIZE"
echo "  mode : $MODE"
echo ""
echo "Install + smoke test on a connected device:"
echo "  adb uninstall com.rufayq.app || true"
echo "  adb install -r $OUT"
echo "  APK=$OUT ./scripts/qa/android-splash-smoke.sh"
