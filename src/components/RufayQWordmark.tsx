import RufayQLogo from "./RufayQLogo";

interface RufayQWordmarkProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showArabic?: boolean;
}

const sizeMap = {
  sm: { logo: 22, text: "text-lg", arabic: "text-xs" },
  md: { logo: 28, text: "text-xl", arabic: "text-sm" },
  lg: { logo: 36, text: "text-2xl", arabic: "text-base" },
};

const RufayQWordmark = ({ size = "md", variant = "dark", showArabic = false }: RufayQWordmarkProps) => {
  const s = sizeMap[size];
  const textColor = variant === "light" ? "#fff" : "#004D5B";

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <RufayQLogo size={s.logo} variant={variant === "light" ? "light" : "dark"} />
        <span className={`font-display font-light ${s.text}`}>
          <span style={{ color: textColor }}>Rufay</span>
          <span className="font-bold" style={{ color: "#C5965A" }}>Q</span>
        </span>
      </div>
      {showArabic && (
        <p className={`font-arabic ${s.arabic} mt-1`} dir="rtl" style={{ color: variant === "light" ? "rgba(255,255,255,0.5)" : "var(--gray)", opacity: 0.5 }}>
          رُفَيِّق
        </p>
      )}
    </div>
  );
};

export default RufayQWordmark;
