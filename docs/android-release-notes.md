# Android Alpha / Beta Release Notes & Console Checklist

> Companion to **`google-play-console-manual.md`**. That doc is the
> end-to-end onboarding manual; *this* doc is the per-release runbook you
> tick off before promoting a build to internal → closed → open testing.

---

## 1. Release notes templates

Paste these into **Play Console → Release → Release notes** (one block per
language). Keep total length **≤ 500 chars** per language; Google rejects
longer notes silently.

### 1.0.0 — Initial Alpha

```
EN (en-US):
First alpha of Rufayq for Android.
• Bilingual (EN/AR) shell with role selector
• Patient: journey, records, medications, AI chat
• Doctor: provider portal access
• Document scanner with AI OCR
• Bank-transfer checkout + refund timeline
• Android Auto: meds, next appointment, journey leg, emergency call
• Offline-tolerant cache for Home/Journey/Records
Known: signup uses OTP via WhatsApp/SMS/email — please share failures.

AR (ar):
الإصدار التجريبي الأول لتطبيق رفايق على أندرويد.
• واجهة ثنائية اللغة مع اختيار الدور
• للمريض: الرحلة والسجلات والأدوية والمحادثة الذكية
• للطبيب: بوابة مزوّدي الخدمة
• ماسح الوثائق بالذكاء الاصطناعي
• الدفع بالحوالة البنكية وجدول استرداد
• أندرويد أوتو: الأدوية والمواعيد والرحلة وزر الطوارئ
• تخزين مؤقت يعمل دون اتصال
ملاحظة: التسجيل عبر OTP — برجاء إبلاغنا بأي عطل.
```

### 1.0.x — Patch release template

```
EN: Bug fixes and stability improvements. [+ 1-line of the headline fix]
AR: تحسينات وإصلاحات للأخطاء. [+ سطر واحد لأهم إصلاح]
```

### 1.1.0 — Minor feature release template

```
EN:
What's new
• <feature 1>
• <feature 2>
Fixes
• <fix 1>
• <fix 2>

AR:
الجديد
• <ميزة ١>
• <ميزة ٢>
الإصلاحات
• <إصلاح ١>
• <إصلاح ٢>
```

---

## 2. Pre-release console checklist

Run top-to-bottom **before clicking "Review release"**.

### 2.1 Build artifact

- [ ] `versionCode` strictly greater than the previous upload
- [ ] `versionName` matches git tag (`vX.Y.Z`)
- [ ] AAB built with **release** signing config (Play App Signing enrolled)
- [ ] `capacitor.config.ts` `server.url` block **removed** for store builds
- [ ] No `console.log` in `src/lib/native/*` (use `console.warn` for errors)
- [ ] `npm run test` is green
- [ ] `npm run build` produces `dist/` with no `lovable-tagger` warnings

### 2.2 Listing readiness (Main store listing)

- [ ] Short description ≤ 80 chars
- [ ] Full description ≤ 4000 chars, includes Patient + Doctor sections
- [ ] App icon: 512×512 PNG (no alpha edge artifacts)
- [ ] Feature graphic: 1024×500 PNG (no overlay text smaller than 32 px)
- [ ] **8 phone screenshots** (Home, Journey, Records, Care Hub, AI Chat,
      Medications, Profile, Pricing) — at least one in Arabic
- [ ] **4 Android Auto screenshots** (1920×1080) for: meds, next
      appointment, current journey leg, emergency call
- [ ] Promo video (optional) — YouTube URL, no monetization
- [ ] Contact email reachable in <24 h

### 2.3 Content & policy forms

- [ ] Privacy policy URL resolves over HTTPS (no redirects)
- [ ] **App access** — demo accounts entered:
  - Patient demo: `+966500000000` + OTP `000000` (test phone provider)
  - Doctor demo: `doctor.demo@rufayq.com` / temporary password from CI
  - Note added: "Role selector appears after first sign-in"
- [ ] Ads declaration: **No**
- [ ] Content rating questionnaire submitted → **PEGI 3 / Everyone**
- [ ] Target audience: **18+**
- [ ] Health app declaration: **Yes** + sub-categories ticked + disclaimer
      screenshot uploaded
- [ ] News app: **No**
- [ ] Government app: **No**
- [ ] Financial features: subscription management
- [ ] Data deletion URL → in-app `Settings → Account → Delete data` + email
      `support@rufayq.com`

### 2.4 Data safety form mapping

Map the in-app data model → Play Console's "Data safety" form. Fill
**every** row even when the answer is "No" — empty rows are flagged.

