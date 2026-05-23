/**
 * Profile field validators & formatters.
 * Returns { value: cleaned, error: message|null }.
 */

export type FieldResult = { value: string; error: string | null };

const onlyDigits = (s: string) => s.replace(/\D+/g, "");

/** Format Saudi/intl phone as +966 5X XXX XXXX while typing. Accepts digits only. */
export const formatPhone = (raw: string): string => {
  let d = onlyDigits(raw);
  // Normalize leading 00 → ""; leading 0 followed by 5 → 9665...
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "966" + d.slice(1);
  if (d.startsWith("5") && d.length <= 9) d = "966" + d;
  d = d.slice(0, 15);
  if (!d) return "";
  if (d.startsWith("966")) {
    const rest = d.slice(3);
    const a = rest.slice(0, 2);
    const b = rest.slice(2, 5);
    const c = rest.slice(5, 9);
    return "+966" + (a ? " " + a : "") + (b ? " " + b : "") + (c ? " " + c : "");
  }
  return "+" + d;
};

export const validatePhone = (v: string): FieldResult => {
  const trimmed = v.trim();
  if (!trimmed) return { value: "", error: null };
  const digits = onlyDigits(trimmed);
  if (digits.length < 8 || digits.length > 15) {
    return { value: trimmed, error: "Phone must be 8–15 digits" };
  }
  return { value: trimmed, error: null };
};

/** ISO yyyy-mm-dd, must be a real past date, age 0–120. */
export const validateDob = (v: string): FieldResult => {
  if (!v) return { value: "", error: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return { value: v, error: "Use date picker (YYYY-MM-DD)" };
  const d = new Date(v + "T00:00:00");
  if (Number.isNaN(d.getTime())) return { value: v, error: "Invalid date" };
  const now = new Date();
  if (d > now) return { value: v, error: "Date can't be in the future" };
  const ageYears = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears > 120) return { value: v, error: "Date is too far in the past" };
  return { value: v, error: null };
};

/** Saudi National ID: exactly 10 digits, must start with 1 (citizen) or 2 (resident). */
export const validateSaudiId = (raw: string): FieldResult => {
  const d = onlyDigits(raw);
  if (!d) return { value: "", error: null };
  if (d.length !== 10) return { value: d, error: "Saudi ID must be 10 digits" };
  if (!/^[12]/.test(d)) return { value: d, error: "Saudi ID must start with 1 or 2" };
  return { value: d, error: null };
};

/** Iqama: 10 digits, typically starts with 2. */
export const validateIqama = (raw: string): FieldResult => {
  const d = onlyDigits(raw);
  if (!d) return { value: "", error: null };
  if (d.length !== 10) return { value: d, error: "Iqama must be 10 digits" };
  if (!/^2/.test(d)) return { value: d, error: "Iqama must start with 2" };
  return { value: d, error: null };
};

/** Passport: 6–9 alphanumeric chars, uppercase. */
export const validatePassport = (raw: string): FieldResult => {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9);
  if (!cleaned) return { value: "", error: null };
  if (cleaned.length < 6) return { value: cleaned, error: "Passport must be 6–9 characters" };
  return { value: cleaned, error: null };
};

export const validateEmail = (v: string): FieldResult => {
  const t = v.trim();
  if (!t) return { value: "", error: null };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return { value: t, error: "Invalid email" };
  return { value: t, error: null };
};

/** Arabic name: Arabic letters, spaces, and common diacritics only. */
export const validateArabicName = (v: string, required = true): FieldResult => {
  const t = (v || "").trim();
  if (!t) return { value: "", error: required ? "Arabic name is required · الاسم بالعربية مطلوب" : null };
  const ok = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s'’\-]+$/.test(t);
  if (!ok) return { value: t, error: "Use Arabic letters only · أحرف عربية فقط" };
  if (t.length < 2) return { value: t, error: "Name is too short · الاسم قصير جداً" };
  return { value: t, error: null };
};

/** English name: Latin letters, spaces, hyphens, apostrophes, dots. */
export const validateEnglishName = (v: string, required = true): FieldResult => {
  const t = (v || "").trim();
  if (!t) return { value: "", error: required ? "Full name is required · الاسم مطلوب" : null };
  const ok = /^[A-Za-z][A-Za-z\s'’\-\.]+$/.test(t);
  if (!ok) return { value: t, error: "Use English letters only" };
  if (t.length < 2) return { value: t, error: "Name is too short" };
  return { value: t, error: null };
};

