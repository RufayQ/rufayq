# Android Release Checklist (Alpha / Beta)

Copy this checklist into the GitHub Release description for every tag.
Tick boxes inline — do not ship a release with any P0/P1 unchecked.

> Package: `com.rufayq.app`
> Default CI track: **internal**, status **draft** (manual promotion only)
> Promotion path: internal → closed alpha (≥14 days, ≥12 testers) → beta → production staged 10%

---

## Pre-build

- [ ] `versionCode` incremented in `android/app/build.gradle` (must be strictly greater than the last uploaded build)
- [ ] `versionName` follows semver matching the git tag (`v1.4.2` → `1.4.2`)
- [ ] `CHANGELOG.md` updated; user-visible bullets added in EN + AR
- [ ] All P0/P1 issues from `docs/android-build-and-qc.md` §3.1 smoke suite pass on a real device

## Build (CI)

- [ ] Tag pushed: `git tag vX.Y.Z && git push --tags`
- [ ] **Android release** workflow green (https://github.com/<org>/<repo>/actions)
- [ ] Keystore validation step passed (alias found, password ok, cert >30 days)
- [ ] AAB signature verification step passed (`apksigner verify`)
- [ ] AAB sha256 recorded in the GitHub Release notes
- [ ] AAB size < 25 MB

## Play Console — listing readiness

- [ ] Short + long description match `docs/google-play-console-manual.md` §3.1
- [ ] At least 4 phone screenshots updated if any UI changed in this release
- [ ] **Auto screenshots** (1920×1080) updated if any Auto surface changed
- [ ] Privacy policy URL reachable (200 OK from incognito)
- [ ] Demo Patient + Demo Doctor accounts still work (Google reviewers use these)

## Data safety mapping (re-confirm every release)

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Email address | ✅ | ❌ | ❌ | Account, support |
| Phone number | ✅ | ❌ | ✅ | OTP login |
| Name | ✅ | ❌ | ✅ | Personalisation |
| Health info (records, meds) | ✅ | ❌ | ✅ | App functionality |
| Photos / files (uploads) | ✅ | ❌ | ✅ | Document scanning |
| Device ID | ✅ | ❌ | ❌ | Auth, fraud prevention |
| App interactions | ✅ | ❌ | ✅ | Analytics |

- [ ] No new data type collected by this release. *(If any added, update Data Safety form **before** promoting beyond internal.)*
- [ ] Encryption-in-transit and at-rest declarations still accurate
- [ ] In-app deletion path (Settings → Account → Delete data) still works

## Permissions audit

Compare against `docs/google-play-console-manual.md` §3.4:

```bash
$ANDROID_HOME/build-tools/34.0.0/aapt dump permissions \
  android/app/build/outputs/bundle/release/app-release.aab
```

- [ ] Output matches the approved list (no new permissions silently added by a plugin)
- [ ] If a new permission appears, justification added to listing **before** upload

## Track promotion gates

### Internal → Closed alpha
- [ ] AAB has run ≥3 days on internal with ≥5 testers
- [ ] Crash-free sessions ≥99.5% (`Vitals → Crashes`)
- [ ] No P0/P1 in QC matrix

### Closed alpha → Open beta
- [ ] ≥14 days on alpha with ≥12 active testers (Google requirement for personal accounts)
- [ ] Pre-launch report green on all virtual devices
- [ ] Android Auto track separately approved if Auto surfaces changed

### Beta → Production (10% staged)
- [ ] Beta crash-free ≥99.7% over 7 days
- [ ] Data safety form reviewed by privacy owner
- [ ] Release notes translated and reviewed in EN + AR
- [ ] Rollback plan documented (which previous `versionCode` to halt-and-revert to)

## Post-publish

- [ ] Play Console release status: **Available on Google Play** ✅
- [ ] Tag the GitHub Release as **Latest**
- [ ] Watch Vitals for 24 h; halt rollout if crash-free drops below 99%
- [ ] File a follow-up issue for any P2/P3 deferred during release

---

## Release notes templates

### Patch (bug fixes only)
```
EN
• Stability and performance improvements.
• Fixed: <one-line summary>

AR
• تحسينات في الاستقرار والأداء.
• تم إصلاح: <ملخص مكون من سطر واحد>
```

### Minor (new feature)
```
EN
• New: <feature> — <one-line value>
• Improved: <area>
• Fixed: <bug>

AR
• جديد: <ميزة> — <قيمة بسطر واحد>
• تحسين: <جانب>
• إصلاح: <خلل>
```

### Major (breaking / major flow change)
Coordinate with marketing — full bilingual copy block, 4–6 bullets, plus a What's New screen inside the app.
