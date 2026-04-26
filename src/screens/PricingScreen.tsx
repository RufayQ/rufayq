import { useState } from "react";
import { ArrowLeft, Check, Zap, Shield, Crown, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import { ADDON_META, type AddOnId } from "@/data/currencyMaster";
import UpgradeCTA from "@/components/UpgradeCTA";
import { useSubscription } from "@/hooks/useSubscription";

type UpgradePlan = "basic" | "companion" | "family" | "premium";
const PLAN_TO_UPGRADE: Record<string, UpgradePlan> = { free: "basic", pro: "companion", enterprise: "premium" };

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

const addOns = [
  { id: "ai-boost", name: "AI Boost Pack", nameAr: "حزمة ذكاء إضافية", price: "$2.99", priceAr: "١١ ر.س", unit: "/50 messages", icon: "🤖", desc: "Extra 50 AI messages when you run out", descAr: "٥٠ رسالة إضافية عند نفاد رصيدك" },
  { id: "translation", name: "Priority Translation", nameAr: "ترجمة فورية", price: "$4.99", priceAr: "١٩ ر.س", unit: "/month", icon: "🌐", desc: "Instant bilingual document translation", descAr: "ترجمة مستندات ثنائية اللغة فورية" },
  { id: "family", name: "Family Pack", nameAr: "حزمة العائلة", price: "$6.99", priceAr: "٢٦ ر.س", unit: "/month", icon: "👨‍👩‍👧‍👦", desc: "Add up to 3 family members", descAr: "أضف حتى ٣ أفراد من العائلة" },
  { id: "storage", name: "Extra Storage", nameAr: "تخزين إضافي", price: "$1.99", priceAr: "٧ ر.س", unit: "/10 GB", icon: "💾", desc: "10 GB additional document storage", descAr: "١٠ جيجا تخزين مستندات إضافية" },
];

const comparisonFeatures = [
  { feature: "Active Trips", featureAr: "رحلات نشطة", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Document Storage", featureAr: "تخزين مستندات", free: "5 docs", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "AI Messages", featureAr: "رسائل ذكية", free: "10/day", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Medication Tracking", featureAr: "تتبع أدوية", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
  { feature: "Smart Reminders", featureAr: "تذكيرات ذكية", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Care Team Sharing", featureAr: "مشاركة فريق", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Bilingual Export", featureAr: "تصدير ثنائي", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Smart Scan AI", featureAr: "مسح ذكي", free: "5/month", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Hospital API", featureAr: "ربط مستشفيات", free: "—", pro: "—", enterprise: "✓" },
  { feature: "HIPAA Compliance", featureAr: "توافق HIPAA", free: "—", pro: "—", enterprise: "✓" },
  { feature: "Support", featureAr: "دعم", free: "Community", pro: "Priority", enterprise: "Dedicated" },
  { feature: "Add-ons", featureAr: "إضافات", free: "—", pro: "✓", enterprise: "Included" },
];

const ADDON_MAP: { id: AddOnId; icon: string }[] = [
  { id: "medicalConsultant", icon: "🩺" },
  { id: "rushTranslation", icon: "🌐" },
  { id: "caregiverSeat", icon: "👨‍👩‍👧" },
  { id: "physioNetwork", icon: "💪" },
];

const PricingScreen = ({ onBack }: PricingScreenProps) => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [showComparison, setShowComparison] = useState(false);
  const [showAddOns, setShowAddOns] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<UpgradePlan | null>(null);
  const { getPrice, getAddon, format, currency } = useCurrency();
  const { subscription, pendingReceipt, refresh } = useSubscription();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") return;
    if (planId === "enterprise") {
      toast("Contact Sales · تواصل مع المبيعات", {
        description: "Our team will reach out within 24 hours · سيتواصل فريقنا خلال ٢٤ ساعة",
      });
      return;
    }
    setUpgradePlan(PLAN_TO_UPGRADE[planId] || "companion");
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const faqs = [
    { q: "Can I cancel anytime?", a: "Yes, cancel anytime. No contracts. Your data stays safe for 30 days.", qAr: "هل يمكنني الإلغاء في أي وقت؟" },
    { q: "Is my data secure?", a: "Yes, all data is encrypted end-to-end with AES-256. We comply with GDPR and healthcare data regulations.", qAr: "هل بياناتي آمنة؟" },
    { q: "Do you support Saudi Riyals?", a: "Yes! SAR pricing is available at checkout. We also accept MADA cards.", qAr: "هل تدعمون الريال السعودي؟" },
    { q: "Can I switch plans mid-month?", a: "Yes! Upgrade anytime and pay the prorated difference. Downgrades take effect next billing cycle.", qAr: "هل يمكنني تغيير الباقة؟" },
    { q: "What happens to my data if I downgrade?", a: "Your data is preserved. Features beyond your plan limit become read-only until you upgrade again.", qAr: "ماذا يحدث لبياناتي عند التخفيض؟" },
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-3 pb-5" style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
          <p className="font-display text-lg text-white">Plans & Pricing · <span className="font-arabic">الأسعار</span></p>
          <CurrencySwitcher variant="inline" />
        </div>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ background: "var(--off-white)" }}>
        {/* Current plan banner */}
        {(subscription || pendingReceipt) && (
          <div className="mt-3 rounded-xl p-3 flex items-center gap-2"
            style={{
              background: pendingReceipt ? "var(--gold-pale)" : "var(--teal-light)",
              border: `1px solid ${pendingReceipt ? "var(--gold)" : "var(--teal-deep)"}`,
            }}>
            {pendingReceipt ? <Clock size={14} color="var(--gold)" /> : <Check size={14} color="var(--teal-deep)" />}
            <div className="flex-1">
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>
                {pendingReceipt
                  ? "Receipt under review · إيصال قيد المراجعة"
                  : `Active plan: ${subscription?.plan} · ${subscription?.status}`}
              </p>
              {subscription?.current_period_end && !pendingReceipt && (
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
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
                    {plan.price === "Free" || plan.price === "Custom"
                      ? plan.price
                      : plan.id === "pro"
                        ? format(getPrice("companion", billing === "yearly" ? "annual" : "monthly") / (billing === "yearly" ? 12 : 1))
                        : plan.price}
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

        {/* Pay As You Go - Add-ons */}
        <button
          onClick={() => setShowAddOns(!showAddOns)}
          className="w-full mt-4 py-3 rounded-xl font-medium text-[12px] btn-press flex items-center justify-center gap-2"
          style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)", color: "var(--gold)" }}
        >
          <Zap size={14} />
          {showAddOns ? "Hide" : "Show"} Pay-As-You-Go Add-ons<span className="font-arabic" dir="rtl"> · إضافات حسب الاستخدام</span>

          {showAddOns ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAddOns && (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>PAY-AS-YOU-GO ADD-ONS</p>
            {ADDON_MAP.map(({ id, icon }) => {
              const meta = ADDON_META[id];
              const selected = selectedAddOns.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAddOn(id)}
                  className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left transition-all"
                  style={{
                    background: selected ? "var(--teal-light)" : "var(--white)",
                    border: selected ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                  }}
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{meta.nameEn}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{meta.nameAr}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--gray)" }}>{meta.descEn}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold" style={{ color: "var(--teal-deep)" }}>{format(getAddon(id))}</p>
                    <p className="text-[9px]" style={{ color: "var(--gray)" }}>{meta.unitEn}</p>
                  </div>
                </button>
              );
            })}
            {selectedAddOns.size > 0 && (
              <button
                onClick={() => toast.success("Add-ons added to cart · أُضيفت الإضافات", { description: `${selectedAddOns.size} add-on(s) selected` })}
                className="w-full py-3 rounded-xl font-semibold text-white btn-press"
                style={{ background: "var(--teal-deep)" }}
              >
                Add {selectedAddOns.size} Add-on{selectedAddOns.size > 1 ? "s" : ""}<span className="font-arabic" dir="rtl"> · إضافة</span>

              </button>
            )}
          </div>
        )}

        {/* Feature Comparison */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full mt-4 py-3 rounded-xl font-medium text-[12px] btn-press flex items-center justify-center gap-2"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
        >
          <Shield size={14} />
          {showComparison ? "Hide" : "Show"} Full Feature Comparison<span className="font-arabic" dir="rtl"> · مقارنة المزايا</span>

          {showComparison ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showComparison && (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--gray-light)" }}>
            <div className="grid grid-cols-4 px-3 py-2" style={{ background: "var(--navy)" }}>
              <p className="text-[9px] font-mono tracking-wider text-white">FEATURE</p>
              <p className="text-[9px] font-mono tracking-wider text-white text-center">BASIC</p>
              <p className="text-[9px] font-mono tracking-wider text-center" style={{ color: "var(--gold)" }}>PRO</p>
              <p className="text-[9px] font-mono tracking-wider text-white text-center">ENT.</p>
            </div>
            {comparisonFeatures.map((row, i) => (
              <div key={i} className="grid grid-cols-4 px-3 py-2" style={{
                background: i % 2 === 0 ? "var(--white)" : "var(--off-white)",
                borderBottom: "1px solid var(--gray-light)",
              }}>
                <div>
                  <p className="text-[10px] font-medium" style={{ color: "var(--navy)" }}>{row.feature}</p>
                  <p className="font-arabic text-[8px]" dir="rtl" style={{ color: "var(--gray)" }}>{row.featureAr}</p>
                </div>
                <p className="text-[10px] text-center self-center" style={{ color: "var(--gray)" }}>{row.free}</p>
                <p className="text-[10px] text-center font-semibold self-center" style={{ color: "var(--teal-deep)" }}>{row.pro}</p>
                <p className="text-[10px] text-center self-center" style={{ color: "var(--navy)" }}>{row.enterprise}</p>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>FREQUENTLY ASKED</p>
          {faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              className="w-full rounded-xl p-3 text-left transition-all"
              style={{ background: "var(--white)", border: expandedFaq === i ? "1px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{faq.q}</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{faq.qAr}</p>
                </div>
                {expandedFaq === i ? <ChevronUp size={14} color="var(--teal-deep)" /> : <ChevronDown size={14} color="var(--gray)" />}
              </div>
              {expandedFaq === i && (
                <p className="text-[11px] mt-2 pt-2 leading-relaxed" style={{ color: "var(--gray)", borderTop: "1px solid var(--gray-light)" }}>
                  {faq.a}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Money-back guarantee */}
        <div className="mt-4 rounded-xl p-4 text-center" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
          <span className="text-2xl">🛡️</span>
          <p className="text-[13px] font-semibold mt-1" style={{ color: "var(--teal-deep)" }}>14-Day Money-Back Guarantee</p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>ضمان استرداد الأموال خلال ١٤ يوماً</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Not satisfied? Get a full refund, no questions asked.</p>
        </div>
      </div>

      <UpgradeCTA
        open={!!upgradePlan}
        onClose={() => setUpgradePlan(null)}
        onSuccess={() => { setUpgradePlan(null); refresh(); }}
        defaultPlan={upgradePlan || "companion"}
      />
    </div>
  );
};

export default PricingScreen;
