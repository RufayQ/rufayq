/**
 * Single source of truth for the dial-code picker used on Quick Sign-up
 * and Sign-in. Keep the list compact (GCC + medical-travel corridor).
 *
 * Detection priority (used by detectDialCountry):
 *   1. Manual override stored in localStorage.
 *   2. navigator.language region (e.g. en-AE -> AE).
 *   3. Intl timezone -> ISO2 heuristic.
 *   4. Default "SA".
 */

export interface DialCountry {
  code: string;   // ISO-3166 alpha-2
  name: string;
  nameAr: string;
  dial: string;   // e.g. "+966"
  flag: string;
}

export const DIAL_COUNTRIES: DialCountry[] = [
  { code: "SA", name: "Saudi Arabia",        nameAr: "السعودية",       dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "UAE",                 nameAr: "الإمارات",       dial: "+971", flag: "🇦🇪" },
  { code: "QA", name: "Qatar",               nameAr: "قطر",           dial: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait",              nameAr: "الكويت",         dial: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain",             nameAr: "البحرين",        dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman",                nameAr: "عُمان",          dial: "+968", flag: "🇴🇲" },
  { code: "EG", name: "Egypt",               nameAr: "مصر",           dial: "+20",  flag: "🇪🇬" },
  { code: "JO", name: "Jordan",              nameAr: "الأردن",         dial: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",             nameAr: "لبنان",          dial: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Syria",               nameAr: "سوريا",          dial: "+963", flag: "🇸🇾" },
  { code: "PS", name: "Palestine",           nameAr: "فلسطين",         dial: "+970", flag: "🇵🇸" },
  { code: "IQ", name: "Iraq",                nameAr: "العراق",         dial: "+964", flag: "🇮🇶" },
  { code: "YE", name: "Yemen",               nameAr: "اليمن",          dial: "+967", flag: "🇾🇪" },
  { code: "SD", name: "Sudan",               nameAr: "السودان",        dial: "+249", flag: "🇸🇩" },
  { code: "MA", name: "Morocco",             nameAr: "المغرب",         dial: "+212", flag: "🇲🇦" },
  { code: "TN", name: "Tunisia",             nameAr: "تونس",          dial: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria",             nameAr: "الجزائر",        dial: "+213", flag: "🇩🇿" },
  { code: "LY", name: "Libya",               nameAr: "ليبيا",          dial: "+218", flag: "🇱🇾" },
  { code: "TR", name: "Türkiye",             nameAr: "تركيا",          dial: "+90",  flag: "🇹🇷" },
  { code: "IN", name: "India",               nameAr: "الهند",          dial: "+91",  flag: "🇮🇳" },
  { code: "PK", name: "Pakistan",            nameAr: "باكستان",        dial: "+92",  flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh",          nameAr: "بنغلاديش",       dial: "+880", flag: "🇧🇩" },
  { code: "PH", name: "Philippines",         nameAr: "الفلبين",        dial: "+63",  flag: "🇵🇭" },
  { code: "ID", name: "Indonesia",           nameAr: "إندونيسيا",      dial: "+62",  flag: "🇮🇩" },
  { code: "MY", name: "Malaysia",            nameAr: "ماليزيا",        dial: "+60",  flag: "🇲🇾" },
  { code: "TH", name: "Thailand",            nameAr: "تايلاند",        dial: "+66",  flag: "🇹🇭" },
  { code: "SG", name: "Singapore",           nameAr: "سنغافورة",       dial: "+65",  flag: "🇸🇬" },
  { code: "GB", name: "United Kingdom",      nameAr: "المملكة المتحدة", dial: "+44",  flag: "🇬🇧" },
  { code: "DE", name: "Germany",             nameAr: "ألمانيا",        dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",              nameAr: "فرنسا",          dial: "+33",  flag: "🇫🇷" },
  { code: "ES", name: "Spain",               nameAr: "إسبانيا",        dial: "+34",  flag: "🇪🇸" },
  { code: "IT", name: "Italy",               nameAr: "إيطاليا",        dial: "+39",  flag: "🇮🇹" },
  { code: "NL", name: "Netherlands",         nameAr: "هولندا",         dial: "+31",  flag: "🇳🇱" },
  { code: "CH", name: "Switzerland",         nameAr: "سويسرا",         dial: "+41",  flag: "🇨🇭" },
  { code: "US", name: "United States",       nameAr: "الولايات المتحدة", dial: "+1",   flag: "🇺🇸" },
  { code: "CA", name: "Canada",              nameAr: "كندا",          dial: "+1",   flag: "🇨🇦" },
  { code: "AU", name: "Australia",           nameAr: "أستراليا",       dial: "+61",  flag: "🇦🇺" },
];

const BY_CODE = new Map(DIAL_COUNTRIES.map((c) => [c.code, c]));

export const findDialCountry = (code?: string | null): DialCountry =>
  (code && BY_CODE.get(code.toUpperCase())) || BY_CODE.get("SA")!;

/** Map common nationality strings (English + Arabic) to ISO2. */
export const nationalityToIso2 = (nationality?: string | null): string | null => {
  if (!nationality) return null;
  const n = nationality.trim();
  if (!n) return null;
  const upper = n.toUpperCase();
  if (BY_CODE.has(upper)) return upper;
  const hit = DIAL_COUNTRIES.find(
    (c) => c.name.toLowerCase() === n.toLowerCase() || c.nameAr === n,
  );
  return hit?.code ?? null;
};

const TZ_TO_ISO2: Record<string, string> = {
  "Asia/Riyadh": "SA",
  "Asia/Dubai": "AE",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Kuwait": "KW",
  "Asia/Muscat": "OM",
  "Africa/Cairo": "EG",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Asia/Damascus": "SY",
  "Asia/Baghdad": "IQ",
  "Asia/Aden": "YE",
  "Africa/Khartoum": "SD",
  "Africa/Casablanca": "MA",
  "Africa/Tunis": "TN",
  "Africa/Algiers": "DZ",
  "Africa/Tripoli": "LY",
  "Europe/Istanbul": "TR",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Manila": "PH",
  "Asia/Jakarta": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Bangkok": "TH",
  "Asia/Singapore": "SG",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Zurich": "CH",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "America/Toronto": "CA",
  "Australia/Sydney": "AU",
};

const STORAGE_KEY = "rufayq_dial_country";

export const getStoredDialCountry = (): string | null => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

export const setStoredDialCountry = (code: string) => {
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
};

export const detectDialCountry = (): string => {
  // 1. Manual override wins.
  const stored = getStoredDialCountry();
  if (stored && BY_CODE.has(stored)) return stored;

  // 2. navigator.language region.
  try {
    const lang = (typeof navigator !== "undefined" && (navigator.language || (navigator.languages && navigator.languages[0]))) || "";
    if (lang) {
      // Try Intl.Locale first, fall back to manual split.
      let region: string | undefined;
      try {
        // @ts-ignore - Intl.Locale may be missing in older targets but is available in all supported runtimes.
        region = new Intl.Locale(lang).maximize().region ?? undefined;
      } catch {
        const parts = lang.split(/[-_]/);
        if (parts[1]) region = parts[1].toUpperCase();
      }
      if (region && BY_CODE.has(region)) return region;
    }
  } catch { /* ignore */ }

  // 3. Timezone heuristic.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const iso = tz && TZ_TO_ISO2[tz];
    if (iso && BY_CODE.has(iso)) return iso;
  } catch { /* ignore */ }

  // 4. Default.
  return "SA";
};