| Data type (Console label) | Collected? | Shared? | Optional? | Purpose | Source in code |
|---|---|---|---|---|---|
| Personal · Name | Yes | No | Yes | Account, personalisation | `profiles.name` |
| Personal · Email | Yes | No | No | Account, support | `auth.users.email` |
| Personal · Phone number | Yes | No | Yes | OTP login, emergency contact | `profiles.phone`, `EmergencyContactsSheet` |
| Personal · Address | No | – | – | – | – |
| Personal · Race & ethnicity | No | – | – | – | – |
| Personal · Other info | No | – | – | – | – |
| Financial · User payment info | Yes | No | No | App functionality (subscription) | `wallet_transactions`, bank-transfer receipts |
| Financial · Purchase history | Yes | No | Yes | App functionality | `subscriptions`, `wallet_ledger` |
| Health & fitness · Health info | Yes | No | Yes | App functionality | `medical_records`, `medications`, `appointments` |
| Health & fitness · Fitness info | No | – | – | – | – |
| Messages · Emails | No | – | – | – | – |
| Messages · SMS or MMS | No | – | – | – | – |
| Messages · Other in-app messages | Yes | No | Yes | App functionality (AI chat) | `chat_messages` |
| Photos & videos · Photos | Yes | No | Yes | App functionality (document scan) | `storage.documents` |
| Photos & videos · Videos | No | – | – | – | – |
| Audio · Voice or sound recordings | Yes | No | Yes | App functionality (voice notes in AI chat) | `chat_messages.audio_url` |
| Audio · Music files | No | – | – | – | – |
| Audio · Other audio files | No | – | – | – | – |
| Files & docs | Yes | No | Yes | App functionality (records vault) | `storage.documents` |
| Calendar | No | – | – | – | – |
| Contacts | No | – | – | – | – |
| App activity · App interactions | Yes | No | Yes | Analytics, app functionality | `audit_log` |
| App activity · In-app search history | No | – | – | – | – |
| App activity · Installed apps | No | – | – | – | – |
| App activity · Other user-generated content | Yes | No | Yes | App functionality | journey notes, refund disputes |
| App activity · Other actions | No | – | – | – | – |
| Web browsing · Web browsing history | No | – | – | – | – |
| App info & performance · Crash logs | Yes | No | Yes | Diagnostics | (when Crashlytics added) |
| App info & performance · Diagnostics | Yes | No | Yes | Diagnostics | edge function logs |
| App info & performance · Other app performance data | No | – | – | – | – |
| Device or other identifiers | Yes | No | No | Auth, fraud prevention | `useDeviceId`, `device_push_tokens` |

**Security practices to declare (all Yes):**

- [x] Data is encrypted in transit (TLS 1.2+)
- [x] Data is encrypted at rest (Supabase managed Postgres + Storage)
- [x] You provide a way for users to request that their data is deleted
- [x] You commit to follow the Play Families Policy → **N/A** (18+ app)
- [x] Independent security review → **No** (declare honestly; flip to Yes
      when SOC 2 / pen-test report exists)

### 2.5 Permissions review

Open `android/app/src/main/AndroidManifest.xml` after `npx cap sync` and
confirm every entry is justified. Remove anything Capacitor pulled in that
the app does not actually use.

| Permission | Required by | Justification (paste into Console if asked) | Sensitive? |
|---|---|---|---|
| `INTERNET` | Core | API calls to backend | No |
| `ACCESS_NETWORK_STATE` | `@capacitor/network` | Detect connectivity for offline cache | No |
| `POST_NOTIFICATIONS` | `@capacitor/push-notifications` (API 33+) | Medication, journey, refund alerts | **Yes — runtime prompt** |
| `CAMERA` | `@capacitor/camera` | Document scanner for medical records | **Yes — runtime prompt** |
| `READ_MEDIA_IMAGES` | `@capacitor/camera` (gallery picker, API 33+) | Selecting receipts/records from gallery | **Yes — runtime prompt** |
| `READ_EXTERNAL_STORAGE` (maxSdk 32) | `@capacitor/filesystem` | Legacy gallery access on Android ≤ 12 | Yes |
| `WRITE_EXTERNAL_STORAGE` (maxSdk 28) | `@capacitor/filesystem` | Save exports on Android ≤ 9 | Yes |
| `CALL_PHONE` | Emergency-call shortcut from `ProfileScreen` & Auto | Bypasses dialer for one-tap emergency | **Yes — runtime prompt** |
| `RECEIVE_BOOT_COMPLETED` | `@capacitor/local-notifications` | Re-schedule medication reminders after reboot | No |
| `VIBRATE` | `@capacitor/local-notifications` | Reminder feedback | No |
| `androidx.car.app.ACCESS_SURFACE` | Android Auto | Render templates on Auto display | No (Auto-only) |
| `androidx.car.app.NAVIGATION_TEMPLATES` | Android Auto | Navigation card for journey leg | No (Auto-only) |

**Hard "must-not-be-present" list** — if any of these slip in, fail the
release:

- [ ] `READ_CONTACTS`
- [ ] `READ_CALENDAR`
- [ ] `ACCESS_FINE_LOCATION` / `ACCESS_BACKGROUND_LOCATION`
- [ ] `RECORD_AUDIO` (voice notes use Web Audio in WebView, not native mic)
- [ ] `READ_PHONE_STATE`
- [ ] `QUERY_ALL_PACKAGES`
- [ ] `SYSTEM_ALERT_WINDOW`

### 2.6 Track-specific gates

#### Internal testing → Closed (alpha)

- [ ] ≥ 5 internal testers acknowledged the invite
- [ ] ≥ 3 days elapsed with no `Vitals → Crashes` regression
- [ ] At least one tester completed the full Patient onboarding flow
- [ ] At least one tester signed in as Doctor, landed on `/provider`

#### Closed → Open (beta)

- [ ] **≥ 14 days** with **≥ 12 active testers** (Google's hard rule for
      personal Play Console accounts; recommended even for orgs)
- [ ] No P0 / P1 bugs open in the QC tracker
- [ ] Pre-launch report: 0 crashes, 0 ANRs across the device matrix
- [ ] Android Auto screen-capture re-recorded if `RufayqCarAppService` or
      any template changed

#### Open → Production

- [ ] Staged rollout starts at **10%**
- [ ] Crash-free user rate ≥ **99.5%** during the staged window
- [ ] Support inbox watched daily for first 7 days
- [ ] Rollback plan documented (previous AAB still uploaded as a draft)

---

## 3. Sign-off

| Role | Name | Date |
|---|---|---|
| Release engineer | | |
| QC lead | | |
| Product owner | | |
| Privacy / DPO (data-safety form) | | |
