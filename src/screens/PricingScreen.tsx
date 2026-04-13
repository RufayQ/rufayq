import { useState } from "react";
import { ArrowLeft, Check, Star, Zap, Shield, Crown } from "lucide-react";
import { toast } from "sonner";

interface PricingScreenProps {
  onBack: () => void;
}

const plans = [
  {
    id: "free",
    name: "Basic",
    nameAr: "أساسي",
    price: "Free",
    priceAr: "مجاني",
    period: "",
    icon: "🌱",
    color: "var(--gray)",
    bg: "var(--off-white)",
    features: [
      "1 active trip",
      "Basic medication tracking",
      "Document storage (5 docs)",
      "RufayQ AI — 10 messages/day",
      "Community support",
    ],
    featuresAr: [
      "رحلة واحدة نشطة",
      "تتبع أدوية أساسي",
      "تخزين ٥ مستندات",
      "رُفَيِّق — ١٠ رسائل يومياً",
      "دعم مجتمعي",
    ],
    cta: "Current Plan",
    active: true,
  },
  {
    id: "pro",
    name: "Professional",
    nameAr: "احترافي",
    price: "$9.99",
    priceAr: "٣٧ ر.س",
    period: "/month",
    icon: "⚡",
    color: "var(--teal-deep)",
    bg: "var(--teal-light)",
    popular: true,
    features: [
      "Unlimited trips",
      "Advanced medication management",
      "Unlimited document storage",
      "RufayQ AI — Unlimited",
      "Priority support",
      "Smart reminders & alerts",
      "Share with care team",
      "Bilingual export (AR/EN)",
    ],
    featuresAr: [
      "رحلات غير محدودة",
      "إدارة أدوية متقدمة",
      "تخزين مستندات غير محدود",
      "رُفَيِّق — بلا حدود",
      "دعم ذو أولوية",
      "تنبيهات وتذكيرات ذكية",
      "مشاركة مع فريق الرعاية",
      "تصدير ثنائي اللغة",
    ],
    cta: "Upgrade to Pro",
    active: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameAr: "مؤسسات",
    price: "Custom",
    priceAr: "مخصص",
    period: "",
    icon: "👑",
    color: "var(--gold)",
    bg: "var(--gold-pale)",
    features: [
      "Everything in Professional",
      "Multi-patient management",
      "Hospital integration API",
      "HIPAA compliance",
      "Dedicated account manager",
      "Custom branding",
      "Analytics dashboard",
      "SLA guarantee",
    ],
    featuresAr: [
      "كل مزايا الاحترافي",
      "إدارة مرضى متعددين",
      "ربط API مع المستشفيات",
      "توافق HIPAA",
      "مدير حساب مخصص",
      "علامة تجارية مخصصة",
      "لوحة تحليلات",
      "ضمان مستوى الخدمة",
    ],
    cta: "Contact Sales",
    active: false,
  },
];

