import RufayQWordmark from "@/components/RufayQWordmark";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import NotificationCenter from "@/components/NotificationCenter";
import PhaseRibbon from "@/components/home/PhaseRibbon";
import { type Phase } from "@/components/home/journeyPhase";
import { useLanguage } from "@/contexts/LanguageContext";

export type HomeHeaderMenuItem = HeaderMenuItem;

interface HomeHeaderProps {
  patientName: string;
  patientNameAr: string;
  onProfile: () => void;
  menuItems: HomeHeaderMenuItem[];
  /** Optional: when present, renders a faint phase ribbon along the bottom edge. */
  phase?: Phase;
  /** Controlled notification drawer state (lifted from HomeScreen). */
  notificationOpen?: boolean;
  onNotificationOpenChange?: (open: boolean) => void;
  onNotificationNavigate?: (link: string) => void;
}

function greetingForHour(hour: number) {
  return {
    en: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    ar: hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء الخير",
  };
}

const HomeHeader = ({ patientName, patientNameAr, onProfile, menuItems, phase, notificationOpen, onNotificationOpenChange, onNotificationNavigate }: HomeHeaderProps) => {
  const { showEn, showAr } = useLanguage();
  const dateStr = new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
  const greeting = greetingForHour(new Date().getHours());
  const profileInitial = patientNameAr?.[0] || patientName?.[0] || "م";

  return (
    <div
      className="relative px-5 pt-3 pb-20 overflow-hidden"
      style={{
        background:
          "linear-gradient(155deg, var(--header-teal-from) 0%, var(--header-teal-to) 60%, #003B47 100%)",
      }}
    >
      {/* Decorative concentric rings */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(197,150,90,0.18)" }}
      />
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(197,150,90,0.08)" }}
      />
      {/* Subtle gold glow */}
      <span
        className="absolute -top-8 right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(197,150,90,0.16), transparent)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <RufayQWordmark size="sm" variant="light" />
          <div className="flex items-center gap-2">
            <NotificationCenter
              color="#fff"
              open={notificationOpen}
              onOpenChange={onNotificationOpenChange}
              onNavigate={onNotificationNavigate}
            />
            <HeaderMenu items={menuItems} />
            <button
              onClick={onProfile}
              className="w-9 h-9 rounded-full flex items-center justify-center font-arabic text-sm font-bold btn-press"
              style={{
                background: "linear-gradient(140deg, var(--gold), #B07A3A)",
                color: "#fff",
                boxShadow: "0 4px 12px -4px rgba(197,150,90,0.55)",
              }}
            >
              {profileInitial}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: "var(--gold)" }}
          />
          <p
            className="font-mono text-[10px] tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {dateStr}
          </p>
        </div>
        {showEn && (
          <p className="font-display text-[22px] italic text-white leading-tight" style={{ fontWeight: 300 }}>
            {patientName ? `${greeting.en}, ${patientName}` : `${greeting.en} 👋`}
          </p>
        )}
        {showAr && (
          <p
            className="font-arabic text-[13px] mt-0.5"
            dir="rtl"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {patientNameAr || patientName ? `${greeting.ar}، ${patientNameAr || patientName}` : `${greeting.ar} 👋`}
          </p>
        )}
      </div>

      {/* Phase ribbon embedded near the bottom edge of the hero */}
      {phase && (
        <div
          className="absolute left-5 right-5 z-10"
          style={{ bottom: 14 }}
        >
          <PhaseRibbon current={phase} variant="ondark" />
        </div>
      )}
    </div>
  );
};

export default HomeHeader;
