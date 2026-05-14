# Real biometric unlock — remembered on desktop and mobile

## Goal

Replace the current fake `navigator.credentials.get()` prompt (which always returns "No passkey" → "cancelled") with a real biometric unlock that:

1. **Enrolls once** after a successful password sign-in (opt-in prompt).
2. **Persists** across sessions on the same device — desktop browsers, installed PWA, and the Capacitor Android/iOS shell.
3. **Unlocks the app** on subsequent visits with Face ID / Touch ID / Windows Hello / Android fingerprint, without re-typing the password.
4. **Falls back gracefully** when biometrics is unavailable, was never enrolled, or is cancelled — and the `Use biometrics` button is hidden in those cases (no more misleading prompt).

## How the unlock flow works

```text
First sign-in (password)                Returning visit
─────────────────────────                ───────────────
1. user enters phone+password    ┐       1. LoginScreen mounts
2. Supabase sign-in OK           │       2. detect: native? webauthn?
3. Supabase persists session     │          + has stored credential?
4. Prompt: "Enable biometric     │       3. show "Use biometrics"
   sign-in on this device?"      │       4. user taps → verify
   ├ Yes → enroll credential     │       5. on success:
   └ No  → skip                  │          - getSession()
                                 ┘          - if valid → onLogin()
                                            - if expired → ask for password
```

Supabase already persists the session (`persistSession: true, autoRefreshToken: true` in `client.ts`), so a successful biometric verify reuses the existing session — no extra token plumbing is needed for the common case.

## Two implementations behind one API

A single helper `src/lib/native/biometric.ts` exposes:

```ts
biometric.isAvailable(): Promise<boolean>
biometric.isEnrolled(): Promise<boolean>          // local — credential stored?
biometric.enroll(userId, label): Promise<boolean> // after password sign-in
biometric.verify(): Promise<boolean>              // unlock gate
biometric.clear(): Promise<void>                  // on sign-out / settings toggle
```

Internally it picks the best backend:


| Runtime                              | Backend                                                                                           | Storage                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Capacitor (Android/iOS)              | `@aparajita/capacitor-biometric-auth` (`checkBiometry`, `authenticate`)                           | `@capacitor/preferences`                      |
| Web (desktop + mobile browser + PWA) | WebAuthn platform authenticator (`navigator.credentials.create` + `.get` with `allowCredentials`) | `localStorage` (credential `rawId` as base64) |
| Neither                              | returns `false` everywhere → button hidden                                                        | —                                             |


Detection uses the existing `isNative` flag from `src/lib/native/index.ts`. Web path requires:

- `window.PublicKeyCredential`
- `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() === true`

Both must be true for the web button to render — this alone fixes the "No passkey" toast on devices that don't actually have a platform authenticator.

## Files

**New**

- `src/lib/native/biometric.ts` — unified API + WebAuthn and Capacitor backends.

**Edited**

- `src/screens/LoginScreen.tsx`
  - Replace `bioAvailable` / `handleBiometric` with `biometric.*`.
  - After successful `signInWithPassword`, show an opt-in modal: "Enable biometric sign-in?" → on yes, call `biometric.enroll(userId, signInEmail)`.
  - Only render the `Use biometrics` button when `await biometric.isAvailable() && await biometric.isEnrolled()`.
  - On tap → `biometric.verify()` → on success check `getSession()`; if expired show "Session expired, please sign in" and keep the password form.
- `src/screens/SettingsScreen.tsx` (small) — add a "Biometric sign-in" toggle that calls `biometric.enroll` / `biometric.clear`, so users can disable it later.
- `package.json` — add `@aparajita/capacitor-biometric-auth`. (Web bundle is unaffected; the plugin is only invoked when `isNative === true`.)

**Untouched**

- `AppAuthGuard`, `Auth.tsx`, Supabase config, edge functions, RLS, routing — none of this changes. Biometrics is a local "unlock the cached session" gate, not a new auth provider.

## Edge cases handled

- **Credential lost / cleared cookies / new device** → `isEnrolled()` is `false`, button hidden, user signs in with password and re-enrolls.
- **User cancels the prompt** → no toast spam; silent return, button stays.
- **Supabase session truly expired** (rare with auto-refresh) → biometric verify still succeeds, but we detect `!session` and prompt for password without claiming "unlocked".
- **Sign out** → `biometric.clear()` runs so the next user on the same device isn't auto-unlocked into the previous account.
- **RTL / Arabic** → all new strings bilingual EN · AR, matching existing toasts.

## **Required amendments before implementation**

### **A. Do not call this “passwordless login”**

The plan’s framing should remain very explicit:

- ✅ “Biometric unlock of an existing cached Supabase session”
- ❌ Not “true passwordless authentication”
- ❌ Not “server-verified WebAuthn/passkey auth”

Without server-side WebAuthn challenge storage and assertion verification, the web path is not a real authentication provider. It is acceptable as a **local unlock gate** only.

### **B. Web availability must be stricter than PublicKeyCredential**

For web/PWA, isAvailable() should require all of these:

1. window.isSecureContext
2. window.PublicKeyCredential
3. PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() === true
4. top-level browsing context where possible

MDN documents that isUserVerifyingPlatformAuthenticatorAvailable() is available only in secure contexts and resolves true when a user-verifying platform authenticator is present, such as Touch ID/Face ID, Windows Hello, or Android device unlock. Source: **[MDN PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isUserVerifyingPlatformAuthenticatorAvailable_static)**

This is the key change that prevents the current misleading button.

### **C. Web enrollment must store a real credential ID**

The web implementation should not just store an email. It should:

