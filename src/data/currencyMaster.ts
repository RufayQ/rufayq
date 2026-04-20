/**
 * Currency master — single source of truth for all prices on rufayq.com
 *
 * Prices are FIXED, not FX-calculated. Reviewed quarterly by founders.
 * 5 launch currencies: SAR (base + GCC default), AED, EGP, USD, EUR.
 *
 * KWD/QAR/BHD/OMR are dollar-pegged ±3-8% of SAR — they map to SAR
 * with a "GCC equivalent" note (no separate currency code).
 */

export type CurrencyCode = "SAR" | "AED" | "EGP" | "USD" | "EUR";
export type TierId = "starter" | "companion" | "family";
export type AddOnId =
  | "medicalConsultant"
  | "rushTranslation"
  | "priorityCoordinator"
  | "caregiverSeat"
  | "physioNetwork"
  | "claimsConcierge";

export interface CurrencyData {
  code: CurrencyCode;
  symbol: string;
  /** "before" → "SAR 119" / "$25" ; "after" → "119 SAR" */
  symbolPosition: "before" | "after";
  decimalPlaces: 0 | 2;
  /** Currency string sent to payment processor at checkout. */
  processorCurrency: string;
  /** Native-script symbol (Arabic). Optional fallback for AR display. */
  nativeSymbol?: string;
  flag: string;
  nameEn: string;
  nameAr: string;
  tiers: Record<TierId, { monthly: number; annual: number }>;
  addons: Record<AddOnId, number>;
}

export const currencyMaster: Record<CurrencyCode, CurrencyData> = {
  SAR: {
    code: "SAR",
    symbol: "SAR",
    nativeSymbol: "ر.س",
    symbolPosition: "before",
    decimalPlaces: 0,
    processorCurrency: "SAR",
    flag: "🇸🇦",
    nameEn: "Saudi Riyal",
    nameAr: "ريال سعودي",
    tiers: {
      starter:   { monthly:   49, annual:   490 },
      companion: { monthly:  119, annual:  1190 },
      family:    { monthly:  219, annual:  2190 },
    },
    addons: {
      medicalConsultant:    94,
      rushTranslation:      71,
      priorityCoordinator: 184,
      caregiverSeat:        34,
      physioNetwork:        56,
      claimsConcierge:     109,
    },
  },
  AED: {
    code: "AED",
    symbol: "AED",
    nativeSymbol: "د.إ",
    symbolPosition: "before",
    decimalPlaces: 0,
    processorCurrency: "AED",
    flag: "🇦🇪",
    nameEn: "UAE Dirham",
    nameAr: "درهم إماراتي",
    tiers: {
      starter:   { monthly:   49, annual:   490 },
      companion: { monthly:  119, annual:  1190 },
      family:    { monthly:  219, annual:  2190 },
    },
    addons: {
      medicalConsultant:    94,
      rushTranslation:      71,
      priorityCoordinator: 184,
      caregiverSeat:        34,
      physioNetwork:        56,
      claimsConcierge:     109,
    },
  },
  EGP: {
    code: "EGP",
    symbol: "EGP",
    nativeSymbol: "ج.م",
    symbolPosition: "before",
    decimalPlaces: 0,
    processorCurrency: "EGP",
    flag: "🇪🇬",
    nameEn: "Egyptian Pound",
    nameAr: "جنيه مصري",
    tiers: {
      starter:   { monthly:   499, annual:   4990 },
      companion: { monthly:  1199, annual: 11990 },
      family:    { monthly:  2199, annual: 21990 },
    },
    addons: {
      medicalConsultant:    899,
      rushTranslation:      699,
      priorityCoordinator: 1799,
      caregiverSeat:        329,
      physioNetwork:        549,
      claimsConcierge:     1099,
    },
  },
  USD: {
    code: "USD",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 0,
    processorCurrency: "USD",
    flag: "🌐",
    nameEn: "US Dollar",
    nameAr: "دولار أمريكي",
    tiers: {
      starter:   { monthly:   13, annual:   130 },
      companion: { monthly:   32, annual:   320 },
      family:    { monthly:   59, annual:   590 },
    },
    addons: {
      medicalConsultant:    25,
      rushTranslation:      19,
      priorityCoordinator:  49,
      caregiverSeat:         9,
      physioNetwork:        15,
      claimsConcierge:      29,
    },
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    symbolPosition: "before",
    decimalPlaces: 0,
    processorCurrency: "EUR",
    flag: "🇪🇺",
    nameEn: "Euro",
    nameAr: "يورو",
    tiers: {
      starter:   { monthly:   12, annual:   120 },
      companion: { monthly:   29, annual:   290 },
      family:    { monthly:   55, annual:   550 },
    },
    addons: {
      medicalConsultant:    23,
      rushTranslation:      18,
      priorityCoordinator:  45,
      caregiverSeat:         8,
      physioNetwork:        14,
      claimsConcierge:      27,
    },
  },
};

