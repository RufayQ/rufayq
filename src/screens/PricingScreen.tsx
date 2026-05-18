/**
 * PricingScreen — RufayQ subscription plans, spec-aligned.
 *
 * 4 tiers: FREE · STARTER · COMPANION · FAMILY (SAR pricing).
 * Annual = 10 months paid (Save 2 months badge).
 * Bilingual EN + AR. Bank-transfer-only checkout (no live payment gateway).
 */
import { useState } from "react";
import { ArrowLeft, Check, Star, Clock, CheckCircle2 } from "lucide-react";
import { PLANS, planPrice, type BillingCycle, type PlanCode } from "@/data/subscriptionPlans";
import BankTransferCheckout from "@/features/payments/patient/ui/BankTransferCheckout";
import { useSubscription } from "@/hooks/useSubscription";

interface PricingScreenProps { onBack: () => void; }

const PricingScreen = ({ onBack }: PricingScreenProps) => {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<PlanCode | null>(null);
  const { subscription, pendingReceipt, refresh } = useSubscription();

  const currentPlan = (subscription?.plan?.toUpperCase?.() || "FREE") as PlanCode;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-6 pb-5" style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-dark-to))" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
          <p className="font-display text-lg text-white">Plans · <span className="font-arabic">الباقات</span></p>
          <div className="w-5" />
        </div>
        <div className="flex justify-center">
          <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
            {(["monthly", "yearly"] as BillingCycle[]).map((b) => (
              <button key={b} onClick={() => setCycle(b)}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: cycle === b ? "var(--gold)" : "transparent",
                  color: cycle === b ? "var(--navy)" : "rgba(255,255,255,0.6)",
                }}>
                {b === "monthly" ? "Monthly · شهري" : "Yearly · Save 2 months"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ background: "var(--off-white)" }}>
        {/* Current plan banner */}
        {(subscription || pendingReceipt) && (
          <div className="mt-3 rounded-xl p-3 flex items-center gap-2"
            style={{
              background: pendingReceipt ? "var(--gold-pale)" : "var(--teal-light)",
              border: `1px solid ${pendingReceipt ? "var(--gold)" : "var(--teal-deep)"}`,
            }}>
            {pendingReceipt ? <Clock size={14} color="var(--gold)" /> : <CheckCircle2 size={14} color="var(--teal-deep)" />}
            <div className="flex-1">
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>
                {pendingReceipt
                  ? "Receipt under review · إيصال قيد المراجعة"
                  : `Active: ${subscription?.plan?.toUpperCase()} · ${subscription?.status}`}
              </p>
              {subscription?.current_period_end && !pendingReceipt && (
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className="space-y-3 mt-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.code === currentPlan && !pendingReceipt;
            const price = planPrice(plan.code, cycle);
            const monthlyEquivalent = cycle === "yearly" && plan.code !== "FREE" ? Math.round(plan.yearly / 12) : null;
            return (
              <div key={plan.code}
                className="rounded-2xl p-4 relative"
                style={{
                  background: "var(--white)",
                  border: plan.recommended ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                  boxShadow: plan.recommended ? "0 8px 32px rgba(0,77,91,0.15)" : "none",
                }}>
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1"
                       style={{ background: "var(--teal-deep)" }}>
                    <Star size={10} /> RECOMMENDED · موصى بها
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-3 px-3 py-0.5 rounded-full text-[10px] font-bold"
                       style={{ background: "var(--gold)", color: "var(--navy)" }}>
                    CURRENT · الباقة الحالية
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-display text-lg" style={{ color: "var(--navy)" }}>{plan.nameEn}</p>
                    <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>{plan.nameAr}</p>
                  </div>
                  <div className="text-right">
                    {plan.code === "FREE" ? (
                      <p className="font-display text-2xl font-bold" style={{ color: "var(--gray)" }}>Free</p>
                    ) : (
                      <>
                        <p className="font-display text-2xl font-bold" style={{ color: "var(--teal-deep)" }}>
                          SAR {price.toLocaleString()}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--gray)" }}>
                          {cycle === "monthly" ? "/month" : `/year · ~${monthlyEquivalent}/mo`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check size={12} color="var(--success)" className="mt-1" />
                      <div>
                        <span className="text-[11px]" style={{ color: "var(--navy)" }}>{f.en}</span>
                        <span className="font-arabic text-[10px] block" dir="rtl" style={{ color: "var(--gray)" }}>{f.ar}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (plan.code === "FREE" || isCurrent) return;
                    setCheckoutPlan(plan.code);
                  }}
                  disabled={isCurrent || plan.code === "FREE"}
                  className="w-full py-3 rounded-xl font-semibold text-[13px] btn-press transition-all disabled:opacity-50"
                  style={{
                    background: isCurrent ? "var(--off-white)"
                      : plan.code === "FREE" ? "var(--off-white)"
                      : plan.recommended ? "var(--teal-deep)" : "var(--navy)",
                    color: isCurrent || plan.code === "FREE" ? "var(--gray)" : "white",
                    border: isCurrent || plan.code === "FREE" ? "1px solid var(--gray-light)" : "none",
                  }}>
                  {isCurrent ? "Current Plan · الباقة الحالية"
                    : plan.code === "FREE" ? "Start Free · ابدأ مجاناً"
                    : plan.ctaEn}
                </button>
                {plan.code !== "FREE" && (
                  <p className="font-arabic text-[10px] text-center mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                    {plan.ctaAr}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Annual savings note */}
        {cycle === "yearly" && (
          <div className="mt-4 rounded-xl p-3 text-center" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
            <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>Annual: 10 months paid · 2 months free 🎁</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>سنوي: ادفع ١٠ أشهر · شهرين مجاناً</p>
          </div>
        )}

        {/* Manual payment notice */}
        <div className="mt-4 rounded-xl p-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <p className="text-[11px]" style={{ color: "var(--navy)" }}>
            💳 All paid plans are activated manually after bank-transfer verification.
            No card needed — your subscription begins once our team verifies your receipt.
          </p>
          <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
            تُفعَّل الاشتراكات يدوياً بعد التحقق من إيصال التحويل البنكي.
          </p>
        </div>
      </div>

      <BankTransferCheckout
        open={!!checkoutPlan}
        defaultPlan={checkoutPlan || "COMPANION"}
        defaultCycle={cycle}
        onClose={() => { setCheckoutPlan(null); refresh(); }}
        onSuccess={refresh}
      />
    </div>
  );
};

export default PricingScreen;
