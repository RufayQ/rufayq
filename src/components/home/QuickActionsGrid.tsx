interface Props {
  onNavigate: (tab: string) => void;
}

const QUICK_ACTIONS = [
  { emoji: "🤖", label: "Ask RufayQ AI", labelAr: "اسأل رُفَيِّق", tab: "chat" },
  { emoji: "📸", label: "Scan Document", labelAr: "امسح وثيقة", tab: "scanner" },
  { emoji: "📁", label: "All Records", labelAr: "جميع الملفات", tab: "records" },
  { emoji: "💎", label: "Plans & Pricing", labelAr: "الأسعار والباقات", tab: "pricing" },
  { emoji: "🎫", label: "Customer Support", labelAr: "الدعم الفني", tab: "support" },
  { emoji: "💊", label: "Medications", labelAr: "الأدوية", tab: "medications" },
];

const QuickActionsGrid = ({ onNavigate }: Props) => (
  <div className="stagger-4">
    <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>QUICK ACTIONS</p>
    <div className="grid grid-cols-2 gap-2">
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onNavigate(a.tab)}
          className="rounded-xl p-3.5 flex flex-col items-center gap-1 card-press"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
        >
          <span className="text-xl">{a.emoji}</span>
          <span className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{a.label}</span>
          <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{a.labelAr}</span>
        </button>
      ))}
    </div>
  </div>
);

export default QuickActionsGrid;
