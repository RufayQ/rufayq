import { Home, HeartPulse, FileText, GraduationCap } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

type Tab = 'home' | 'journey' | 'records' | 'carehub' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  const tabs: { id: Tab; icon: typeof Home | null; labelEn: string; isChat?: boolean; isGold?: boolean }[] = [
    { id: "home", icon: Home, labelEn: "Home" },
    { id: "journey", icon: HeartPulse, labelEn: "Journey" },
    { id: "records", icon: FileText, labelEn: "Records" },
    { id: "carehub", icon: GraduationCap, labelEn: "Care Hub", isGold: true },
    { id: "chat", icon: null, labelEn: "رُفَيِّق", isChat: true },
  ];

  return (
    <div className="flex items-center justify-around py-2" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)", height: 64 }}>
      {tabs.map(({ id, icon: Icon, labelEn, isChat, isGold }) => {
        const isActive = active === id;
        const activeColor = isChat ? "var(--teal-deep)" : isGold && isActive ? "var(--gold)" : "var(--teal-deep)";
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex flex-col items-center gap-0.5 relative pt-1 btn-press"
            style={{ flex: 1 }}
            aria-label={`${labelEn} tab`}
          >
            {isActive && (
              <div className="absolute top-0 w-6 h-0.5 rounded-full" style={{ background: activeColor }} />
            )}
            {isChat ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                background: isActive ? "var(--teal-deep)" : "transparent",
              }}>
                <RufayQLogo size={22} variant={isActive ? "light" : "dark"} />
              </div>
            ) : (
              Icon && <Icon size={20} strokeWidth={1.8} style={{ color: isActive ? activeColor : "var(--gray)" }} />
            )}
            <span
              className={`text-[10px] font-medium max-[360px]:hidden ${isChat ? "font-arabic" : ""}`}
              style={{
                color: isActive ? activeColor : "var(--gray)",
                letterSpacing: isChat ? "0" : "0.5px",
                fontSize: isChat ? 9 : 10,
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
