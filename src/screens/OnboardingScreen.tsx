import { useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    bg: "linear-gradient(165deg, #0D1B2A 0%, #1a2d42 60%, #004D5B 100%)",
    content: (
      <>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <RufayQLogo size={80} variant="gold" />
          <h1 className="font-display text-4xl text-white mt-8 text-center" style={{ fontWeight: 300 }}>
            Never Alone Abroad
          </h1>
          <p className="font-arabic text-2xl mt-3 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
            لست وحدك في الغربة
          </p>
          <p className="text-sm text-center mt-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            RufayQ is your AI medical companion for every step of international care
          </p>
          <p className="font-arabic text-xs text-center mt-2 leading-relaxed" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>
            رُفَيِّق مرافقك الطبي الذكي في كل خطوة من رحلة علاجك خارج المملكة
          </p>
        </div>
      </>
    ),
  },
  {
    bg: "linear-gradient(145deg, #004D5B, #006D7C)",
    content: (
      <>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="flex items-center gap-0 mb-10">
            {[
              { icon: "🧳", label: "Before" },
              { icon: "✈️", label: "Travel" },
              { icon: "🏥", label: "Treatment" },
              { icon: "❤️", label: "Recovery" },
              { icon: "🏠", label: "Return" },
            ].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px dashed var(--gold)" }}>
                    {step.icon}
                  </div>
                  <span className="text-[8px] mt-1.5 font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{step.label}</span>
                </div>
                {i < 4 && <div className="w-5 h-0 border-t border-dashed mx-0.5" style={{ borderColor: "var(--gold)" }} />}
              </div>
            ))}
          </div>
          <h1 className="font-display text-3xl text-white text-center" style={{ fontWeight: 300 }}>
            Your Journey, Guided
          </h1>
          <p className="font-arabic text-xl mt-3 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
            رحلتك بخطوات واضحة
          </p>
          <p className="text-sm text-center mt-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            From your first appointment to your return home — we map every step
          </p>
          <p className="font-arabic text-xs text-center mt-2 leading-relaxed" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>
            من أول موعد حتى عودتك — رُفَيِّق يرسم كل خطوة
          </p>
        </div>
      </>
    ),
  },
  {
    bg: "var(--off-white)",
    content: (
      <>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <p className="font-arabic text-7xl" style={{ color: "var(--teal-deep)" }} dir="rtl">رُفَيِّق</p>
          <div className="mt-3"><RufayQWordmark size="md" variant="dark" /></div>
          <h1 className="font-display text-3xl mt-8 text-center" style={{ fontWeight: 400, color: "var(--navy)" }}>
            Your Language, Your Care
          </h1>
          <p className="font-arabic text-xl mt-3 text-center" dir="rtl" style={{ color: "var(--teal-mid)" }}>
            بلغتك، على طريقتك
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {[
              ["Arabic-First AI", "ذكاء اصطناعي بالعربية"],
              ["Medical Translation", "ترجمة طبية"],
              ["Saudi PDPL Compliant", "متوافق مع نظام حماية البيانات"],
              ["Post-Return Follow-up", "متابعة ما بعد العودة"],
              ["24/7 Available", "متاح على مدار الساعة"],
            ].map(([en, ar]) => (
              <div key={en} className="flex flex-col items-center px-3 py-1.5 rounded-full text-center" style={{ background: "var(--teal-light)" }}>
                <span className="text-[10px] font-medium" style={{ color: "var(--teal-deep)" }}>{en}</span>
                <span className="font-arabic text-[9px]" style={{ color: "var(--teal-mid)" }}>{ar}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },
];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [current, setCurrent] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

  const next = () => {
    if (current < 2) {
      setCurrent(current + 1);
    } else {
      setShowCTA(true);
    }
  };

  if (showCTA) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: "var(--navy)" }}>
        <RufayQLogo size={80} variant="gold" />
        <div className="mt-4"><RufayQWordmark size="lg" variant="light" showArabic /></div>
        <p className="text-sm mt-6 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
          Your AI Medical Buddy starts here
        </p>
        <p className="font-arabic text-sm mt-2 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>
          رُفَيِّقك الطبي يبدأ من هنا
        </p>
        <button
          onClick={onComplete}
          className="w-full mt-10 py-3.5 rounded-xl font-semibold text-white btn-press"
          style={{ background: "var(--gold)", height: 52 }}
        >
          Get Started<span className="font-arabic" dir="rtl"> · ابدأ الآن</span>

        </button>
        <button
          onClick={onComplete}
          className="w-full mt-3 py-3 rounded-xl text-sm btn-press"
          style={{ border: "1px solid var(--teal-mid)", color: "var(--teal-bright)" }}
        >
          I already have an account<span className="font-arabic" dir="rtl"> · لدي حساب بالفعل</span>

        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ background: slides[current].bg }}>
      {current < 2 && (
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 text-xs px-3 py-1"
          style={{ color: "var(--gray)" }}
        >
          Skip<span className="font-arabic" dir="rtl"> · تخطى</span>

        </button>
      )}

      {slides[current].content}

      <div className="flex flex-col items-center pb-10 gap-6">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === current ? "var(--teal-bright)" : "var(--gray)",
                opacity: i === current ? 1 : 0.3,
                width: i === current ? 24 : 8,
              }}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="px-10 py-3 rounded-xl font-semibold text-white btn-press"
          style={{ background: "var(--teal-deep)" }}
        >
          Next<span className="font-arabic" dir="rtl"> · التالي</span>

        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
