/**
 * Single source of truth for RufayQ subscription plans.
 * Spec: 4 tiers (FREE / STARTER / COMPANION / FAMILY), SAR pricing,
 * annual = 10 months paid (2 months free).
 */

export type PlanCode = "FREE" | "STARTER" | "COMPANION" | "FAMILY";
export type BillingCycle = "monthly" | "yearly";

export interface PlanFeature { en: string; ar: string; }

export interface PlanDef {
  code: PlanCode;
  nameEn: string;
  nameAr: string;
  monthly: number;     // SAR
  yearly: number;      // SAR (= 10 × monthly)
  recommended?: boolean;
  features: PlanFeature[];
  ctaEn: string;
  ctaAr: string;
}

export const PLANS: PlanDef[] = [
  {
    code: "FREE",
    nameEn: "Free",
    nameAr: "مجاني",
    monthly: 0,
    yearly: 0,
    features: [
      { en: "AI chat: 20 messages / month",        ar: "محادثة ذكية: ٢٠ رسالة شهرياً" },
      { en: "Documents: 5 files max",              ar: "المستندات: ٥ ملفات كحد أقصى" },
      { en: "Basic journey tracker",               ar: "متابعة رحلة أساسية" },
      { en: "3 condition guides",                  ar: "٣ أدلة حالات" },
      { en: "No medical consultant",               ar: "بدون استشاري طبي" },
    ],
    ctaEn: "Start Free",
    ctaAr: "ابدأ مجاناً",
  },
  {
    code: "STARTER",
    nameEn: "Starter",
    nameAr: "البداية",
    monthly: 49,
    yearly: 490,
    features: [
      { en: "Everything in Free",                  ar: "كل مزايا الباقة المجانية" },
      { en: "Unlimited AI chat",                   ar: "محادثة ذكية بلا حدود" },
      { en: "Unlimited documents + OCR",           ar: "مستندات بلا حدود + قراءة ذكية" },
      { en: "Full journey tracker",                ar: "متابعة رحلة كاملة" },
      { en: "Medication manager",                  ar: "إدارة الأدوية" },
      { en: "Email + chat support",                ar: "دعم بالبريد والدردشة" },
    ],
    ctaEn: "Subscribe by Bank Transfer",
    ctaAr: "اشترك عبر التحويل البنكي",
  },
  {
    code: "COMPANION",
    nameEn: "Companion",
    nameAr: "رُفَيْق",
    monthly: 119,
    yearly: 1190,
    recommended: true,
    features: [
      { en: "Everything in Starter",               ar: "كل مزايا باقة البداية" },
      { en: "Care Hub full access",                ar: "وصول كامل لمركز الرعاية" },
      { en: "Medical consultant: 2 / month",       ar: "استشاري طبي: مرتان شهرياً" },
      { en: "KSA care coordination",               ar: "تنسيق الرعاية داخل المملكة" },
      { en: "Family add-on eligible",              ar: "قابل لإضافة باقة العائلة" },
      { en: "Priority support",                    ar: "دعم ذو أولوية" },
    ],
    ctaEn: "Subscribe by Bank Transfer",
    ctaAr: "اشترك عبر التحويل البنكي",
  },
  {
    code: "FAMILY",
    nameEn: "Family",
    nameAr: "العائلة",
    monthly: 179,
    yearly: 1790,
    features: [
      { en: "Up to 4 patient profiles",            ar: "حتى ٤ ملفات مرضى" },
      { en: "Everything in Companion",             ar: "كل مزايا باقة رُفَيْق" },
      { en: "Shared coordinator",                  ar: "منسق مشترك" },
      { en: "Family dashboard view",               ar: "لوحة عائلية" },
      { en: "Medical consultant: 4 / month",       ar: "استشاري طبي: ٤ شهرياً" },
    ],
    ctaEn: "Subscribe by Bank Transfer",
    ctaAr: "اشترك عبر التحويل البنكي",
  },
];

export const PLAN_BY_CODE: Record<PlanCode, PlanDef> = Object.fromEntries(
  PLANS.map((p) => [p.code, p]),
) as Record<PlanCode, PlanDef>;

/** Bank transfer details shown to patients on checkout (placeholders for now). */
export const BANK_DETAILS = {
  beneficiary: "RufayQ",
  beneficiaryAr: "رُفَيْق",
  bankName: "Saudi National Bank",
  bankNameAr: "البنك الأهلي السعودي",
  iban: "SA00 0000 0000 0000 0000 0000",
  accountNo: "000000000000",
  whatsapp: "+966 50 000 0000",
  email: "billing@rufayq.com",
};

export function planPrice(code: PlanCode, cycle: BillingCycle): number {
  const p = PLAN_BY_CODE[code];
  return cycle === "monthly" ? p.monthly : p.yearly;
}