/** Add-on metadata (currency-agnostic — labels, descriptions, kind). */
export const ADDON_META: Record<AddOnId, {
  hero?: boolean;
  unitEn: string;
  unitAr: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  ctaEn: string;
  ctaAr: string;
}> = {
  medicalConsultant: {
    hero: true,
    unitEn: "/ session",
    unitAr: "/ جلسة",
    nameEn: "RufayQ Medical Consultant",
    nameAr: "مستشار رُفَيِّق الطبي",
    descEn: "45-minute private video consultation with a qualified physician-coordinator who has already reviewed your case. Before travel, during, or after.",
    descAr: "استشارة فيديو خاصة لمدة ٤٥ دقيقة مع طبيب-منسّق مؤهل اطّلع على حالتك مسبقاً. قبل السفر أو خلاله أو بعده.",
    ctaEn: "Book a session",
    ctaAr: "احجز جلسة",
  },
  rushTranslation: {
    unitEn: "/ document",
    unitAr: "/ مستند",
    nameEn: "Rush Document Translation",
    nameAr: "ترجمة مستندات عاجلة",
    descEn: "Human-certified Arabic translation, up to 10 pages, under 6-hour turnaround. For discharge summaries, consent forms, prescriptions.",
    descAr: "ترجمة عربية معتمدة بشرياً، حتى ١٠ صفحات، خلال ٦ ساعات. لتقارير الخروج ونماذج الموافقة والوصفات.",
    ctaEn: "Add to plan",
    ctaAr: "أضف للخطة",
  },
  priorityCoordinator: {
    unitEn: "/ trip",
    unitAr: "/ رحلة",
    nameEn: "Priority Travel Coordinator",
    nameAr: "منسّق سفر بأولوية",
    descEn: "Dedicated human coordinator for your flight, hotel, and transport — 48 hours before departure through 48 hours after arrival.",
    descAr: "منسّق بشري مخصص للطيران والفندق والمواصلات — من ٤٨ ساعة قبل المغادرة إلى ٤٨ ساعة بعد الوصول.",
    ctaEn: "Add to plan",
    ctaAr: "أضف للخطة",
  },
  caregiverSeat: {
    unitEn: "/ seat / month",
    unitAr: "/ مقعد / شهر",
    nameEn: "Extra Caregiver Seat",
    nameAr: "مقعد مرافق إضافي",
    descEn: "Add a family member, spouse, or nurse to your patient profile. They see your timeline, receive alerts, and can message providers.",
    descAr: "أضف فرد عائلة أو زوج/زوجة أو ممرّض إلى ملفك. يرى الجدول الزمني ويستلم التنبيهات ويراسل مقدمي الرعاية.",
    ctaEn: "Add seat",
    ctaAr: "أضف مقعداً",
  },
  physioNetwork: {
    unitEn: "/ month activation",
    unitAr: "/ تفعيل شهري",
    nameEn: "Post-Return Physio Network",
    nameAr: "شبكة العلاج الطبيعي بعد العودة",
    descEn: "Unlock curated KSA physiotherapists and wound-care nurses at pre-negotiated RufayQ rates. Session fees separate.",
    descAr: "فعّل شبكة مختارة من أخصائيي العلاج الطبيعي وممرضي العناية بالجروح في السعودية بأسعار رُفَيِّق التفضيلية. رسوم الجلسات منفصلة.",
    ctaEn: "Activate",
    ctaAr: "فعّل",
  },
  claimsConcierge: {
    unitEn: "10% of recovery (min)",
    unitAr: "١٠٪ من الاسترداد (حد أدنى)",
    nameEn: "Insurance Claims Concierge",
    nameAr: "مساعد المطالبات التأمينية",
    descEn: "AI-prepared, human-reviewed claims to BUPA Arabia, Tawuniya, or international insurers. Only pay when your claim is approved.",
    descAr: "مطالبات يُعدّها الذكاء الاصطناعي ويراجعها البشر، إلى بوبا العربية والتعاونية والتأمين الدولي. ادفع فقط عند الموافقة على مطالبتك.",
    ctaEn: "Start claim",
    ctaAr: "ابدأ مطالبة",
  },
};

/** GCC dollar-pegged → display SAR with note. */
export const GCC_PEGGED_COUNTRIES = new Set(["KW", "QA", "BH", "OM"]);

/** Country → preferred currency. */
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  SA: "SAR",
  AE: "AED",
  EG: "EGP",
  KW: "SAR", QA: "SAR", BH: "SAR", OM: "SAR", // GCC peg
  // EU
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", AT: "EUR",
  BE: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
};
