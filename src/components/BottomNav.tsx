import { Home, Route, FolderOpen, MessageCircle } from "lucide-react";

type Tab = 'home' | 'journey' | 'records' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; labelEn: string; labelAr: string }[] = [
  { id: "home", icon: Home, labelEn: "Home", labelAr: "الرئيسية" },
  { id: "journey", icon: Route, labelEn: "Journey", labelAr: "رحلتي" },
  { id: "records", icon: FolderOpen, labelEn: "Records", labelAr: "ملفاتي" },
  { id: "chat", icon: MessageCircle, labelEn: "RufayQ", labelAr: "رُفَيِّق" },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => (
  <div className="flex items-center justify-around py-2 border-t" style={{ borderColor: "var(--gray-light)", background: "#fff" }}>
    {tabs.map(({ id, icon: Icon, labelEn }) => {
      const isActive = active === id;
      return (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className="flex flex-col items-center gap-0.5 relative pt-1"
        >
          {isActive && (
            <div className="absolute top-0 w-6 h-0.5 rounded-full" style={{ background: "var(--teal-deep)" }} />
          )}
          <Icon size={20} style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)" }} />
          <span className="text-[10px] font-medium" style={{ color: isActive ? "var(--teal-deep)" : "var(--gray)" }}>
            {labelEn}
          </span>
        </button>
      );
    })}
  </div>
);

export default BottomNav;
