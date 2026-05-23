import { useMemo, useState } from "react";
import { Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import { CreditCard, Wallet, LogOut, UserCircle2 } from "lucide-react";


import { usePatientName } from "@/hooks/usePatientName";
import { useJourneyOverview } from "@/hooks/useJourneyOverview";
import { useJourneys } from "@/hooks/useJourneys";
// useMedicalRecords removed — record count now comes from useUnifiedRecordCount.
import { useUnifiedRecordCount } from "@/hooks/useUnifiedRecordCount";
import { useAuthSession } from "@/hooks/useAuthUserId";
import { useLanguage } from "@/contexts/LanguageContext";

import HomeHeader, { type HomeHeaderMenuItem } from "@/components/home/HomeHeader";
import TodayCard from "@/components/home/TodayCard";
import JourneyConstellation from "@/components/home/JourneyConstellation";
import AlertsStack from "@/components/home/AlertsStack";
import QuickActionsGrid from "@/components/home/QuickActionsGrid";
import HomeStatsGrid from "@/components/home/HomeStatsGrid";
import { derivePhase } from "@/components/home/journeyPhase";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";

interface HomeScreenProps {
  onNavigate: (tab: string, context?: string) => void;
  onProfile: () => void;
  isGuest?: boolean;
}

const HomeScreen = ({ onNavigate, onProfile, isGuest = false }: HomeScreenProps) => {
  const { patientName, patientNameAr } = usePatientName();
  const { showEn, showAr } = useLanguage();
  const overview = useJourneyOverview({ isGuest });
  const { journeys } = useJourneys(isGuest ? [] : []);
  // (medical records list is no longer needed here — count comes from useUnifiedRecordCount)
  const { userId: authUserId, isReady: authReady } = useAuthSession();
  // Single source-of-truth count: same merger the Records Travel chip and
  // the picker use, so Home/Records/Picker can never disagree.
  const unifiedRecords = useUnifiedRecordCount({
    userId: authUserId,
    enabled: isGuest || authReady,
  });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const {
    activeTrip, milestones, alerts, dayN, totalDays, upcomingAppointments,
  } = overview;
  const phase = activeTrip ? derivePhase(dayN, totalDays) : undefined;

  // While auth is still restoring, surface a placeholder ("—") instead of
  // hard zeros so signed-in users don't see a misleading empty dashboard.
  const dataReady = isGuest || authReady;
  const stats = useMemo(() => ({
    trips: dataReady ? (journeys.length || (activeTrip ? 1 : 0)) : null,
    reminders: dataReady ? alerts.length : null,
    // Keep the dashboard stable while the canonical records API hydrates.
    // This avoids the visible 4→7 hesitation when transport rows + lounge cache
    // finish after local scanned records.
    records: dataReady && !unifiedRecords.isLoading ? unifiedRecords.total : null,
    plannedAhead: dataReady ? upcomingAppointments.length : null,
  }), [dataReady, journeys.length, activeTrip, alerts.length, unifiedRecords.total, unifiedRecords.isLoading, upcomingAppointments.length]);

  // Default selection: the "current" milestone (or first upcoming, then first).
  const defaultSelectedId = useMemo(() => {
    return (
      milestones.find((m) => m.state === "current")?.id ??
      milestones.find((m) => m.state === "upcoming")?.id ??
      milestones[0]?.id ??
      null
    );
  }, [milestones]);

  const homeMenuItems: HomeHeaderMenuItem[] = [
    { icon: <RefreshCw size={14} />, label: "Refresh", labelAr: "تحديث", onClick: () => { window.location.reload(); } },
    { icon: <Bell size={14} />, label: "Notifications", labelAr: "الإشعارات",
      onClick: () => setNotificationOpen(true) },
    { icon: <UserCircle2 size={14} />, label: "Profile", labelAr: "الملف الشخصي",
      onClick: () => onProfile() },
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
    { icon: <LogOut size={14} />, label: "Log Out", labelAr: "تسجيل الخروج", onClick: () => onNavigate("logout") },
  ];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      <HomeHeader
        patientName={patientName}
        patientNameAr={patientNameAr}
        onProfile={onProfile}
        menuItems={homeMenuItems}
        phase={phase}
        notificationOpen={notificationOpen}
        onNotificationOpenChange={setNotificationOpen}
        onNotificationNavigate={(link) => onNavigate(link)}
      />

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 -mt-8 pb-6 space-y-3 relative z-10"
        style={{ background: "transparent", WebkitOverflowScrolling: "touch" }}
      >
        <HomeStatsGrid
          trips={stats.trips}
          reminders={stats.reminders}
          records={stats.records}
          plannedAhead={stats.plannedAhead}
          onNavigate={(tab) => onNavigate(tab)}
        />

        {!isGuest && <ProfileCompletionBanner onOpenProfile={onProfile} />}

        <TodayCard
          overview={overview}
          onOpenJourney={() => onNavigate("journey", "view")}
          onPlanFirstTrip={() => onNavigate("journey", "new-trip")}
        />

        {activeTrip && (
          <JourneyConstellation
            milestones={milestones}
            selectedId={defaultSelectedId}
            onSelect={(id) => onNavigate("journey", `milestone:${id}`)}
            departureDate={activeTrip.departureDate}
            returnDate={activeTrip.returnDate}
          />
        )}

        <QuickActionsGrid onNavigate={onNavigate} />

        <AlertsStack alerts={alerts} onOpenRecords={() => onNavigate("records")} />
      </div>
    </div>
  );
};

export default HomeScreen;

