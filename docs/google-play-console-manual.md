# Google Play Console Manual — Rufayq (Patient + Doctor + Android Auto)

This document is the **single source of truth** for getting the Rufayq Android
build from source code to a published listing on Google Play, including the
**Android Auto** review path. Follow it top-to-bottom the first time; later
releases only need the "Release a new version" section at the end.

---

## 1. Accounts & one-time setup

You confirmed all three are already provisioned:

| Account | Used for | Where |
|---|---|---|
| **Google Play Console** (organization) | App listing, store presence, releases | https://play.google.com/console |
| **Google Cloud / Firebase** project | FCM push, analytics, signing keys download | https://console.cloud.google.com |
| **Android Auto Developer** enrollment | Adds the Auto review track to your app | https://developers.google.com/cars/design/automotive-os/distribute |

> Make sure the **same Google account** is owner on all three, or that the Play
> Console has the Cloud account added as a developer with `Admin` role. Auto
> review jobs cross-reference the Cloud project number on the build.

---

## 2. Producing the Android package (AAB)

We ship as a single Capacitor app with a runtime role selector
(`appId = com.rufayq.app`). Google requires an **Android App Bundle (.aab)**
for new releases.

### 2.1 Local toolchain (one time)

```bash
# Java 17 (required by AGP 8)
sdkmanager --install "platforms;android-34" "build-tools;34.0.0"
# Android Studio Hedgehog or newer
```

### 2.2 Build pipeline

```bash
# from project root
npm install
npm run build                 # produces dist/
npx cap sync android          # copies web assets + plugins into android/
cd android
./gradlew bundleRelease       # produces android/app/build/outputs/bundle/release/app-release.aab
```

### 2.3 App signing

Use **Play App Signing** (recommended). Generate an upload keystore once:

```bash
keytool -genkey -v -keystore rufayq-upload.keystore \
  -alias rufayq -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/app/build.gradle`:

```gradle
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("RUFAYQ_KEYSTORE"))
      storePassword System.getenv("RUFAYQ_STORE_PASS")
      keyAlias "rufayq"
      keyPassword System.getenv("RUFAYQ_KEY_PASS")
    }
  }
  buildTypes { release { signingConfig signingConfigs.release } }
}
```

Store the keystore + passwords in your CI secret manager. Never commit them.

> **Before the first upload**, remove the `server.url` block in
> `capacitor.config.ts` so the production build loads the bundled web assets
> instead of the Lovable preview.

---

## 3. Creating the app in Play Console

`Play Console → All apps → Create app`

| Field | Value |
|---|---|
| App name | **Rufayq** |
| Default language | English (United States) – `en-US` |
| App or game | **App** |
| Free or paid | **Free** (in-app subscriptions handled separately) |
| Declarations | Check both: meets program policies, US export laws |

### 3.1 App details (Main store listing)

| Field | Value |
|---|---|
| Short description (≤80) | "Bilingual AI medical companion for Saudi patients traveling abroad." |
| Full description (≤4000) | Use copy from `docs/marketing/play-listing.md` (or the website hero). Include sections: What it does, Who it's for, Patient features, Doctor features, Privacy. |
| App icon | 512×512 PNG, transparent BG, exported from `src/assets/logo` |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | 4–8 PNGs (min 320 px) of Home, Journey, Records, Care Hub, AI Chat |
| Tablet screenshots | optional but recommended (7" + 10") |
| Auto screenshots | **Required for Android Auto track** — 1920×1080 of meds, next appointment, journey leg, emergency call surfaces |
| Promo video | optional YouTube URL |
| Category | **Medical** |
| Tags | Health, Travel, Productivity |
| Contact email | support@rufayq.com |
| Website | https://rufayq.com |
| Privacy policy | https://rufayq.com/privacy |

### 3.2 Content & compliance forms (all required before release)

Fill these under `Policy → App content`:

1. **Privacy policy URL** → `https://rufayq.com/privacy`
2. **App access** — provide demo credentials (a test patient + test doctor
   account) so Google reviewers can sign in. Include a note that the role
   selector appears after first sign-in.
3. **Ads** → No
4. **Content rating** — IARC questionnaire. Rufayq scores **Everyone / PEGI 3**
   (no violence, no gambling, references to medications only in user-supplied
   data).
5. **Target audience** → Ages 18+. Not directed at children.
6. **News app** → No
7. **COVID-19 contact tracing** → No
8. **Data safety** — see table in §3.3
9. **Government app** → No
10. **Financial features** → "Users can manage subscriptions"
11. **Health app declaration** → **Yes**. Select sub-categories: *Medical
    records storage*, *Appointment management*, *Medication tracking*. Upload
    the disclaimer screenshot from AI Chat / Care Hub showing the
    "not professional medical advice" notice.

