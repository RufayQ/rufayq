# Mobile strategy — iOS, Android & Android Auto

This document explains **how** we will ship Rufayq as native mobile apps for both
the **Patient** and **Doctor (Provider)** personas, including **Android Auto**
support for the Patient app. Implementation is staged so we can ship value
quickly and add platform-specific surfaces incrementally.

---

## 1. Strategy at a glance

We will use **Capacitor** to wrap the existing React/Vite SPA into native iOS and
Android shells. The same web bundle powers all three personas, so a single
Capacitor project can ship two store listings (Patient, Doctor) by toggling a
build-time persona flag and a different `appId` / icon set.

| Persona | Store listing | Platforms | Auto / extras |
|---------|--------------|-----------|---------------|
| Patient | "Rufayq" | iOS + Android | **Android Auto** (medication reminders + journey alerts) and **CarPlay** (read-only) |
| Doctor  | "Rufayq for Clinics" | iOS + Android | — |

**Why Capacitor (not React Native, not Flutter):**
- 100% reuse of existing React + Tailwind UI and routing.
- Native-shell access to Camera, Push Notifications, Biometrics, Background
  Tasks, Health Connect / HealthKit.
- Allows a custom Android Automotive / Android Auto module written in Kotlin
  alongside the web view.
- Aligns with Lovable's recommended native path.

---

## 2. App identifiers

| Build | iOS bundle ID | Android applicationId | Display name |
|-------|---------------|-----------------------|--------------|
| Patient | `com.rufayq.patient` | `com.rufayq.patient` | Rufayq |
| Doctor  | `com.rufayq.doctor`  | `com.rufayq.doctor`  | Rufayq for Clinics |

Both share the same `appId` namespace prefix `com.rufayq.*` so signing certs and
push topics line up.

---

## 3. Repository layout (after Capacitor is added)

```
/
├── src/                       (unchanged React app)
├── ios/                       Xcode project (gitignored build artefacts)
├── android/                   Gradle project
│   └── app/src/main/java/.../auto/   ← Android Auto service (Kotlin)
├── capacitor.config.ts
├── capacitor.patient.json     persona overrides for Patient build
├── capacitor.doctor.json      persona overrides for Doctor build
└── docs/mobile-strategy.md    (this file)
```

The persona flag is read at build time:

```ts
// vite.config.ts
define: { __PERSONA__: JSON.stringify(process.env.RUFAYQ_PERSONA ?? 'patient') }
```

`AppShell` chooses the routing root based on `__PERSONA__`.

---

## 4. Phased plan

### Phase 0 — Prerequisites (no code yet)

1. Apple Developer enrollment (Patient + Doctor under the same team).
2. Google Play Console account, two app entries.
3. Android Auto / CarPlay developer enrollment (free, but requires app review).
4. App icons, splash screens, store screenshots in EN + AR.
5. Privacy policy URL (already at `/privacy`) and medical-disclaimer copy
   (already enforced — see project memory).

### Phase 1 — Capacitor shell (1 sprint)

1. `bun add @capacitor/core` + `bun add -d @capacitor/cli`.
2. `npx cap init` with `appId = com.rufayq.patient`, `appName = Rufayq`.
3. Add `capacitor.config.ts` with hot-reload `server.url` for the Lovable
   sandbox during development.
4. `bun add @capacitor/ios @capacitor/android` then `npx cap add ios && npx cap add android`.
5. Wire Capacitor plugins we need on day one:
   - `@capacitor/preferences` (settings persistence, replaces `localStorage`
     where reliability matters).
   - `@capacitor/network` (offline banner).
   - `@capacitor/status-bar` and `@capacitor/splash-screen`.
6. Build and run on a device:
   `bun run build && npx cap sync && npx cap run ios|android`.

**Acceptance:** the Patient mobile shell loads inside the native app, login
works, navigation works, theme + language toggles work.

### Phase 2 — Native capabilities (1 sprint)

| Capability | Plugin | Where it shows up |
|------------|--------|-------------------|
| Camera + gallery | `@capacitor/camera` | Document Scanner, profile photo |
| Local notifications | `@capacitor/local-notifications` | Medication reminders |
| Push notifications | `@capacitor/push-notifications` + FCM/APNs | Refund-status alerts |
| Biometric unlock | `capacitor-native-biometric` | App-lock on resume |
| File preview/share | `@capacitor/filesystem` + `@capacitor/share` | Vault export, ledger CSV |
| Deep links | `@capacitor/app` URL events | Email magic links, payment returns |

A small abstraction in `src/lib/native/` wraps each plugin so the web build
continues to work in the browser (graceful fallbacks).

