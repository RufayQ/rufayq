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

command -v java >/dev/null || { echo "✗ java not on PATH"; exit 1; }
command -v npx  >/dev/null || { echo "✗ npx not on PATH";  exit 1; }
[ -f android/gradlew ] || { echo "✗ run 'npx cap add android' first"; exit 1; }

echo "▶ web build"
if command -v bun >/dev/null; then bun install --frozen-lockfile && bun run build
else                                npm ci && npm run build
fi

echo "▶ mode: $MODE"
if [ "$MODE" = "bundled" ]; then
  echo "  ↳ stripping server block from capacitor.config.ts (APK will load dist/ via file://)"
  node -e "
    const fs=require('fs');
    const p='capacitor.config.ts';
    let s=fs.readFileSync(p,'utf8');
    s=s.replace(/server:\s*\{[\s\S]*?\},?/m,'');
    fs.writeFileSync(p+'.bak',fs.readFileSync(p));
    fs.writeFileSync(p,s);
  "
  trap 'mv capacitor.config.ts.bak capacitor.config.ts 2>/dev/null || true' EXIT
elif [ "$MODE" = "remote" ]; then
  echo "  ↳ keeping server.url — APK will load the LIVE published site at rufayq.com"
  echo "  ⚠️  Publish the fixed code to rufayq.com BEFORE installing this APK,"
  echo "      otherwise the device will load the old bundle and the fix will not run."
else
  echo "✗ MODE must be 'bundled' or 'remote' (got: $MODE)"; exit 1
fi

echo "▶ npx cap sync android"
npx cap sync android

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
