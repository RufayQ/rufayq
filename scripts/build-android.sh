#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# build-android.sh — produce a release AAB for Google Play submission.
#
# Run on a workstation with the Android toolchain installed:
#   - JDK 17 on PATH                  (java -version → 17.x)
#   - Android SDK platform-tools      (sdkmanager "platforms;android-34")
#   - Android SDK build-tools 34.0.0
#   - The repo cloned + `bun install` already run
#
# This script CANNOT run inside the Lovable sandbox — it has no Android
# toolchain. Run it locally or in CI (see `.github/workflows/release.yml`).
#
# Outputs:
#   android/app/build/outputs/bundle/release/app-release.aab
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

required_env() {
  for v in RUFAYQ_KEYSTORE RUFAYQ_STORE_PASS RUFAYQ_KEY_PASS; do
    if [ -z "${!v:-}" ]; then
      echo "✗ Missing env var: $v" >&2
      exit 1
    fi
  done
}

echo "▶ checking environment"
required_env
command -v java        >/dev/null || { echo "✗ java not on PATH"; exit 1; }
command -v npx         >/dev/null || { echo "✗ npx not on PATH"; exit 1; }
[ -f android/gradlew ] || { echo "✗ run 'npx cap add android' first"; exit 1; }

echo "▶ web build"
bun install --frozen-lockfile
bun run build

echo "▶ syncing capacitor"
# Strip dev-only server.url before sync so the AAB ships bundled assets.
node -e "
  const fs=require('fs');
  const p='capacitor.config.ts';
  let s=fs.readFileSync(p,'utf8');
  s=s.replace(/server:\s*\{[\s\S]*?\},?/m,'');
  fs.writeFileSync(p+'.bak',fs.readFileSync(p));
  fs.writeFileSync(p,s);
"
trap 'mv capacitor.config.ts.bak capacitor.config.ts 2>/dev/null || true' EXIT

npx cap sync android

echo "▶ gradle :bundleRelease"
( cd android && ./gradlew --no-daemon clean bundleRelease )

OUT=android/app/build/outputs/bundle/release/app-release.aab
[ -f "$OUT" ] || { echo "✗ AAB not produced"; exit 1; }

SIZE=$(du -h "$OUT" | cut -f1)
SHA=$(shasum -a 256 "$OUT" | awk '{print $1}')

echo ""
echo "✓ Release AAB ready"
echo "  path : $OUT"
echo "  size : $SIZE"
echo "  sha  : $SHA"
echo ""
echo "Next:"
echo "  1. Upload to Play Console → Internal testing → Create new release"
echo "  2. Paste sha256 into the release notes for traceability"
echo "  3. Tag the commit: git tag v\$(node -p \"require('./package.json').version\") && git push --tags"