### Phase 3 — Doctor build (1 sprint)

1. Duplicate Capacitor config with `RUFAYQ_PERSONA=doctor`, `appId =
   com.rufayq.doctor`, dedicated icons/splash.
2. Same code, but `AppShell` routes to `/provider/*` by default.
3. Add provider-only Capacitor plugins (e.g. signature pad for consent).
4. Submit to TestFlight / Play Internal Testing.

### Phase 4 — Android Auto for the Patient app (1 sprint)

Android Auto cannot run a web view — it must use the **Car App Library**
(Jetpack `androidx.car.app`). We add a small native module to the Android
project that exposes a curated, voice-friendly subset of features:

| Auto screen | Source of truth | Interaction |
|-------------|-----------------|-------------|
| Today's medications | `medications` table (cached locally) | Voice "Mark as taken" |
| Next appointment | `appointments` | Voice "Navigate" → hand off to Google Maps |
| Active journey leg | `journeys` + `tickets` | Read-only with voice prompts |
| Emergency contact | `profiles.emergency_*` | Voice "Call" |

Implementation outline:

1. Add the dependency in `android/app/build.gradle`:
   `implementation 'androidx.car.app:app:1.4.0'`
2. Declare the service in `AndroidManifest.xml`:
   ```xml
   <service
       android:name=".auto.RufayqCarAppService"
       android:exported="true">
     <intent-filter>
       <action android:name="androidx.car.app.CarAppService"/>
       <category android:name="androidx.car.app.category.POI"/>
     </intent-filter>
     <meta-data
         android:name="androidx.car.app.minCarApiLevel"
         android:value="1"/>
   </service>
   ```
3. Implement `RufayqCarAppService`, `MainSession`, and one `Screen` per
   surface above. Pull data through a thin Kotlin client that reads from a
   shared SQLite cache populated by the web app via Capacitor.
4. Distribute shared state through `@capacitor/preferences` (read-only on the
   Auto side) and `@capacitor/local-notifications` for reminder triggers.
5. Submit for **Android Auto review** alongside the regular Play submission.

**CarPlay (iOS, optional):** Apple restricts CarPlay templates to specific
categories. Medical apps qualify only for `CPListTemplate` style "now playing"
or "navigation" — not health workflows. We will ship CarPlay support **only as
a read-only "Today's reminders" template**, gated behind an Apple entitlement
request. Plan for 4-8 weeks of Apple review.

### Phase 5 — Hardening & store submission (1 sprint)

- Crash reporting (Sentry Capacitor).
- Performance budget (cold start <2.5s on mid-tier Android).
- Accessibility audit (TalkBack + VoiceOver, RTL).
- Store assets in EN + AR.
- Production signing keys stored in Lovable Cloud secrets (never in repo).

---

## 5. Build & run cheat sheet

```bash
# Patient (default)
RUFAYQ_PERSONA=patient bun run build
npx cap sync
npx cap run ios       # requires Mac + Xcode
npx cap run android   # requires Android Studio

# Doctor
RUFAYQ_PERSONA=doctor bun run build
npx cap sync
npx cap run android
```

Hot-reload during development uses the Lovable preview URL configured in
`capacitor.config.ts`:

```json
{
  "server": {
    "url": "https://<sandbox-id>.lovableproject.com?forceHideBadge=true",
    "cleartext": true
  }
}
```

---

## 6. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Apple rejects medical claims | Strict on-screen disclaimers (already enforced). Position as a *companion*, not a diagnostic tool. |
| Android Auto rejects medical UI | Limit to reminder + navigation hand-off templates. No diagnostic surfaces. |
| RTL bugs in native shells | Test every screen in `dir=rtl` before submission. Add a Capacitor smoke test that flips the language. |
| Push reliability across regions | Use FCM + APNs through Lovable Cloud secrets; fall back to in-app bell if delivery fails. |
| Two app stores × two personas = 4 submissions | Automate with Fastlane once Phase 3 is green. |

---

## 7. What needs a decision before Phase 1 starts

These are blockers for implementation — please confirm before we run
`npx cap init`:

1. **Apple + Google developer accounts** are provisioned and the team is added.
2. **App icons & splash** in `1024x1024` are available (or we generate
   placeholders).
3. **Persona split**: confirm Patient + Doctor ship as **separate listings**
   (recommended) vs. a single app with role selector.
4. **Android Auto scope**: confirm the four surfaces in Phase 4 are the right
   first slice.
5. **Push provider**: FCM + APNs via Lovable Cloud (default) vs. OneSignal.

Once confirmed, Phase 1 can be done in a single sprint and we will follow up
with manual setup docs in `docs/mobile-setup.md`.
