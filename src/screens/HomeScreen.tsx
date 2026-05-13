import { useMemo } from "react";
import { Copy, Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import { CreditCard, Wallet, MapPin, Video, Building2 } from "lucide-react";
import { toast } from "sonner";
import { medications, appointments } from "@/constants/data";
import type { TripData } from "@/components/AddTripSheet";

import { useJourneys } from "@/hooks/useJourneys";
import { usePatientName } from "@/hooks/usePatientName";

import HomeHeader, { type HomeHeaderMenuItem } from "@/components/home/HomeHeader";
import EmptyJourneyCard from "@/components/home/EmptyJourneyCard";
import ActiveTripCard from "@/components/home/ActiveTripCard";
import OtherJourneysList from "@/components/home/OtherJourneysList";
import DischargeAlertBanner from "@/components/home/DischargeAlertBanner";
import UpcomingAppointmentsList from "@/components/home/UpcomingAppointmentsList";
import TodayMedicationsList from "@/components/home/TodayMedicationsList";
import QuickActionsGrid from "@/components/home/QuickActionsGrid";

function daysBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

function formatDate(iso?: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface HomeScreenProps {
  onNavigate: (tab: string, context?: string) => void;
  onProfile: () => void;
  isGuest?: boolean;
}

// Guest-only seed: gives demo users a populated home without persisting anything.
const guestTrip: TripData = {
  id: "guest-trip-1",
  destination: "Berlin, DE",
  hospital: "Charité Hospital",
  specialty: "Orthopedic Surgery",
  specialtyEmoji: "🦴",
  departureDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  treatingDoctor: "Dr. Müller",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active",
  outboundFlight: null,
  returnFlight: null,
};

const HomeScreen = ({ onNavigate, onProfile, isGuest = false }: HomeScreenProps) => {
  const { patientName, patientNameAr } = usePatientName();
  const { journeys } = useJourneys(isGuest ? [guestTrip] : []);

  // Prefer active over upcoming so an active trip always wins.
  const activeTrip = useMemo(
    () =>
      journeys.find((j) => j.status === "active") ??
      journeys.find((j) => j.status === "upcoming") ??
      null,
    [journeys],
  );
  const otherTrips = useMemo(
    () => journeys.filter((j) => j.id !== activeTrip?.id).slice(0, 3),
    [journeys, activeTrip?.id],
  );

  const journeyCount = journeys.length;
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const totalDays = daysBetween(activeTrip?.departureDate, activeTrip?.returnDate);
  const dayNRaw = daysBetween(activeTrip?.departureDate, todayIso);
  const dayN =
    dayNRaw == null ? null : totalDays != null ? Math.min(dayNRaw, totalDays) : dayNRaw;
  const daysLeft =
    totalDays != null && dayN != null ? Math.max(0, totalDays - dayN) : null;
  const progressPct =
    totalDays && totalDays > 0 && dayN != null
      ? Math.max(8, Math.min(100, Math.round((dayN / totalDays) * 100)))
      : 20;
  const formattedDepartureDate = formatDate(activeTrip?.departureDate);
  const formattedReturnDate = formatDate(activeTrip?.returnDate);

  const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];
  const upcomingAppts = isGuest ? appointments.filter((_, i) => i < 2) : [];

  const medicationSummary = todayMeds.length
    ? todayMeds.map((m) => `${m.name} (${m.status})`).join(", ")
    : "No medications scheduled today";

  const homeMenuItems: HomeHeaderMenuItem[] = [
    { icon: <RefreshCw size={14} />, label: "Refresh", labelAr: "تحديث", onClick: () => { window.location.reload(); } },
    { icon: <Bell size={14} />, label: "Notifications", labelAr: "الإشعارات",
      onClick: () => { toast("Notifications · الإشعارات", { description: "All notifications are up to date · جميع الإشعارات محدّثة" }); } },
    { icon: <Copy size={14} />, label: "Copy Summary", labelAr: "نسخ الملخص",
      onClick: () => {
        const text = `RufayQ – Home Summary\nActive Trip: ${activeTrip?.destination ?? "—"}\nMedications: ${medicationSummary}`;
        navigator.clipboard.writeText(text);
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
      />

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 -mt-8 pb-6 space-y-3 relative z-10"
        style={{ background: "transparent", WebkitOverflowScrolling: "touch" }}
      >
        {!activeTrip ? (
          <EmptyJourneyCard onAddTrip={() => onNavigate("journey", "new-trip")} />
        ) : (
          <>
            <ActiveTripCard
              trip={activeTrip}
              journeyCount={journeyCount}
              daysLeft={daysLeft}
              progressPct={progressPct}
              formattedDepartureDate={formattedDepartureDate}
              formattedReturnDate={formattedReturnDate}
              onViewJourney={() => onNavigate("journey", "view")}
              onNewTrip={() => onNavigate("journey", "new-trip")}
            />
            <OtherJourneysList trips={otherTrips} onSelect={() => onNavigate("journey", "view")} />
          </>
        )}

        <DischargeAlertBanner onClick={() => onNavigate("records")} />

        <UpcomingAppointmentsList
          appointments={upcomingAppts}
          onSelect={() => onNavigate("journey", "view")}
          onViewAll={() => onNavigate("journey", "view")}
        />

        <TodayMedicationsList medications={todayMeds} onViewAll={() => onNavigate("medications")} />

        <QuickActionsGrid onNavigate={onNavigate} />

        {/* Upcoming Reminders — small, single-use; kept inline */}
        <div className="stagger-5">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>UPCOMING REMINDERS</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            {[
              { emoji: "📅", en: "30-Day Follow-up — Riyadh", ar: "متابعة ٣٠ يوم — الرياض", date: "May 15", color: "var(--gold)" },
              { emoji: "✈️", en: "Return Flight — Berlin → Riyadh", ar: "رحلة العودة", date: "Apr 15", color: "var(--teal-deep)" },
              { emoji: "💊", en: "Next Medication Due", ar: "الجرعة القادمة", date: "8:00 PM", color: "var(--warning)" },
            ].map((r, i) => (
              <div key={i}>
                {i > 0 && <div className="mx-4 h-px" style={{ background: "var(--gray-light)" }} />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: "var(--navy)" }}>{r.en}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{r.ar}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: r.color }}>{r.date}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-2 py-2.5 rounded-xl text-xs font-medium btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
            + Add reminder<span className="font-arabic"> · إضافة تذكير</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