### 3.3 Data safety (most asked questions)

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Email address | Yes | No | No | Account, support |
| Phone number | Yes | No | Yes | OTP login |
| Name | Yes | No | Yes | Personalisation |
| Health info (records, meds) | Yes | No | Yes | App functionality |
| Photos / files (uploads) | Yes | No | Yes | Document scanning |
| Approximate location | No | – | – | – |
| Device ID | Yes | No | No | Auth, fraud prevention |
| App interactions | Yes | No | Yes | Analytics, app functionality |

All data is **encrypted in transit (TLS 1.2+)** and **at rest** (Supabase
managed Postgres + storage). Users can request deletion in-app via Settings →
Account → Delete data.

### 3.4 Permissions justification

Declare each in `AndroidManifest.xml` and explain in the listing:

| Permission | Why |
|---|---|
| `INTERNET` | API calls to backend |
| `POST_NOTIFICATIONS` (API 33+) | Medication, journey, refund alerts |
| `CAMERA` | Document scanner |
| `READ_MEDIA_IMAGES` | Selecting receipts/records from gallery |
| `CALL_PHONE` | Emergency call shortcut |
| `ACCESS_NETWORK_STATE` | Offline caching layer |
| `androidx.car.app.ACCESS_SURFACE` | Android Auto |
| `androidx.car.app.NAVIGATION_TEMPLATES` | Android Auto navigation card |

---

## 4. Android Auto track

Android Auto reviews are run **separately** from phone reviews and require
extra metadata.

### 4.1 Manifest

```xml
<application>
  <!-- Marks the app as Auto-compatible -->
  <meta-data
    android:name="com.google.android.gms.car.application"
    android:resource="@xml/automotive_app_desc"/>
  <service
    android:name=".auto.RufayqCarAppService"
    android:exported="true">
    <intent-filter>
      <action android:name="androidx.car.app.CarAppService"/>
      <category android:name="androidx.car.app.category.IOT"/>
    </intent-filter>
  </service>
</application>
```

`res/xml/automotive_app_desc.xml`:

```xml
<automotiveApp>
  <uses name="template"/>
</automotiveApp>
```

### 4.2 v1 surfaces (approved scope)

| Surface | Source screen in app | Deep link |
|---|---|---|
| Next medication | `MedicationsScreen` | `rufayq://meds/next` |
| Next appointment | `JourneyScreen` (appointments tab) | `rufayq://appointment/next` |
| Current journey leg | `JourneyScreen` | `rufayq://journey/current` |
| Emergency call | dialer intent + `ProfileScreen` emergency contact | `rufayq://emergency` |

### 4.3 Submission checklist

- [ ] Auto APK passes `validatecarapp` lint
- [ ] Recorded a screen capture of all four surfaces (used for review)
- [ ] Added the **Android Auto** track under `Release → Production →
      Android Auto`
- [ ] Provided a test driver Google account so reviewers can pair DHU

---

## 5. Releases

### 5.1 First release (Internal testing → Closed → Production)

1. **Internal testing**: upload the AAB, add up to 100 internal testers by
   email. Roll out to 100%. Verify on real devices for ~3 days.
2. **Closed testing (alpha)**: open to 20–500 invited users. Required by
   Google for personal-developer accounts; recommended for orgs too. Run for
   **≥14 days** with **≥12 active testers** so the production track unlocks.
3. **Production**: staged rollout starting at 10%. Increase daily if no
   crash spike (`Vitals → Crashes` should stay under 1.09%).

### 5.2 Release a new version (the day-to-day flow)

```bash
npm run build && npx cap sync android
cd android && ./gradlew bundleRelease
# upload android/app/build/outputs/bundle/release/app-release.aab via Play Console UI
# OR via fastlane:
fastlane supply --aab app-release.aab --track production --rollout 0.1
```

Bump `versionCode` (integer, must increase every upload) and `versionName`
("1.0.3") in `android/app/build.gradle` before each build. Tag the git
commit `vX.Y.Z` to keep release notes traceable.

### 5.3 Release notes template

```
EN: Bug fixes and improvements.
AR: تحسينات وإصلاحات للأخطاء.
```

For feature releases, list 3–5 bullet items in both languages.

---

## 6. Post-launch

- **Vitals dashboard**: monitor crash rate, ANR rate, battery usage
- **Pre-launch report**: Google auto-runs your AAB on virtual devices —
  always read the resulting report before promoting to production
- **Policy alerts**: respond within 7 days or risk a strike. Check the
  console weekly.
- **Auto track**: any change to `RufayqCarAppService` or new templates
  triggers a re-review. Plan an extra 5 business days.

---

## 7. Quick reference

| Item | Value |
|---|---|
| Application ID | `com.rufayq.app` |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |
| Bundle path | `android/app/build/outputs/bundle/release/app-release.aab` |
| Upload keystore env vars | `RUFAYQ_KEYSTORE`, `RUFAYQ_STORE_PASS`, `RUFAYQ_KEY_PASS` |
| FCM sender ID | (paste from Firebase project settings) |
| Auto service class | `com.rufayq.app.auto.RufayqCarAppService` |
