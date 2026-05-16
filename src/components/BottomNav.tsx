import { Map, FileText, GraduationCap, MessageCircle } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import { useLanguage } from "@/contexts/LanguageContext";

type Tab = 'home' | 'journey' | 'records' | 'carehub' | 'chat';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  /** `true` shows a small dot; a number shows a count pill (WhatsApp style). */
  badges?: Partial<Record<Tab, boolean | number>>;
}

const BottomNav = ({ active, onNavigate, badges = {} }: BottomNavProps) => {
  const { showEn, showAr } = useLanguage();
  const tabAriaLabel = (en: string, ar: string) =>
    showEn && showAr
      ? `${en} tab · تبويب ${ar}`
      : showAr
        ? `تبويب ${ar}`
        : `${en} tab`;
  const homeAriaLabel = showEn && showAr
    ? "Home tab · رُفَيِّق الرئيسية"
    : showAr
      ? "رُفَيِّق الرئيسية"
      : "Home tab";

  const sideTabs: { id: Tab; icon: typeof Map; labelEn: string; labelAr: string }[] = [
    { id: "journey", icon: Map, labelEn: "Journey", labelAr: "رحلة" },
    { id: "records", icon: FileText, labelEn: "Records", labelAr: "السجلات" },
    // center gap (raised Home button)
    { id: "carehub", icon: GraduationCap, labelEn: "Care Hub", labelAr: "العناية" },
    { id: "chat", icon: MessageCircle, labelEn: "Chat", labelAr: "محادثة" },
  ];

  const leftTabs = sideTabs.slice(0, 2);
  const rightTabs = sideTabs.slice(2);
  const isHomeActive = active === "home";

  const renderTab = ({ id, icon: Icon, labelEn, labelAr }: typeof sideTabs[0]) => {
    const isActive = active === id;
    const rawBadge = badges[id];
    const badgeCount = typeof rawBadge === "number" ? rawBadge : 0;
    const hasDot = rawBadge === true || badgeCount > 0;

    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className="flex flex-col items-center gap-1 relative btn-press"
        style={{ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer" }}
        aria-label={tabAriaLabel(labelEn, labelAr)}
      >
        {/* Gold capsule indicator — premium brand accent, sits ABOVE the icon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: isActive ? 22 : 0,
            height: 3,
            background: "linear-gradient(90deg, var(--gold), #E8C078)",
            boxShadow: isActive ? "0 0 8px rgba(197,150,90,0.55)" : "none",
            opacity: isActive ? 1 : 0,
            transition: "width 220ms ease-out, opacity 180ms ease-out",
          }}
        />

        {/* Icon — active gets a teal medallion with gold ring; inactive is muted navy */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: isActive
              ? "linear-gradient(135deg, var(--teal-deep), var(--navy))"
              : "transparent",
            boxShadow: isActive
              ? "0 4px 12px rgba(0,77,91,0.28), inset 0 0 0 1.5px rgba(197,150,90,0.55)"
              : "none",
            transition: "background 220ms ease, box-shadow 220ms ease, transform 220ms ease",
            transform: isActive ? "translateY(-2px)" : "translateY(0)",
          }}
        >
          <Icon
            size={isActive ? 19 : 21}
            strokeWidth={isActive ? 2.2 : 1.7}
            style={{
              color: isActive ? "var(--gold)" : "var(--navy)",
              opacity: isActive ? 1 : 0.55,
              transition: "color 200ms ease, opacity 200ms ease",
            }}
          />
          {badgeCount > 0 ? (
            <div
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{
                background: "var(--error)",
                color: "#fff",
                border: "1.5px solid var(--white)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </div>
          ) : hasDot ? (
            <div className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{
              background: "var(--gold)",
              border: "1.5px solid var(--white)",
              boxShadow: "0 0 4px rgba(197,150,90,0.6)",
            }} />
          ) : null}
        </div>

        {showEn && (
          <span className="font-medium" style={{
            color: isActive ? "var(--teal-deep)" : "var(--navy)",
            opacity: isActive ? 1 : 0.55,
            letterSpacing: "0.4px",
            fontSize: 9,
            fontFamily: "'DM Sans', sans-serif",
            transition: "color 200ms ease, opacity 200ms ease",
          }}>
            {labelEn}
          </span>
        )}
        {showAr && (
          <span className="font-arabic" dir="rtl" style={{
            color: isActive ? "var(--teal-deep)" : "var(--navy)",
            opacity: isActive ? 1 : 0.55,
            fontSize: 9,
            fontWeight: 500,
            fontFamily: "'Noto Naskh Arabic', serif",
            lineHeight: 1.1,
            transition: "color 200ms ease, opacity 200ms ease",
          }}>
            {labelAr}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="relative flex items-end justify-around shrink-0"
      style={{
        // Soft cream → white wash so the gold/teal accents sit on warm paper, not stark white
        background: "linear-gradient(180deg, var(--off-white) 0%, var(--white) 60%)",
        borderTop: "1px solid rgba(197,150,90,0.25)",
        boxShadow: "0 -8px 24px rgba(11,42,58,0.06)",
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        overflow: "visible",
        zIndex: 20,
      }}
    >
      {/* Hairline gold accent line — the brand "thread" across the nav */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(197,150,90,0.45) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Left tabs */}
      {leftTabs.map(renderTab)}

      {/* Center Home Button - raised, gold ring + teal core */}
      <div className="flex flex-col items-center" style={{ flex: 1 }}>
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center justify-center btn-press"
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: isHomeActive
              ? "linear-gradient(135deg, var(--teal-deep) 0%, var(--navy) 100%)"
              : "linear-gradient(135deg, #FFFFFF 0%, var(--off-white) 100%)",
            border: isHomeActive
              ? "2.5px solid var(--gold)"
              : "2px solid rgba(197,150,90,0.45)",
            boxShadow: isHomeActive
              ? "0 6px 20px rgba(0,77,91,0.4), 0 0 0 4px rgba(197,150,90,0.18), inset 0 1px 0 rgba(255,255,255,0.15)"
              : "0 3px 10px rgba(11,42,58,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
            marginTop: -22,
            marginBottom: 2,
            transition: "all 220ms ease",
          }}
          aria-label={homeAriaLabel}
        >
          <RufayQLogo size={26} variant={isHomeActive ? "light" : "dark"} />
        </button>
        {showEn && (
          <span style={{
            color: isHomeActive ? "var(--teal-deep)" : "var(--navy)",
            opacity: isHomeActive ? 1 : 0.6,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.5px",
          }}>
            Home
          </span>
        )}
        {showAr && (
          <span className="font-arabic lang-keep" dir="rtl" style={{
            color: isHomeActive ? "var(--teal-deep)" : "var(--navy)",
            opacity: isHomeActive ? 1 : 0.6,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "'Noto Naskh Arabic', serif",
            lineHeight: 1.1,
          }}>
            رُفَيِّق
          </span>
        )}
      </div>

      {/* Right tabs */}
      {rightTabs.map(renderTab)}
    </div>
  );
};

export default BottomNav;
