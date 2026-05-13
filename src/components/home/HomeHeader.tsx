import RufayQWordmark from "@/components/RufayQWordmark";
import HeaderMenu from "@/components/HeaderMenu";
import NotificationBell from "@/components/NotificationBell";
import type { ReactNode } from "react";

export interface HomeHeaderMenuItem {
  icon: ReactNode;
  label: string;
  labelAr: string;
  onClick: () => void;
}

interface Props {
  patientName: string;
  patientNameAr: string;
  onProfile: () => void;
  menuItems: HomeHeaderMenuItem[];
}

const HomeHeader = ({ patientName, patientNameAr, onProfile, menuItems }: Props) => {
  const dateStr = new Date()
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
  const hour = new Date().getHours();
  const greetEn = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetAr = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء الخير";

  return (
    <div
      className="relative px-5 pt-3 pb-16 overflow-hidden"
      style={{ background: "linear-gradient(145deg, var(--header-teal-from), var(--header-teal-to))" }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.15)" }} />
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.08)" }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <RufayQWordmark size="sm" variant="light" />
          <div className="flex items-center gap-2">
            <NotificationBell color="#fff" />
            <HeaderMenu items={menuItems} />
            <button
              onClick={onProfile}
              className="w-9 h-9 rounded-full flex items-center justify-center font-arabic text-sm font-bold btn-press"
              style={{ background: "var(--gold)", color: "#fff" }}
            >
              م
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{dateStr}</p>
        <p className="font-display text-xl italic text-white" style={{ fontWeight: 300 }}>
          {patientName ? `${greetEn}, ${patientName}` : `${greetEn} 👋`}
        </p>
        <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>
          {patientNameAr || patientName ? `${greetAr}، ${patientNameAr || patientName}` : `${greetAr} 👋`}
        </p>
      </div>
    </div>
  );
};

export default HomeHeader;
