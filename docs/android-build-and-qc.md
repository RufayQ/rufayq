# Android Build Distribution & QC Test Plan

## 1. Why there is no download link in this repo

Lovable is a web-build environment. It does **not** ship the Android SDK,
JDK 17, Gradle, or the Play upload signing key — so it cannot produce a
real `.aab` from inside the sandbox. Anyone who tells you otherwise is
shipping an unsigned APK that Google will reject.

The only safe paths to a downloadable, submittable AAB are:

1. **Local workstation** — clone the repo, run `scripts/build-android.sh`.
2. **CI** — GitHub Actions workflow described in §2 below; the job uploads
   the AAB as a release asset on every tag push.

Both paths produce the **same** artifact at:

```
android/app/build/outputs/bundle/release/app-release.aab
```

That is the file you upload to Play Console.

---

## 2. CI: produce a downloadable AAB on every git tag

Add the following to `.github/workflows/release-android.yml` (commit it
once, then every `git tag vX.Y.Z && git push --tags` produces a download
link under **GitHub → Releases → vX.Y.Z → Assets**).

```yaml
name: Android release
on:
  push:
    tags: ["v*"]
jobs:
  aab:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }
      - uses: android-actions/setup-android@v3
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: npx cap add android || true
      - run: npx cap sync android
      - name: Decode keystore
        run: echo "$KEYSTORE_B64" | base64 -d > rufayq.keystore
        env: { KEYSTORE_B64: "${{ secrets.RUFAYQ_KEYSTORE_B64 }}" }
      - name: Bundle release
        env:
          RUFAYQ_KEYSTORE: ${{ github.workspace }}/rufayq.keystore
          RUFAYQ_STORE_PASS: ${{ secrets.RUFAYQ_STORE_PASS }}
          RUFAYQ_KEY_PASS:   ${{ secrets.RUFAYQ_KEY_PASS }}
        run: cd android && ./gradlew bundleRelease
      - uses: softprops/action-gh-release@v2
        with:
          files: android/app/build/outputs/bundle/release/app-release.aab
```

Required secrets in **GitHub → Settings → Secrets**:

| Secret | Value |
|---|---|
| `RUFAYQ_KEYSTORE_B64` | `base64 -w0 rufayq-upload.keystore` |
| `RUFAYQ_STORE_PASS` | keystore password |
| `RUFAYQ_KEY_PASS` | key alias password |

---

## 3. QC test plan

The matrix below is what we run **on every AAB** before promoting it past
internal testing. Track each row in your bug tracker; failing P0/P1 items
block the release.

### 3.1 Smoke tests (must pass on every build · ~15 min)

Run on **one** mid-range device (Pixel 5 / Galaxy A54). Goal: prove the
build is not fundamentally broken.

| # | Step | Pass criteria | Sev |
|---|---|---|---|
| S1 | Install AAB via `bundletool`, launch | Splash shows, lands on Onboarding or Login within 3 s | P0 |
| S2 | Complete sign-up via OTP | Reaches Role selector | P0 |
| S3 | Pick "Patient" → continue | Lands on Home tab | P0 |
| S4 | Tap each bottom-nav tab | All 5 tabs render without crash | P0 |
| S5 | Open AI Chat, send "hello" | Response within 8 s | P1 |
| S6 | Open Document Scanner, take photo | Wizard advances past capture step | P1 |
| S7 | Sign out → sign back in | Role selector skipped (preference persisted) | P1 |
| S8 | Force-quit app, reopen | Returns to Home, no re-login required | P1 |
| S9 | Toggle airplane mode → reopen Home | Stale-data banner appears, no crash | P1 |

### 3.2 Black-box tests (functional, no source knowledge · ~3 h)

Tester behaves as an end-user. Performed by a separate QC engineer.

#### Authentication
- [ ] Sign-up with WhatsApp OTP, SMS OTP, email OTP — each path completes
- [ ] Wrong OTP × 5 → lockout message in EN and AR
- [ ] Forgot password → reset link arrives within 60 s
- [ ] Biometric unlock (if device supports) re-fills email field

#### Role selector (RTL coverage)
- [ ] Switch language to Arabic before signup → role selector renders RTL
- [ ] Switch to "both" mode → both languages stack vertically
- [ ] Tap **Continue** without picking → bilingual hint appears
- [ ] Pick Doctor → arrives at `/provider`
- [ ] Pick Patient, sign out, sign back in → no role selector shown
- [ ] Clear app data → role selector reappears

#### Patient core (each tab)
- [ ] Home: cards render, badges clear after tap
- [ ] Journey: add a flight via scanner, verify ticket card
- [ ] Records: upload a PDF, verify it appears under correct category
- [ ] Care Hub: medical disclaimer visible
- [ ] AI Chat: voice note records, transcript shows, disclaimer visible

#### Medications
- [ ] Add medication manually → appears in list with reminder
- [ ] Mark dose as taken → badge updates
- [ ] Snooze a reminder → re-fires at correct time

