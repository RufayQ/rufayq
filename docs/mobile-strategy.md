# Mobile strategy — iOS, Android & Android Auto

Native shells for Rufayq, built with **Capacitor** so the existing React/Vite
SPA powers all platforms. Decisions on file:

- **Single app, role selector** — one store listing per platform. Patient and
  Doctor personas live in the same binary; the user picks (or has assigned) a
  role at sign-in.
- **Android first** — faster iteration, no Mac required, and unlocks Android
  Auto sooner.
- **Android Auto v1 surfaces** — Today's medications, Next appointment, Active
  journey leg, Emergency call.
- **Accounts ready** — Apple, Google Play, and Android Auto enrollments are
  provisioned; we proceed straight into Phase 1.

---

## App identifiers

| Platform | ID | Display name |
|----------|----|--------------|
| Android  | `com.rufayq.app` | Rufayq |
| iOS      | `com.rufayq.app` | Rufayq |

Single bundle for both personas. Push topics use `/topics/role_<role>` so
notifications target the right audience.

---

## Project layout (after Phase 1)

```
/
├── src/                       React app (unchanged)
│   └── lib/native/            ← Capacitor abstraction (added)
├── android/                   Gradle project (Phase 1)
│   └── app/src/main/java/.../auto/   ← Android Auto service (Phase 4)
├── ios/                       Xcode project (Phase 5)
├── capacitor.config.ts        ← added
└── docs/mobile-strategy.md    (this file)
```

---

## Phased plan

### Phase 0 — Done
Apple, Google Play, and Android Auto developer accounts are provisioned.
Capacitor + plugins installed. `capacitor.config.ts` and `src/lib/native/`
abstraction in place.

### Phase 1 — Android shell (this sprint)

Run on a developer machine (these commands cannot run inside the Lovable
sandbox; do them after `git pull`):

```bash
bun install
bun run build
npx cap add android
npx cap sync android
npx cap open android       # opens Android Studio
```

The hot-reload `server.url` in `capacitor.config.ts` makes the Android shell
load directly from the Lovable preview during development. Remove that block
for a release build so the bundled `dist/` is used.

**Acceptance:** Android app boots, login works, EN/AR + dark mode work,
ledger and refund screens render.

### Phase 2 — Native capabilities

Plugins already installed:

| Capability | Plugin | Used by |
|------------|--------|---------|
| Camera + gallery | `@capacitor/camera` | Document Scanner, profile photo |
| Local notifications | `@capacitor/local-notifications` | Medication reminders |
| Push notifications | `@capacitor/push-notifications` | Refund-status alerts (FCM/APNs) |
| File preview/share | `@capacitor/share` + `@capacitor/filesystem` | Vault & ledger CSV |
| Preferences | `@capacitor/preferences` | Settings persistence |
| Network state | `@capacitor/network` | Offline banner |
| Deep links | `@capacitor/app` URL events | Email magic links, payment returns |
| Status bar / splash | `@capacitor/status-bar`, `@capacitor/splash-screen` | Cosmetic |

All access goes through `src/lib/native/` (browser-safe fallbacks included).

### Phase 3 — Role selector polish

Both personas already coexist in the same routing tree. We add:

1. A first-run **role chooser** screen (`/select-role`) for users with multiple
   roles (`user_roles` rows). Single-role users skip it.
2. A "Switch role" affordance in Profile → Settings.
3. Push topic registration: subscribe to `role_patient`, `role_provider`,
   `role_admin` based on the active role.

### Phase 4 — Android Auto for Patients

Android Auto cannot host a web view; we add a small Kotlin module using the
**Jetpack Car App Library**. v1 surfaces:

| Auto screen | Source of truth | Interaction |
|-------------|-----------------|-------------|
| Today's medications | `medications` (cached locally) | Voice "Mark as taken" |
| Next appointment | `appointments` | Voice "Navigate" → Google Maps |
| Active journey leg | `journeys` + `tickets` | Read-only with voice prompts |
| Emergency call | `profiles.emergency_*` | Voice "Call" |

Implementation outline (in `android/app/`):

1. `build.gradle`: `implementation 'androidx.car.app:app:1.4.0'`
2. `AndroidManifest.xml`:
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
3. `RufayqCarAppService` → `MainSession` → one `Screen` per surface.
4. Data path: web app writes a small JSON snapshot to
   `@capacitor/preferences` ("today\_pack") on every sync. The Auto module
   reads the snapshot from the shared `SharedPreferences` namespace
   (`CapacitorStorage`) — no extra network needed in the car.
5. Reminders fire via `@capacitor/local-notifications`; the Auto service
   listens for the matching `BroadcastReceiver` and surfaces a card.
6. Submit for **Android Auto review** alongside the Play submission.

### Phase 5 — iOS shell

Same Capacitor project. On a Mac:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

CarPlay support (read-only "Today's reminders" template) is gated behind an
Apple entitlement request and ships in a follow-up release.

### Phase 6 — Hardening & store submission

- Sentry Capacitor for crash reporting.
- Cold-start budget <2.5 s on mid-tier Android.
- TalkBack + VoiceOver passes (RTL).
- Store assets in EN + AR (1024×1024 icons, screenshots).
- Production signing keys in Lovable Cloud secrets — never in repo.

---

## Build & run cheat sheet

```bash
# Daily dev (Android)
bun run build
npx cap sync android
npx cap run android        # device or emulator

# iOS (Mac only)
bun run build
npx cap sync ios
npx cap run ios
```

For a **release build**, edit `capacitor.config.ts` and remove (or comment
out) the `server.url` block so the app bundles `dist/` instead of pointing
at the Lovable preview.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Apple rejects medical claims | Strict on-screen disclaimers (already enforced). Position as a *companion*, not diagnostic. |
| Android Auto rejects medical UI | Stick to reminder + navigation hand-off templates. No diagnostic surfaces. |
| RTL bugs in native shells | Smoke-test every screen in `dir=rtl` before submission. |
| Push reliability across regions | FCM + APNs through Lovable Cloud secrets; in-app bell as fallback. |

---

## What lives where

| Concern | File |
|--------|------|
| Capacitor config | `capacitor.config.ts` |
| Native abstraction | `src/lib/native/index.ts` |
| Android Studio project | `android/` (created on dev machine via `npx cap add android`) |
| Xcode project | `ios/` (created on Mac via `npx cap add ios`) |
| Android Auto service | `android/app/src/main/java/com/rufayq/app/auto/` (Phase 4) |
| Mobile setup runbook | `docs/mobile-setup.md` |
