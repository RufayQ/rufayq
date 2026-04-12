import { Home, HeartPulse, FileText } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

type Tab = 'home' | 'journey' | 'records' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home | null; labelEn: string }[] = [
  { id: "home", icon: Home, labelEn: "Home" },
  { id: "journey", icon: HeartPulse, labelEn: "Journey" },
  { id: "records", icon: FileText, labelEn: "Records" },
  { id: "chat", icon: null, labelEn: "رُفَيِّق" },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => (
  <div className="flex items-center justify-around py-2" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)", height: 64 }}>
    {tabs.map(({ id, icon: Icon, labelEn }) => {
      const isActive = active === id;
      const indicatorColor = id === "chat" && isActive ? "var(--gold)" : "var(--teal-deep)";
      const isChat = id === "chat";
      return (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className="flex flex-col items-center gap-0.5 relative pt-1 btn-press"
          aria-label={`${labelEn} tab`}
        >
          {isActive && (
            <div className="absolute top-0 w-6 h-0.5 rounded-full" style={{ background: indicatorColor }} />
          )}
          {isChat ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
              background: isActive ? "var(--teal-deep)" : "transparent",
            }}>
              <RufayQLogo size={22} variant={isActive ? "light" : "dark"} />
            </div>
          ) : (
            Icon && <Icon size={20} strokeWidth={1.8} style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)" }} />
          )}
          <span className={`text-[10px] font-medium tracking-wider max-[360px]:hidden ${isChat ? "font-arabic" : ""}`} style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)", letterSpacing: isChat ? "0" : "0.5px", fontSize: isChat ? 9 : 10 }}>
            {labelEn}
          </span>
        </button>
      );
    })}
  </div>
);

export default BottomNav;
