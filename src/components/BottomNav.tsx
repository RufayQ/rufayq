import { Home, HeartPulse, FileText, MessageCircle } from "lucide-react";

type Tab = 'home' | 'journey' | 'records' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; labelEn: string }[] = [
  { id: "home", icon: Home, labelEn: "Home" },
  { id: "journey", icon: HeartPulse, labelEn: "Journey" },
  { id: "records", icon: FileText, labelEn: "Records" },
  { id: "chat", icon: MessageCircle, labelEn: "RufayQ" },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => (
  <div className="flex items-center justify-around py-2" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)", height: 64 }}>
    {tabs.map(({ id, icon: Icon, labelEn }) => {
      const isActive = active === id;
      const indicatorColor = id === "chat" && isActive ? "var(--gold)" : "var(--teal-deep)";
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
          <Icon size={20} strokeWidth={1.8} style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)" }} />
          <span className="text-[10px] font-medium tracking-wider max-[360px]:hidden" style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)", letterSpacing: "0.5px" }}>
            {labelEn}
          </span>
        </button>
      );
    })}
  </div>
);

export default BottomNav;
