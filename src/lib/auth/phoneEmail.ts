/**
 * Phone ↔ synthetic-email helpers shared by LoginScreen, QuickSignup,
 * and the Supabase verify-otp edge function. Synthetic email format
 * MUST stay in sync with `supabase/functions/verify-otp/index.ts`.
 */
export const phoneToE164 = (raw: string, defaultCountry = "+966"): string => {
  const trimmed = (raw || "").trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${defaultCountry}${trimmed.replace(/^0+/, "")}`;
};

export const phoneToEmail = (e164: string): string =>
  `${e164.replace(/[^\d]/g, "")}@phone.rufayq.local`;

export const isValidE164 = (e164: string): boolean =>
  /^\+\d{8,15}$/.test(e164);

export const isValidEmail = (s: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
