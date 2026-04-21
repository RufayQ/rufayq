/**
 * TourGuide — a 6-step welcome walkthrough shown once after a new patient
 * signs up. Bilingual (EN/AR). Uses a centered card overlay rather than DOM
 * spotlights so it works regardless of which screen is active.
 */
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Map, FileText, GraduationCap, MessageCircle, Home, Sparkles } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

interface TourGuideProps {
  onFinish: () => void;
}

interface Step {
  icon: React.ReactNode;
  badgeEn: string;
  badgeAr: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: <RufayQLogo size={48} variant="gold" />,
    badgeEn: "WELCOME",
    badgeAr: "أهلاً",
    titleEn: "Welcome to RufayQ",
    titleAr: "مرحباً بك في رُفَيِّق",
    bodyEn: "Your AI medical companion for every step of international care. Let's take a quick tour of what you can do.",
    bodyAr: "رفيقك الطبي الذكي في رحلة العلاج خارج المملكة. دعنا نتعرف معاً على ما يمكنك القيام به.",
    accent: "var(--gold)",
  },
  {
    icon: <Home size={36} color="var(--teal-deep)" />,
    badgeEn: "HOME",
    badgeAr: "الرئيسية",
    titleEn: "Your daily snapshot",
    titleAr: "نظرة يومية شاملة",
    bodyEn: "Quick view of your active trip, today's medications, upcoming appointments, and key reminders — all in one place.",
    bodyAr: "نظرة سريعة على رحلتك الحالية، أدويتك اليوم، مواعيدك القادمة، والتذكيرات المهمة — كلها في مكان واحد.",
    accent: "var(--teal-deep)",
  },
  {
    icon: <Map size={36} color="var(--teal-deep)" />,
    badgeEn: "JOURNEY",
    badgeAr: "الرحلة",
    titleEn: "Plan & track your trip",
    titleAr: "خطّط ورتّب رحلتك",
    bodyEn: "Add a new treatment trip, manage flights, hotels, transport, and follow each step from before travel to recovery at home.",
    bodyAr: "أضف رحلة علاجية جديدة، تابع تذاكر الطيران والفنادق والمواصلات، وكل خطوة من ما قبل السفر حتى التعافي.",
    accent: "var(--teal-deep)",
  },
  {
    icon: <FileText size={36} color="var(--gold)" />,
    badgeEn: "RECORDS",
    badgeAr: "ملفاتي",
    titleEn: "Your medical vault",
    titleAr: "خزنتك الطبية",
    bodyEn: "Securely store lab results, prescriptions, imaging, and discharge papers. Use the AI Scanner to digitize any document.",
    bodyAr: "احفظ نتائج التحاليل والوصفات والأشعة وأوراق الخروج بأمان. استخدم الماسح الذكي لرقمنة أي وثيقة.",
    accent: "var(--gold)",
  },
  {
    icon: <GraduationCap size={36} color="var(--gold)" />,
    badgeEn: "CARE HUB",
    badgeAr: "مركز الرعاية",
    titleEn: "Recovery, simplified",
    titleAr: "تعافٍ أسهل",
    bodyEn: "Daily care tasks, vitals tracking, exercises, FAQs, and milestones — your personalized post-treatment plan.",
    bodyAr: "مهام الرعاية اليومية، متابعة المؤشرات الحيوية، التمارين، الأسئلة الشائعة، والإنجازات — خطة تعافٍ مخصصة لك.",
    accent: "var(--gold)",
  },
  {
    icon: <MessageCircle size={36} color="var(--teal-deep)" />,
    badgeEn: "CHAT",
    badgeAr: "المساعد",
    titleEn: "Ask anything, anytime",
    titleAr: "اسأل في أي وقت",
    bodyEn: "Bilingual AI assistant for medical translation, instructions, second opinions, and quick answers — 24/7.",
    bodyAr: "مساعد ذكي ثنائي اللغة للترجمة الطبية، شرح التعليمات، الرأي الثاني، وإجابات سريعة — على مدار الساعة.",
    accent: "var(--teal-deep)",
  },
  {
    icon: <Sparkles size={36} color="var(--gold)" />,
    badgeEn: "READY",
    badgeAr: "جاهز",
    titleEn: "You're all set",
    titleAr: "أنت جاهز للانطلاق",
    bodyEn: "Your app starts fresh — no sample data. Add your first trip from the Journey tab, or scan a document from Records.",
    bodyAr: "تطبيقك يبدأ نظيفاً — لا توجد بيانات تجريبية. أضف رحلتك الأولى من تبويب الرحلة، أو امسح وثيقة من ملفاتي.",
    accent: "var(--gold)",
  },
];

const TourGuide = ({ onFinish }: TourGuideProps) => {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const s = STEPS[step];
  const isLast = step === total - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(6,16,26,0.85)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "var(--white)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Skip */}
        <div className="flex justify-end p-3">
          <button
            onClick={onFinish}
            className="text-[11px] px-3 py-1 rounded-full btn-press"
            style={{ color: "var(--gray)" }}
          >
            Skip<span className="font-arabic" dir="rtl"> · تخطى</span>
          </button>
        </div>

        {/* Icon */}
        <div className="px-6 pb-2 flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${s.accent}22, ${s.accent}08)`,
              border: `1.5px solid ${s.accent}55`,
            }}
          >
            {s.icon}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 text-center">
          <p
            className="font-mono text-[10px] tracking-widest mb-2"
            style={{ color: s.accent }}
          >
            {s.badgeEn} · <span className="font-arabic">{s.badgeAr}</span>
          </p>
          <h2
            className="font-display text-xl mb-1"
            style={{ color: "var(--navy)", fontWeight: 500 }}
          >
            {s.titleEn}
          </h2>
          <p
            className="font-arabic text-base mb-3"
            dir="rtl"
            style={{ color: "var(--teal-deep)" }}
          >
            {s.titleAr}
          </p>
          <p
            className="text-[13px] leading-relaxed mb-2"
            style={{ color: "var(--gray)" }}
          >
            {s.bodyEn}
          </p>
          <p
            className="font-arabic text-[12px] leading-relaxed"
            dir="rtl"
            style={{ color: "var(--gray)" }}
          >
            {s.bodyAr}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? s.accent : "var(--gray-light)",
                opacity: i === step ? 1 : 0.6,
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 p-4 border-t"
          style={{ borderColor: "var(--gray-light)", background: "var(--off-white)" }}
        >
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onFinish())}
            className="text-xs flex items-center gap-1 px-3 py-2 rounded-full btn-press"
            style={{ color: "var(--gray)" }}
            aria-label={step > 0 ? "Back" : "Skip"}
          >
            <ChevronLeft size={14} />
            {step > 0 ? "Back" : "Skip"}
          </button>
          <p className="text-[10px] font-mono" style={{ color: "var(--gray)" }}>
            {step + 1} / {total}
          </p>
          <button
            onClick={() => (isLast ? onFinish() : setStep(step + 1))}
            className="text-xs font-semibold flex items-center gap-1 px-5 py-2 rounded-full btn-press"
            style={{ background: s.accent, color: "#fff" }}
          >
            {isLast ? "Get started" : "Next"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourGuide;
