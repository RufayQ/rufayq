import { useMemo, useState } from "react";
import { Copy, Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import { CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";

import { usePatientName } from "@/hooks/usePatientName";
import { useJourneyOverview } from "@/hooks/useJourneyOverview";

import HomeHeader, { type HomeHeaderMenuItem } from "@/components/home/HomeHeader";
import TodayCard from "@/components/home/TodayCard";
import JourneyConstellation from "@/components/home/JourneyConstellation";
import MilestoneDetailSheet from "@/components/home/MilestoneDetailSheet";
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
  const {
    activeTrip, milestones, alerts, dayN, totalDays,
    nextAppointment, nextMedication,
  } = overview;
  const phase = activeTrip ? derivePhase(dayN, totalDays) : undefined;

  // Default selection: the "current" milestone (or first upcoming).
  const defaultSelectedId = useMemo(() => {
    return (
      milestones.find((m) => m.state === "current")?.id ??
      milestones.find((m) => m.state === "upcoming")?.id ??
      milestones[0]?.id ??
      null
    );
  }, [milestones]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId ?? defaultSelectedId;
  const selectedMilestone = milestones.find((m) => m.id === effectiveSelectedId) ?? null;

  // Build sub-items for the detail sheet from the next appointment + medication.
  const sheetItems = useMemo(() => {
    const items: { id: string; label: string; sub?: string; tag?: string; tone?: "active" | "now" | "muted" }[] = [];
    if (nextAppointment) {
      items.push({
        id: `apt-${nextAppointment.id}`,
        label: `${nextAppointment.specialty || "Appointment"} · ${nextAppointment.doctorName || ""}`.trim(),
        sub: `${nextAppointment.date} · ${nextAppointment.time}`,
        tag: "Now",
        tone: "now",
      });
    }
    if (nextMedication) {
      items.push({
        id: `med-${nextMedication.id}`,
        label: nextMedication.name,
        sub: nextMedication.frequency,
        tag: "Active",
        tone: "active",
      });
    }
    return items;
  }, [nextAppointment, nextMedication]);

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
          <>
            <JourneyConstellation
              milestones={milestones}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
              departureDate={activeTrip.departureDate}
              returnDate={activeTrip.returnDate}
            />
            <MilestoneDetailSheet
              milestone={selectedMilestone}
              items={sheetItems}
              onOpen={() =>
                onNavigate("journey", selectedMilestone ? `milestone:${selectedMilestone.id}` : "view")
              }
            />
          </>
        )}

        <QuickActionsGrid onNavigate={onNavigate} />

        <AlertsStack alerts={alerts} onOpenRecords={() => onNavigate("records")} />
      </div>
    </div>
  );
};

export default HomeScreen;