#### Wallet & refunds
- [ ] Bank-transfer checkout → upload receipt → status timeline updates
- [ ] Cancel within 25 % window → policy hint shows correct amount
- [ ] Cancel within 45 % window → policy hint shows correct amount
- [ ] Wallet ledger CSV export downloads

#### Android Auto (DHU required)
- [ ] Phone connects to DHU, Rufayq tile visible
- [ ] "Next medication" surface shows current med
- [ ] "Next appointment" surface shows correct date
- [ ] "Current journey leg" surface shows live timer
- [ ] "Emergency call" tile triggers dialer

#### Push notifications
- [ ] First permission prompt appears once
- [ ] Backend test push arrives within 10 s in foreground (toast)
- [ ] Test push arrives in background (system tray)
- [ ] Tapping a push with `data.url=rufayq://meds/next` opens Medications

#### Offline / connectivity
- [ ] Airplane mode → Home shows cached data with banner
- [ ] Stale banner age string is bilingual and accurate
- [ ] Tap Retry while offline → spinner shows, no silent failure
- [ ] Restore connectivity → next refresh shows fresh data, banner gone
- [ ] Sign out while offline → cache cleared (no leftover data on next login)

### 3.3 White-box tests (with source knowledge · ~4 h)

Run by a developer. Verifies internal contracts, not just UX.

#### Build hygiene
- [ ] `bun run test` 100 % green (vitest)
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `bunx vitest run src/lib/offline` (cache layer) all pass
- [ ] `bunx vitest run src/features/refunds` (policy edge cases) all pass
- [ ] `bunx vitest run src/features/auth/logic` (permissions matrix) pass
- [ ] AAB analyser: bundle ≤ 25 MB, no duplicated `react-dom`

#### Manifest & permissions
- [ ] `dump.xml` from `aapt dump permissions app-release.aab` matches the
      table in `docs/android-release-notes.md` §2.5
- [ ] No permissions from the "must-not-be-present" list
- [ ] `targetSdkVersion = 34`, `minSdkVersion = 24`

#### Network contract
- [ ] DevTools network log shows all calls hit `*.supabase.co` over HTTPS
- [ ] No call hits `*.lovableproject.com` (would mean `server.url` leaked)
- [ ] Auth header attached to every authenticated REST call
- [ ] `device_id` header attached (see `src/integrations/supabase/deviceHeader.ts`)

#### Data persistence
- [ ] Inspecting Application → Storage:
  - `localStorage` contains only: `rufayq_role`, `rufayq_role_version`,
    `rufayq_onboarded`, `rufayq_lang_mode`, `rufayq_lang_mode_explicit`,
    `rufayq_bio_email`, `rufayq_guest_ok`
  - `sessionStorage` contains only `rufayq.cache.v1.*` keys
  - **No** medical record content in `localStorage` or IndexedDB
- [ ] `clearAll()` from `lib/offline/cache` empties `sessionStorage`
      `rufayq.cache.v1.*` keys

#### RLS / authorization
- [ ] As Patient A, attempt to read Patient B's `medical_records` row via
      direct REST call → 401/empty
- [ ] As Patient, attempt to read `audit_log` → empty
- [ ] As Doctor, calls to `/provider/*` succeed; calls to admin RPCs fail

#### Push token lifecycle
- [ ] Fresh install registers a token row in `device_push_tokens`
- [ ] Sign out → row is **not** deleted (other devices still need it)
- [ ] Uninstall + reinstall → new token replaces old (`onConflict: token`)

#### Accessibility
- [ ] TalkBack reads role-selector cards as "Patient, button, not selected"
- [ ] Contrast ratio ≥ 4.5:1 on all text
- [ ] Tappable targets ≥ 48×48 dp

#### Localization
- [ ] Switch device language to Arabic → app launches in AR + RTL
- [ ] Every string in the role selector exists in both EN and AR
- [ ] No raw `{en: ..., ar: ...}` objects rendered as `[object Object]`

### 3.4 Severity definitions

| Sev | Definition | Action |
|---|---|---|
| P0 | Crash on launch, data loss, security leak | Block release |
| P1 | Core flow broken (signup, payment, scan, push) | Block release |
| P2 | Visual regression, edge-case UI bug | Fix-forward in next patch |
| P3 | Nice-to-have, copy tweak | Backlog |

### 3.5 Sign-off

| Suite | Tester | Build sha256 | Pass? | Date |
|---|---|---|---|---|
| Smoke | | | | |
| Black-box | | | | |
| White-box | | | | |

---

## 4. Where to find the artifact during alpha

Once CI is wired (§2), every release tag publishes the AAB at:

```
https://github.com/<org>/<repo>/releases/download/v<X.Y.Z>/app-release.aab
```

Until CI is wired, run `scripts/build-android.sh` locally and upload to a
private location (Drive / S3 with expiring URL) for QC testers. **Never**
post the unsigned debug APK — testers will install it, then fail to
update from the signed Play release.
