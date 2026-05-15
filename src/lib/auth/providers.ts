/**
 * Catalogue of sign-in providers Rufayq surfaces in the Connected Accounts card.
 * Used by useLinkedProviders + ConnectedAccountsCard for both Travellers and Providers.
 */
import type { ComponentType } from "react";

export type ProviderId = "google" | "apple" | "email" | "phone";

export type ProviderMeta = {
  id: ProviderId;
  labelEn: string;
  labelAr: string;
  /** Can the user attach this provider via OAuth from inside the app? */
  canConnect: boolean;
  /** Can the user detach this identity from inside the app? */
  canUnlink: boolean;
  /** Read-only "primary sign-in" rows (email/phone created at signup). */
  primary: boolean;
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  google: {
    id: "google",
    labelEn: "Google",
    labelAr: "Google",
    canConnect: true,
    canUnlink: true,
    primary: false,
  },
  apple: {
    id: "apple",
    labelEn: "Apple",
    labelAr: "Apple",
    canConnect: true,
    canUnlink: true,
    primary: false,
  },
  email: {
    id: "email",
    labelEn: "Email & password",
    labelAr: "البريد وكلمة المرور",
    canConnect: false,
    canUnlink: false,
    primary: true,
  },
  phone: {
    id: "phone",
    labelEn: "Phone number",
    labelAr: "رقم الجوال",
    canConnect: false,
    canUnlink: false,
    primary: true,
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["google", "apple", "email", "phone"];

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  const s = String(p);
  if (s.length <= 4) return s;
  return `${s.slice(0, 4)}••••${s.slice(-2)}`;
}

export function formatLinkedDate(iso: string | null | undefined, isAr: boolean): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(isAr ? "ar" : "en", {
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

// Re-export for tests
export const PROVIDER_GLYPHS: Record<ProviderId, ComponentType<{ size?: number }> | null> = {
  google: null,
  apple: null,
  email: null,
  phone: null,
};