- call navigator.credentials.create({ publicKey: ... })
- require authenticatorSelection.authenticatorAttachment = "platform"
- require userVerification = "required"
- store the returned credential rawId as base64url
- store metadata like { userId, label, createdAt }
- during verify(), call navigator.credentials.get() with allowCredentials containing that stored credential ID

Even if the assertion is not sent to the server, using allowCredentials is important because it ensures the browser prompts for the enrolled local credential instead of producing the current “no passkey/cancelled” UX.

### **D. The native plugin must be dynamically imported only on native**

The plugin README says it simulates biometry on web. Source: **[plugin README — web support](https://github.com/aparajita/capacitor-biometric-auth)**

Because this app wants **real web WebAuthn** on desktop/mobile browsers and native plugin prompts only in Capacitor, biometric.ts should avoid importing or using the plugin web simulation path in browsers.

Recommended pattern:

`if (isNative) {`  
  `const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");`  
  `...`  
`}`  


### **E. Add the iOS Face ID plist requirement to the plan**

The plugin README explicitly requires NSFaceIDUsageDescription in Info.plist for Face ID. Source: **[plugin README — iOS Face ID requirement](https://github.com/aparajita/capacitor-biometric-auth)**

The repo currently does not appear to include native ios/ or android/ project folders, so this may be an app-shell build step rather than a frontend repo edit, but it should be called out as a required native packaging task.

### **F. Fix sign-out clearing in the patient app**

The plan says “Sign out → biometric.clear() runs,” but the patient logout currently does **not** call supabase.auth.signOut(); it only resets onboarding/local view state.

That must be fixed for the biometric plan to be safe. Otherwise, a “signed out” patient could leave a valid Supabase session and biometric marker behind.

Minimum requirement:

- patient logout calls await supabase.auth.signOut()
- patient logout calls await biometric.clear()
- then clears local app/onboarding state

### **G. Settings toggle must become real, not cosmetic**

Settings currently has a biometric boolean in local settings.  
The visible “Biometric Login” toggle only updates local settings storage.

The plan should change this toggle to:

- show current biometric.isEnrolled() state
- enable → call biometric.enroll([currentUser.id](http://currentUser.id), label) after a session check
- disable → call biometric.clear()
- hide/disable with helper copy when biometric.isAvailable() is false

---

## **Implementation notes I would require**

### **biometric.ts API**

The proposed API is good:

`biometric.isAvailable(): Promise<boolean>`  
`biometric.isEnrolled(): Promise<boolean>`  
`biometric.enroll(userId, label): Promise<boolean>`  
`biometric.verify(): Promise<boolean>`  
`biometric.clear(): Promise<void>`  


I would add:

`biometric.getEnrollment(): Promise<BiometricEnrollment | null>`  


Useful for Settings copy like “Enabled for +966••••1234”.

### **Enrollment prompt timing**

After password sign-in, Login currently has only { error } from signInWithPassword.

Implementation should destructure data too:

`const { data, error } = await supabase.auth.signInWithPassword(...)`  


Then use:

`data.user?.id`  


for enrollment.

### **Cancellation behavior**

Approve the plan’s “silent cancel” behavior. A user cancelling Face ID / Touch ID / Windows Hello is not an error state and should not show a scary toast.

Recommended UX:

- cancelled → no toast, keep login screen
- verified but no session → info toast: “Session expired — please sign in once with your password.”
- unsupported/not enrolled → button hidden

---

## **Final approval decision**

**Approved with changes.**

The plan is technically valid and is the right replacement for the current fake biometric flow, but I would not approve implementation unless it includes these mandatory adjustments:

1. Treat biometrics as **local unlock of cached Supabase session**, not real passwordless auth.
2. Use strict WebAuthn availability detection via isUserVerifyingPlatformAuthenticatorAvailable().
3. Store/use a real WebAuthn credential ID with allowCredentials.
4. Dynamically import the native biometric plugin only when isNative.
5. Add/track the iOS NSFaceIDUsageDescription requirement.
6. Fix patient logout to call both supabase.auth.signOut() and biometric.clear().
7. Convert the Settings biometric toggle from cosmetic local preference into real enroll/clear behavior.

---

## **Commands used to validate**

- ✅ git status --short && rg "biometric|credentials|get\\(|PublicKeyCredential|signInWithPassword|signOut|persistSession|isNative" -n src package.json | head -n 200
- ✅ sed -n '1,120p' src/lib/native/index.ts && sed -n '1,260p' src/screens/LoginScreen.tsx && sed -n '400,505p' src/screens/LoginScreen.tsx && sed -n '1,285p' src/screens/SettingsScreen.tsx && sed -n '1,60p' src/integrations/supabase/client.ts && cat package.json | sed -n '1,90p'
- ✅ rg "signOut\\(" -n src
- ✅ find ios -maxdepth 4 -name Info.plist -print 2>/dev/null | sed -n '1,20p' && find android -maxdepth 4 -name AndroidManifest.xml -print 2>/dev/null | sed -n '1,20p'## Verdict: approve the plan, with required amendments  
  
**Out of scope**

- No server-side WebAuthn registration/attestation (no `webauthn_credentials` table, no edge function). Credential is local-device only. If you later want true cross-device passkey sync (iCloud Keychain / Google Password Manager), we can layer that on without changing this UI.
- No changes to OTP, recovery, or sign-up flows.
- No new routes or guards.

## Verification

1. Web (desktop Chrome with Windows Hello / macOS Touch ID): sign in with password → accept enroll → reload → tap `Use biometrics` → real OS prompt → land on `/app`.
2. Web (browser with no platform authenticator): button does not render.
3. Capacitor Android: same flow uses the system fingerprint sheet via the plugin; no "No passkey" message possible.
4. After `signOut()`: button disappears until the next password sign-in + enroll.