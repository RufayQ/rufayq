import { Map, FileText, GraduationCap, MessageCircle } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

type Tab = 'home' | 'journey' | 'records' | 'carehub' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  badges?: Partial<Record<Tab, boolean>>;
}

const BottomNav = ({ active, onNavigate, badges = {} }: BottomNavProps) => {
  const sideTabs: { id: Tab; icon: typeof Map; labelEn: string; isGold?: boolean }[] = [
    { id: "journey", icon: Map, labelEn: "Journey" },
    { id: "records", icon: FileText, labelEn: "Records" },
    // center gap
    { id: "carehub", icon: GraduationCap, labelEn: "Care Hub", isGold: true },
    { id: "chat", icon: MessageCircle, labelEn: "Chat" },
  ];

  const leftTabs = sideTabs.slice(0, 2);
  const rightTabs = sideTabs.slice(2);
  const isHomeActive = active === "home";

  const renderTab = ({ id, icon: Icon, labelEn, isGold }: typeof sideTabs[0]) => {
    const isActive = active === id;
    const activeColor = isGold && isActive ? "var(--gold)" : "var(--teal-deep)";
    const indicatorColor = isGold ? "var(--gold)" : "var(--teal-deep)";
    const hasBadge = badges[id];

    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className="flex flex-col items-center gap-0.5 relative btn-press"
        style={{ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer" }}
        aria-label={`${labelEn} tab`}
      >
        <div className="absolute top-0 w-5 h-0.5 rounded-full transition-transform" style={{
          background: indicatorColor,
          transform: isActive ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 150ms ease-out",
        }} />
        <div className="relative">
          <Icon size={22} strokeWidth={1.8} style={{ color: isActive ? activeColor : "var(--gray)" }} />
          {hasBadge && (
            <div className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full" style={{
              background: "var(--error)",
              border: "1.5px solid var(--white)",
            }} />
          )}
        </div>
        <span className="font-medium" style={{
          color: isActive ? activeColor : "var(--gray)",
          letterSpacing: "0.5px",
          fontSize: 9,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {labelEn}
        </span>
      </button>
    );
  };

  return (
    <div className="relative flex items-end justify-around shrink-0" style={{
      background: "var(--white)",
      borderTop: "1px solid var(--gray-light)",
      height: 64,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      overflow: "visible",
      zIndex: 20,
    }}>
      {/* Left tabs */}
      {leftTabs.map(renderTab)}

      {/* Center Home Button - raised */}
      <div className="flex flex-col items-center" style={{ flex: 1 }}>
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center justify-center btn-press"
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: isHomeActive
              ? "linear-gradient(135deg, var(--teal-deep), var(--navy))"
              : "var(--white)",
            border: isHomeActive ? "2.5px solid var(--gold)" : "2px solid var(--gray-light)",
            boxShadow: isHomeActive
              ? "0 4px 16px rgba(0,77,91,0.35), 0 0 0 3px rgba(197,150,90,0.15)"
              : "0 2px 8px rgba(0,0,0,0.08)",
            marginTop: -20,
            marginBottom: 2,
            transition: "all 200ms ease",
          }}
          aria-label="Home tab"
        >
          <RufayQLogo size={24} variant={isHomeActive ? "light" : "dark"} />
        </button>
        <span className="font-arabic" style={{
          color: isHomeActive ? "var(--teal-deep)" : "var(--gray)",
          fontSize: 9,
          fontWeight: 600,
          fontFamily: "'Noto Naskh Arabic', serif",
          marginTop: 0,
        }}>
          رُفَيِّق
        </span>
      </div>

      {/* Right tabs */}
      {rightTabs.map(renderTab)}
    </div>
  );
};

export default BottomNav;