const comparisonFeatures = [
  { feature: "Active Trips", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Document Storage", free: "5 docs", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "AI Messages", free: "10/day", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Medication Tracking", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
  { feature: "Smart Reminders", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Care Team Sharing", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Bilingual Export", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Hospital API", free: "—", pro: "—", enterprise: "✓" },
  { feature: "HIPAA Compliance", free: "—", pro: "—", enterprise: "✓" },
  { feature: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
];

const PricingScreen = ({ onBack }: PricingScreenProps) => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [showComparison, setShowComparison] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") return;
    if (planId === "enterprise") {
      toast("Contact Sales · تواصل مع المبيعات", {
        description: "Our team will reach out within 24 hours · سيتواصل فريقنا خلال ٢٤ ساعة",
      });
    } else {
      toast.success("Upgrade initiated · بدء الترقية", {
        description: "You'll be redirected to payment · ستتم إعادة توجيهك للدفع",
      });
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-3 pb-5" style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
          <p className="font-display text-lg text-white">Plans & Pricing · <span className="font-arabic">الأسعار</span></p>
          <div className="w-8" />
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: billing === b ? "var(--gold)" : "transparent",
                  color: billing === b ? "var(--navy)" : "rgba(255,255,255,0.6)",
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly — Save 20%"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ background: "var(--off-white)" }}>
        <div className="space-y-3 mt-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl p-4 relative"
              style={{
                background: "var(--white)",
                border: plan.popular ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                boxShadow: plan.popular ? "0 8px 32px rgba(0,77,91,0.15)" : "none",
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "var(--teal-deep)" }}>
                  ⭐ MOST POPULAR
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{plan.icon}</span>
                    <p className="font-display text-lg" style={{ color: "var(--navy)" }}>{plan.name}</p>
                  </div>
                  <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>{plan.nameAr}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold" style={{ color: plan.color }}>
                    {plan.price === "Free" || plan.price === "Custom" ? plan.price :
                      billing === "yearly" ? `$${(parseFloat(plan.price.replace("$", "")) * 0.8).toFixed(2)}` : plan.price}
                  </p>
                  {plan.period && (
                    <p className="text-[10px]" style={{ color: "var(--gray)" }}>
                      {billing === "yearly" ? "/month (billed yearly)" : plan.period}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check size={12} color={plan.active ? "var(--gray)" : "var(--success)"} />
                    <span className="text-[11px]" style={{ color: "var(--navy)" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={plan.active}
                className="w-full py-3 rounded-xl font-semibold text-[13px] btn-press transition-all disabled:opacity-50"
                style={{
                  background: plan.active ? "var(--off-white)" : plan.popular ? "var(--teal-deep)" : "var(--navy)",
                  color: plan.active ? "var(--gray)" : "white",
                  border: plan.active ? "1px solid var(--gray-light)" : "none",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Feature comparison toggle */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full mt-4 py-3 rounded-xl font-medium text-[12px] btn-press"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
        >
          {showComparison ? "Hide" : "Show"} Feature Comparison · مقارنة المزايا
        </button>

        {showComparison && (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--gray-light)" }}>
            {/* Header row */}
            <div className="grid grid-cols-4 px-3 py-2" style={{ background: "var(--navy)" }}>
              <p className="text-[9px] font-mono tracking-wider text-white">FEATURE</p>
              <p className="text-[9px] font-mono tracking-wider text-white text-center">BASIC</p>
              <p className="text-[9px] font-mono tracking-wider text-center" style={{ color: "var(--gold)" }}>PRO</p>
              <p className="text-[9px] font-mono tracking-wider text-white text-center">ENTERPRISE</p>
            </div>
            {comparisonFeatures.map((row, i) => (
              <div key={i} className="grid grid-cols-4 px-3 py-2" style={{
                background: i % 2 === 0 ? "var(--white)" : "var(--off-white)",
                borderBottom: "1px solid var(--gray-light)",
              }}>
                <p className="text-[10px] font-medium" style={{ color: "var(--navy)" }}>{row.feature}</p>
                <p className="text-[10px] text-center" style={{ color: "var(--gray)" }}>{row.free}</p>
                <p className="text-[10px] text-center font-semibold" style={{ color: "var(--teal-deep)" }}>{row.pro}</p>
                <p className="text-[10px] text-center" style={{ color: "var(--navy)" }}>{row.enterprise}</p>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>FREQUENTLY ASKED</p>
          {[
            { q: "Can I cancel anytime?", a: "Yes, cancel anytime. No contracts.", qAr: "هل يمكنني الإلغاء في أي وقت؟" },
            { q: "Is my data secure?", a: "Yes, all data is encrypted end-to-end.", qAr: "هل بياناتي آمنة؟" },
            { q: "Do you support Saudi Riyals?", a: "Yes! SAR pricing available at checkout.", qAr: "هل تدعمون الريال السعودي؟" },
          ].map((faq, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{faq.q}</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{faq.qAr}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingScreen;
