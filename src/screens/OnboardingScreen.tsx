import { useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";
import BrandHero from "@/components/BrandHero";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const Slide = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <div className="flex flex-col h-full" style={{ background: bg }}>{children}</div>
);

const slides = [
  /* 1 — Warm hero welcome */
  {
    bg: "linear-gradient(165deg, #0D1B2A 0%, #1a2d42 60%, #004D5B 100%)",
    content: (
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative overflow-hidden">
        {/* Ambient brand glow */}
        <div
          className="absolute -top-20 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(197,150,90,0.22) 0%, transparent 70%)", filter: "blur(8px)" }}
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(15,181,201,0.18) 0%, transparent 70%)", filter: "blur(10px)" }}
          aria-hidden
        />

        <BrandHero size="full" />

        <h1 className="font-display text-4xl text-white mt-7 text-center" style={{ fontWeight: 300 }}>
          You're Never Alone Abroad
        </h1>
        <p className="font-arabic text-2xl mt-3 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
          لست وحدك في الغربة
        </p>
        <p className="text-sm text-center mt-5 leading-relaxed max-w-[300px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          A warm bilingual companion built for Saudi and Gulf patients seeking treatment far from home.
        </p>
        <p className="font-arabic text-xs text-center mt-2 leading-relaxed max-w-[300px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>
          رفيق دافئ يرافقك بلغتك في رحلتك العلاجية خارج المملكة
        </p>
      </div>
    ),
  },
  /* 2 — Treatment journey roadmap */
  {
    bg: "linear-gradient(145deg, #004D5B, #006D7C)",
    content: (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="flex items-center gap-0 mb-8">
          {[
            { icon: "🧳", label: "Plan" },
            { icon: "✈️", label: "Travel" },
            { icon: "🏥", label: "Treat" },
            { icon: "❤️", label: "Recover" },
            { icon: "🏠", label: "Return" },
          ].map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px dashed var(--gold)" }}>
                  {step.icon}
                </div>
                <span className="text-[8px] mt-1.5 font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>{step.label}</span>
              </div>
              {i < 4 && <div className="w-5 h-0 border-t border-dashed mx-0.5" style={{ borderColor: "var(--gold)" }} />}
            </div>
          ))}
        </div>
        <h1 className="font-display text-3xl text-white text-center" style={{ fontWeight: 300 }}>
          A Journey, Not a Checklist
        </h1>
        <p className="font-arabic text-xl mt-3 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
          رحلة كاملة، خطوة بخطوة
        </p>
        <p className="text-sm text-center mt-5 leading-relaxed max-w-[300px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          Track flights, hotels, appointments and recovery on one warm, ordered timeline.
        </p>
        <p className="font-arabic text-xs text-center mt-2 leading-relaxed max-w-[300px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>
          تذاكر السفر، الإقامة، المواعيد، والتعافي في خط زمني واحد
        </p>
      </div>
    ),
  },
  /* 3 — AI Chat + Document Scanner */
  {
    bg: "linear-gradient(160deg, #0B2A3A 0%, #073544 100%)",
    content: (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-[280px]">
          {[
            { e: "💬", en: "Bilingual AI Chat", ar: "محادثة ذكية" },
            { e: "📸", en: "Scan & Translate", ar: "مسح وترجمة" },
            { e: "🔬", en: "Explain My Report", ar: "اشرح تقريري" },
            { e: "🎙️", en: "Voice in Arabic", ar: "صوت بالعربية" },
          ].map(f => (
            <div key={f.en} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(197,150,90,0.18)" }}>
              <div className="text-2xl mb-1">{f.e}</div>
              <p className="text-[10px] font-bold" style={{ color: "white" }}>{f.en}</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gold-light)" }}>{f.ar}</p>
            </div>
          ))}
        </div>
        <h1 className="font-display text-3xl text-white text-center" style={{ fontWeight: 300 }}>
          Understand Every Report
        </h1>
        <p className="font-arabic text-xl mt-3 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
          افهم كل تقرير طبي
        </p>
        <p className="text-sm text-center mt-5 leading-relaxed max-w-[300px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          Photograph any prescription or discharge note — get a plain-language bilingual explanation instantly.
        </p>
      </div>
    ),
  },
  /* 4 — Records vault, medications, care hub */
  {
    bg: "linear-gradient(155deg, #073544 0%, #004D5B 100%)",
    content: (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="space-y-2 w-full max-w-[300px] mb-8">
          {[
            { e: "📁", en: "Secure Records Vault", ar: "خزنة ملفاتك الطبية", note: "PDPL-compliant" },
            { e: "💊", en: "Smart Medication Schedule", ar: "جدول أدوية ذكي", note: "with AR/EN reminders" },
            { e: "🏥", en: "Recovery Care Hub", ar: "مركز التعافي", note: "exercises + plan" },
            { e: "🆘", en: "Emergency & Family Mode", ar: "وضع الطوارئ", note: "share with loved ones" },
          ].map(f => (
            <div key={f.en} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-2xl">{f.e}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold" style={{ color: "white" }}>{f.en}</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gold-light)" }}>{f.ar}</p>
              </div>
              <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{f.note}</span>
            </div>
          ))}
        </div>
        <h1 className="font-display text-2xl text-white text-center" style={{ fontWeight: 300 }}>
          Your Whole Health, in One Place
        </h1>
        <p className="font-arabic text-lg mt-2 text-center" dir="rtl" style={{ color: "var(--gold-light)" }}>
          صحتك بالكامل في مكان واحد
        </p>
      </div>
    ),
  },
  /* 5 — Trust & language */
  {
    bg: "var(--off-white)",
    content: (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <p className="font-arabic text-7xl" style={{ color: "var(--teal-deep)" }} dir="rtl">رُفَيِّق</p>
        <div className="mt-3"><RufayQWordmark size="md" variant="dark" /></div>
        <h1 className="font-display text-3xl mt-8 text-center" style={{ fontWeight: 400, color: "var(--navy)" }}>
          Built on Your Language & Your Trust
        </h1>
        <p className="font-arabic text-xl mt-3 text-center" dir="rtl" style={{ color: "var(--teal-mid)" }}>
          بلغتك، وعلى ثقتك
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[320px]">
          {[
            ["Arabic-First AI", "ذكاء اصطناعي بالعربية"],
            ["Saudi PDPL Compliant", "متوافق مع نظام حماية البيانات"],
            ["Insurance-Aware", "متصل بالتأمين"],
            ["Post-Return Follow-up", "متابعة بعد العودة"],
            ["24/7 Available", "متاح ٢٤/٧"],
          ].map(([en, ar]) => (
            <div key={en} className="flex flex-col items-center px-3 py-1.5 rounded-full text-center" style={{ background: "var(--teal-light)" }}>
              <span className="text-[10px] font-medium" style={{ color: "var(--teal-deep)" }}>{en}</span>
              <span className="font-arabic text-[9px]" style={{ color: "var(--teal-mid)" }}>{ar}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [current, setCurrent] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const lastIndex = slides.length - 1;

  const next = () => {
    if (current < lastIndex) setCurrent(current + 1);
    else setShowCTA(true);
  };

  if (showCTA) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8" style={{ background: "var(--navy)" }}>
        <RufayQLogo size={84} variant="gold" />
        <div className="mt-4"><RufayQWordmark size="lg" variant="light" showArabic /></div>
        <p className="text-base mt-6 text-center font-display" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 300 }}>
          Welcome — let's walk this journey together.
        </p>
        <p className="font-arabic text-sm mt-2 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>
          أهلاً بك — سنمشي هذه الرحلة معاً
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
    <Slide bg={slides[current].bg}>
      {current < lastIndex && (
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 text-xs px-3 py-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Skip<span className="font-arabic" dir="rtl"> · تخطى</span>
        </button>
      )}

      {slides[current].content}

      <div className="flex flex-col items-center pb-10 gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                background: i === current ? "var(--gold)" : "rgba(255,255,255,0.3)",
                width: i === current ? 24 : 8,
              }}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="px-10 py-3 rounded-xl font-semibold text-white btn-press"
          style={{ background: current === lastIndex ? "var(--gold)" : "var(--teal-deep)" }}
        >
          {current === lastIndex ? "Begin" : "Next"}
          <span className="font-arabic" dir="rtl"> · {current === lastIndex ? "ابدأ" : "التالي"}</span>
        </button>
      </div>
    </Slide>
  );
};

export default OnboardingScreen;
