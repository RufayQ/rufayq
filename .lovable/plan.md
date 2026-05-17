# Add APK preflight check to `scripts/build-android-apk.sh`

The script already has a basic existence check after Gradle runs:

```bash
[ -f "$OUT" ] || { echo "✗ APK not produced at $OUT"; exit 1; }
```

This is too terse — when CI or a contributor hits it, they get one line with no diagnostics about *why* Gradle silently skipped producing the APK (most common causes: wrong variant name, Gradle task succeeded but assembled a different module, output dir was cleaned, or `assembleDebug` was a no-op due to cache).

## Change

Replace the single-line check (around line 73 of `scripts/build-android-apk.sh`) with a dedicated **preflight block** that:

1. Verifies the expected APK exists at `android/app/build/outputs/apk/$LOWER_VARIANT/app-$LOWER_VARIANT.apk`.
2. On failure, prints a clear, actionable error including:
  - The exact path that was expected
  - The contents of `android/app/build/outputs/apk/` (so the user can see what Gradle *did* produce, e.g. a release APK or a different flavor)
  - The last Gradle task line for context
  - The fix hint: re-run with `VARIANT=Debug` or check `android/app/build.gradle` for the matching build type
3. On success, additionally verifies the APK is non-empty (`[ -s ]`) and prints size + sha256 for traceability.
4. Exits with a non-zero status (`exit 2`) distinct from generic shell errors so CI can branch on it.

## Files touched

- `scripts/build-android-apk.sh` — replace the existence check with the preflight block described above. No other behavior changes.

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

&nbsp;

## Out of scope

- No changes to Gradle, Capacitor config, CI workflows, or the smoke-test script.
- No changes to the `release` variant path (CI uses AAB, not APK).