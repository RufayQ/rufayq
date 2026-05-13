interface QuickActionsGridProps {
  onNavigate: (tab: string, context?: string) => void;
}

const quickActions = [
  { emoji: "🤖", label: "Ask RufayQ AI", labelAr: "اسأل رُفَيِّق", tab: "chat", featured: true },
  { emoji: "📸", label: "Scan Document", labelAr: "امسح وثيقة", tab: "scanner" },
  { emoji: "📁", label: "All Records", labelAr: "جميع الملفات", tab: "records" },
  { emoji: "💎", label: "Plans & Pricing", labelAr: "الأسعار والباقات", tab: "pricing" },
  { emoji: "🎫", label: "Customer Support", labelAr: "الدعم الفني", tab: "support" },
  { emoji: "💊", label: "Medications", labelAr: "الأدوية", tab: "medications" },
  { emoji: "📅", label: "Add Appointment", labelAr: "إضافة موعد", tab: "journey", context: "new-appointment" },
];

const QuickActionsGrid = ({ onNavigate }: QuickActionsGridProps) => (
  <div className="stagger-4">
    <div className="flex items-center justify-between mb-2 px-1">
      <p
        className="font-mono text-[9.5px] tracking-[0.22em]"
        style={{ color: "var(--gray)" }}
      >
        QUICK ACTIONS · إجراءات سريعة
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onNavigate(action.tab, action.context)}
          className="relative rounded-2xl p-3.5 flex flex-col items-center gap-1 card-press overflow-hidden"
          style={
            action.featured
              ? {
                  background:
                    "linear-gradient(140deg, var(--white) 0%, var(--white) 65%, rgba(197,150,90,0.10) 100%)",
                  border: "1px solid rgba(197,150,90,0.25)",
                  boxShadow: "0 6px 18px -10px rgba(0,77,91,0.18)",
                }
              : {
                  background: "var(--white)",
                  border: "1px solid var(--gray-light)",
                  boxShadow: "0 2px 8px -4px rgba(0,77,91,0.08)",
                }
          }
        >
          {action.featured && (
            <span
              className="absolute top-2 right-2 font-mono text-[8px] tracking-widest px-1.5 py-[1px] rounded-full"
              style={{ background: "var(--gold)", color: "#fff" }}
            >
              AI
            </span>
          )}
          <span className="text-[22px] leading-none mt-0.5">{action.emoji}</span>
          <span
            className="text-[12.5px] font-semibold leading-tight text-center mt-1"
            style={{ color: "var(--navy)" }}
          >
            {action.label}
          </span>
          <span
            className="font-arabic text-[10px] leading-tight text-center"
            dir="rtl"
            style={{ color: "var(--gray)" }}
          >
            {action.labelAr}
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default QuickActionsGrid;
