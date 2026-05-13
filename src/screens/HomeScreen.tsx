import { Copy, Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import { CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";

import { usePatientName } from "@/hooks/usePatientName";
import { useJourneyOverview } from "@/hooks/useJourneyOverview";

import HomeHeader, { type HomeHeaderMenuItem } from "@/components/home/HomeHeader";
import TodayCard from "@/components/home/TodayCard";
import MiniHelicopterStrip from "@/components/home/MiniHelicopterStrip";
import AlertsStack from "@/components/home/AlertsStack";
import QuickActionsGrid from "@/components/home/QuickActionsGrid";
import { derivePhase } from "@/components/home/journeyPhase";

interface HomeScreenProps {
  onNavigate: (tab: string, context?: string) => void;
  onProfile: () => void;
  isGuest?: boolean;
}

const HomeScreen = ({ onNavigate, onProfile, isGuest = false }: HomeScreenProps) => {
  const { patientName, patientNameAr } = usePatientName();
  const overview = useJourneyOverview({ isGuest });
  const { activeTrip, milestones, alerts, dayN, totalDays } = overview;
  const phase = activeTrip ? derivePhase(dayN, totalDays) : undefined;

  const homeMenuItems: HomeHeaderMenuItem[] = [
    { icon: <RefreshCw size={14} />, label: "Refresh", labelAr: "تحديث", onClick: () => { window.location.reload(); } },
    { icon: <Bell size={14} />, label: "Notifications", labelAr: "الإشعارات",
      onClick: () => { toast("Notifications · الإشعارات", { description: "All notifications are up to date · جميع الإشعارات محدّثة" }); } },
    { icon: <Copy size={14} />, label: "Copy Summary", labelAr: "نسخ الملخص",
      onClick: () => {
        const summary = `Active Trip: ${activeTrip?.destination ?? "—"}`;
        navigator.clipboard.writeText(`RufayQ – Trip Summary\n${summary}`);
        toast("Copied · تم النسخ");
      } },
    { icon: <Share2 size={14} />, label: "Share App", labelAr: "مشاركة التطبيق",
      onClick: () => {
        const url = window.location.origin;
        const msg = encodeURIComponent(`Check out RufayQ – your medical travel companion!\nجرّب رُفَيِّق – رفيقك في الرحلة العلاجية\n${url}`);
        window.open(`https://wa.me/?text=${msg}`, "_blank");
      } },
    { icon: <CreditCard size={14} />, label: "Subscriptions & Payment", labelAr: "الاشتراكات والدفع", onClick: () => onNavigate("pricing") },
    { icon: <Wallet size={14} />, label: "Wallet & Refunds", labelAr: "المحفظة والاستردادات", onClick: () => onNavigate("wallet") },
    { icon: <Settings size={14} />, label: "Settings", labelAr: "الإعدادات", onClick: () => onNavigate("settings") },
    { icon: <HelpCircle size={14} />, label: "Help & Support", labelAr: "المساعدة", onClick: () => onNavigate("support") },
  ];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      <HomeHeader
        patientName={patientName}
        patientNameAr={patientNameAr}
        onProfile={onProfile}
        menuItems={homeMenuItems}
        phase={phase}
      />

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 -mt-8 pb-6 space-y-3 relative z-10"
        style={{ background: "transparent", WebkitOverflowScrolling: "touch" }}
      >
        <TodayCard
          overview={overview}
          onOpenJourney={() => onNavigate("journey", "view")}
          onPlanFirstTrip={() => onNavigate("journey", "new-trip")}
        />

        {activeTrip && (
          <MiniHelicopterStrip
            milestones={milestones}
            onSelect={(milestoneId) => onNavigate("journey", `milestone:${milestoneId}`)}
          />
        )}

        <QuickActionsGrid onNavigate={onNavigate} />

        <AlertsStack alerts={alerts} onOpenRecords={() => onNavigate("records")} />
      </div>
    </div>
  );
};

export default HomeScreen;
