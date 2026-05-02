# Play App Signing — Upload Key vs. App Signing Key

This page exists because almost every "my release won't install" or
"Google rejected my upload" incident traces back to confusing the **upload
key** with the **app signing key**. Read it once before your first
production rollout.

---

## 1. The two certificates

When Play App Signing is enabled (default for all new apps since Aug 2021),
there are **two** distinct keys in play:

| Key | Lives where | Used for | Can you rotate? |
|---|---|---|---|
| **Upload key** | Your CI / your laptop (`rufayq-upload.keystore`) | Signing the AAB you upload to Play | ✅ Yes — request via Play Console |
| **App signing key** | Inside Google's HSM | Re-signing the APKs delivered to user devices | ⚠ Only via Play-managed key upgrade (rare) |

Flow per release:

```
your AAB ─signed by── upload key ──> Play Console
                                       │
                                       │ Google strips upload signature,
                                       │ re-signs with app signing key
                                       ▼
                              APKs to user devices
```

What this means in practice:

- **End users verify the *app signing key*.** Their devices will refuse
  any future install whose APKs aren't signed by it.
- **Play verifies the *upload key*.** It rejects any AAB that isn't signed
  with the registered upload cert.
- **You only ever hold the upload key.** Lose it? You can rotate. Lose the
  app signing key? You can't — and there's nothing to lose, because
  Google holds it.

---

## 2. How to find each fingerprint in Play Console

1. Open **Play Console → All apps → Rufayq**.
2. Sidebar → **Setup → App integrity → App signing**.
3. You'll see two panels:
   - **App signing key certificate** — the one users verify. SHA-1 / SHA-256
     here is what you put into Google OAuth, Firebase, Maps API, etc.
   - **Upload key certificate** — the one CI must match. This is the value
     to copy into `PLAY_UPLOAD_CERT_SHA256`.

> If you see only one certificate, App Signing is **not** enrolled. Enroll
> it on this page before your first production release. Do not proceed
> without it — losing an unenrolled signing key means you can never
> publish updates to existing users.

---

## 3. CI cross-check (recommended)

The release workflow validates the local keystore against the registered
upload cert when `PLAY_UPLOAD_CERT_SHA256` is set as a GitHub secret.

To set it up:

1. In Play Console → App signing → **Upload key certificate**, copy the
   SHA-256 line. It looks like:
   ```
   AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89
   ```
2. Repo → Settings → Secrets → Actions → **New repository secret**:
   - Name: `PLAY_UPLOAD_CERT_SHA256`
   - Value: paste the fingerprint exactly as shown (with or without colons —
     the workflow normalises both forms).
3. Done. From the next tag push onward, the workflow will refuse to
   continue if the keystore in `RUFAYQ_KEYSTORE_B64` doesn't match Play's
   record. This catches:
   - Wrong base64 pasted into the secret.
   - A teammate accidentally regenerating the keystore.
   - A test/staging keystore being uploaded by mistake.

If the cross-check fires unexpectedly:

- Confirm Play Console hasn't issued a new upload key (rare, only if you
  previously requested rotation).
- Re-extract the fingerprint locally:
  ```bash
  keytool -list -v -keystore rufayq-upload.keystore \
    -alias rufayq | grep SHA256
  ```
- Compare to the value in Play Console **and** in the secret.

---

## 4. Rotating the upload key (safe)

If the upload keystore leaks, is lost, or simply expires:

1. Generate a new keystore:
   ```bash
   keytool -genkeypair -v -keystore rufayq-upload-2027.keystore \
     -alias rufayq -keyalg RSA -keysize 4096 -validity 10000
   ```
2. Export the certificate:
   ```bash
   keytool -export -rfc -keystore rufayq-upload-2027.keystore \
     -alias rufayq -file upload_cert.pem
   ```
3. Play Console → App signing → **Request upload key reset** (or **Use a
   different upload key**) → upload `upload_cert.pem`.
4. Wait for Google's confirmation email (usually <48 h).
5. Update GitHub secrets:
   - `RUFAYQ_KEYSTORE_B64` ← `base64 -w0 rufayq-upload-2027.keystore`
   - `PLAY_UPLOAD_CERT_SHA256` ← new SHA-256 from `keytool -list -v`
6. Push a fresh tag. The cross-check should pass against the new cert.

You **cannot** rotate the app signing key the same way. Google will
re-sign all delivered APKs forever using the original signing key.

---

## 5. Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `apksigner verify` passes locally, Play rejects | You signed with the app signing key (don't have it) instead of the upload key | Always sign with the upload keystore |
| Users on older versions can't update | App signing key changed (shouldn't happen with Play App Signing) | Contact Play developer support immediately |
| OAuth / Maps SDK rejects requests in production | Registered SHA-1 in Google Cloud is from the **upload** key | Replace with the **app signing key** SHA-1 from Play Console |
| First production release silently fails to install | App not enrolled in App Signing, AAB signed only with upload key | Enrol in App Signing in Play Console, re-upload |
| CI's cross-check fingerprint mismatch | Keystore secret is from a different machine / regenerated | Re-export base64 from the canonical keystore, update `RUFAYQ_KEYSTORE_B64` |

---

## 6. Quick decision table

| You are configuring… | Use which key's fingerprint? |
|---|---|
| `PLAY_UPLOAD_CERT_SHA256` GitHub secret | **Upload** key SHA-256 |
| Google Cloud OAuth client (Android) | **App signing** key SHA-1 |
| Firebase Android app | **App signing** key SHA-1 + SHA-256 |
| Google Maps Android API key | **App signing** key SHA-1 |
| Local debug builds (development) | Debug keystore SHA-1 (separate, throwaway) |
| Verifying an AAB before upload | Upload key (`apksigner verify --print-certs`) |

When in doubt: end-user-facing service → **app signing key**;
Play-Console-facing tooling → **upload key**.
