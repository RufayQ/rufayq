import { useLanguage } from "@/contexts/LanguageContext";

interface DischargeAlertBannerProps {
  onClick: () => void;
}

const DischargeAlertBanner = ({ onClick }: DischargeAlertBannerProps) => {
  const { showEn, showAr } = useLanguage();
  const en = "Keep your travel documents ready";
  const ar = "احتفظ بوثائق رحلتك العلاجية جاهزة";
  const ariaLabel = showEn && showAr ? `${en} · ${ar}` : showAr ? ar : en;

  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left stagger-2 card-press overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--gold-pale) 0%, rgba(251,243,232,0.6) 100%)",
        border: "1px solid rgba(197,150,90,0.28)",
      }}
      aria-label={ariaLabel}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: "linear-gradient(180deg, var(--gold), rgba(197,150,90,0.3))" }}
      />
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[15px]"
        style={{ background: "var(--white)", border: "1.5px solid var(--gold)" }}
      >
        📋
      </span>
      <div className="flex-1 min-w-0">
        {showEn && (
          <p className="text-[12px] font-bold truncate" style={{ color: "var(--navy)" }}>
            {en}
          </p>
        )}
        {showAr && (
          <p
            className="font-arabic text-[10px] truncate"
            dir="rtl"
            style={{ color: "var(--gray)" }}
          >
            {ar}
          </p>
        )}
      </div>
    </button>
  );
};

export default DischargeAlertBanner;
