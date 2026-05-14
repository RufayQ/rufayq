/**
 * Biometric unlock — local-only "unlock cached Supabase session" gate.
 *
 * This is NOT real passwordless / server-verified WebAuthn. It is a local
 * device gate that:
 *   - On Capacitor (Android/iOS), uses the system biometric prompt via the
 *     @aparajita/capacitor-biometric-auth plugin (dynamically imported so
 *     the web bundle is unaffected).
 *   - On the web (desktop browser, mobile browser, installed PWA), uses the
 *     WebAuthn platform authenticator (Touch ID / Face ID / Windows Hello /
 *     Android device unlock). Enrollment stores a real credential rawId in
 *     localStorage; verify() calls navigator.credentials.get with
 *     allowCredentials so the browser prompts for THAT credential — no more
 *     "no passkey for this site".
 *
 * Successful verify() = "the human in front of the device is authorised".
 * The app itself relies on Supabase's persisted session (persistSession +
 * autoRefreshToken in supabase/client.ts) to actually be signed in.
 */

import { isNative } from "@/lib/native";

const META_KEY = "rufayq_bio_meta_v2";
const RP_NAME = "RufayQ";

export interface BiometricEnrollment {
  /** Backend used at enrollment time. */
  backend: "web" | "native";
  /** Supabase user id (for display only — server is not involved). */
  userId: string;
  /** Human label, e.g. masked phone or email. */
  label: string;
  /** WebAuthn credential rawId, base64url. Only populated on web. */
  credentialId?: string;
  createdAt: number;
}

// ---------- storage ----------

const readMeta = (): BiometricEnrollment | null => {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BiometricEnrollment;
  } catch {
    return null;
  }
};

const writeMeta = (m: BiometricEnrollment) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

const clearMeta = () => {
  try {
    localStorage.removeItem(META_KEY);
    // Best-effort migration cleanup of legacy key.
    localStorage.removeItem("rufayq_bio_email");
  } catch {
    /* ignore */
  }
};

// ---------- base64url helpers ----------

const bufToB64u = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64uToBuf = (s: string): ArrayBuffer => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

// ---------- web (WebAuthn) backend ----------

const webIsAvailable = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) return false;
    const PKC = (window as unknown as { PublicKeyCredential?: typeof PublicKeyCredential })
      .PublicKeyCredential;
    if (!PKC) return false;
    if (typeof PKC.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
    return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

const webEnroll = async (userId: string, label: string): Promise<boolean> => {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME, id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: label || userId,
          displayName: label || userId,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    writeMeta({
      backend: "web",
      userId,
      label,
      credentialId: bufToB64u(cred.rawId),
      createdAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
};

const webVerify = async (): Promise<boolean> => {
  const meta = readMeta();
  if (!meta?.credentialId) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: b64uToBuf(meta.credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
};

// ---------- native (Capacitor) backend ----------

const nativeIsAvailable = async (): Promise<boolean> => {
  if (!isNative) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const info = await BiometricAuth.checkBiometry();
    return !!info.isAvailable;
  } catch {
    return false;
  }
};

const nativeVerify = async (): Promise<boolean> => {
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: "Unlock RufayQ",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "RufayQ",
      androidSubtitle: "Unlock to continue",
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
};

// ---------- public API ----------

export const biometric = {
  async isAvailable(): Promise<boolean> {
    return isNative ? nativeIsAvailable() : webIsAvailable();
  },

  async isEnrolled(): Promise<boolean> {
    const meta = readMeta();
    if (!meta) return false;
    if (isNative) return meta.backend === "native";
    return meta.backend === "web" && !!meta.credentialId;
  },

  getEnrollment(): BiometricEnrollment | null {
    return readMeta();
  },

  async enroll(userId: string, label: string): Promise<boolean> {
    if (!userId) return false;
    if (isNative) {
      const ok = await nativeIsAvailable();
      if (!ok) return false;
      // Native: nothing to register server-side. Just record that this device
      // has opted in; verify() will gate via the OS biometric prompt.
      writeMeta({
        backend: "native",
        userId,
        label,
        createdAt: Date.now(),
      });
      return true;
    }
    const ok = await webIsAvailable();
    if (!ok) return false;
    return webEnroll(userId, label);
  },

  async verify(): Promise<boolean> {
    if (!(await this.isEnrolled())) return false;
    return isNative ? nativeVerify() : webVerify();
  },

  async clear(): Promise<void> {
    clearMeta();
  },
};
