import { Home, HeartPulse, FileText, GraduationCap } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

type Tab = 'home' | 'journey' | 'records' | 'carehub' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  badges?: Partial<Record<Tab, boolean>>;
}

const BottomNav = ({ active, onNavigate, badges = {} }: BottomNavProps) => {
  const tabs: { id: Tab; icon: typeof Home | null; labelEn: string; isChat?: boolean; isGold?: boolean }[] = [
    { id: "home", icon: Home, labelEn: "Home" },
    { id: "journey", icon: HeartPulse, labelEn: "Journey" },
    { id: "records", icon: FileText, labelEn: "Records" },
    { id: "carehub", icon: GraduationCap, labelEn: "Care Hub", isGold: true },
    { id: "chat", icon: null, labelEn: "رُفَيِّق", isChat: true },
  ];

  return (
    <div className="flex items-center justify-around shrink-0" style={{
      background: "var(--white)",
      borderTop: "1px solid var(--gray-light)",
      height: 64,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map(({ id, icon: Icon, labelEn, isChat, isGold }) => {
        const isActive = active === id;
        const activeColor = isGold && isActive ? "var(--gold)" : "var(--teal-deep)";
        const indicatorColor = isGold ? "var(--gold)" : "var(--teal-deep)";
        const hasBadge = badges[id];

        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex flex-col items-center gap-0.5 relative pt-1 btn-press"
            style={{ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer" }}
            aria-label={`${labelEn} tab`}
          >
            {/* Active indicator bar */}
            <div className="absolute top-0 w-5 h-0.5 rounded-full transition-transform" style={{
              background: indicatorColor,
              transform: isActive ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 150ms ease-out",
            }} />

            {/* Icon area */}
            <div className="relative">
              {isChat ? (
                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all" style={{
                  background: isActive ? "var(--teal-deep)" : "transparent",
                }}>
                  <RufayQLogo size={22} variant={isActive ? "light" : "dark"} />
                </div>
              ) : (
                Icon && <Icon size={22} strokeWidth={1.8} style={{ color: isActive ? activeColor : "var(--gray)" }} />
              )}

              {/* Badge dot */}
              {hasBadge && (
                <div className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full" style={{
                  background: "var(--error)",
                  border: "1.5px solid var(--white)",
                }} />
              )}
            </div>

            <span
              className={`font-medium ${isChat ? "font-arabic" : ""}`}
              style={{
                color: isActive ? activeColor : "var(--gray)",
                letterSpacing: isChat ? "0" : "0.5px",
                fontSize: 9,
                fontFamily: isChat ? "'Noto Naskh Arabic', serif" : "'DM Sans', sans-serif",
              }}
            >
              {labelEn}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;