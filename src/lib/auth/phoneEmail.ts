/**
 * Phone ↔ synthetic-email helpers shared by LoginScreen, QuickSignup,
 * and the Supabase verify-otp edge function. Synthetic email format
 * MUST stay in sync with `supabase/functions/verify-otp/index.ts`.
 */
import { findDialCountry, DIAL_COUNTRIES } from "./phoneCountries";

export const phoneToE164 = (raw: string, defaultCountry = "+966"): string => {
  const trimmed = (raw || "").trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${defaultCountry}${trimmed.replace(/^0+/, "")}`;
};

/** Compose an E.164 number from a country ISO2 + the user-typed national part. */
export const composeE164 = (countryIso2: string, national: string): string => {
  const cleaned = (national || "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  const dial = findDialCountry(countryIso2).dial;
  return `${dial}${cleaned.replace(/^0+/, "")}`;
};

/** Best-effort split of an E.164 string back into { country, national }. */
export const splitE164 = (e164: string): { country: string; national: string } => {
  const s = (e164 || "").trim();
  if (!s.startsWith("+")) return { country: "SA", national: s.replace(/\D/g, "") };
  const sorted = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (s.startsWith(c.dial)) return { country: c.code, national: s.slice(c.dial.length) };
  }
  return { country: "SA", national: s.slice(1) };
};

export const phoneToEmail = (e164: string): string =>
  `${e164.replace(/[^\d]/g, "")}@phone.rufayq.local`;

export const isValidE164 = (e164: string): boolean =>
  /^\+\d{8,15}$/.test(e164);

export const isValidEmail = (s: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
