import { Briefcase, Bell, FolderOpen, CalendarCheck } from "lucide-react";

interface StatItem {
  key: string;
  icon: React.ReactNode;
  value: number;
  en: string;
  ar: string;
  color: string;
  onClick?: () => void;
}

interface Props {
  trips: number;
  reminders: number;
  records: number;
  plannedAhead: number;
  onNavigate: (tab: string) => void;
}

/**
 * 4-up at-a-glance stats grid for the Home screen.
 * Trips logged · Active reminders · Records & artefacts · Planned ahead.
 */
const HomeStatsGrid = ({ trips, reminders, records, plannedAhead, onNavigate }: Props) => {
  const items: StatItem[] = [
    {
      key: "trips", icon: <Briefcase size={18} />, value: trips,
      en: "Trips logged", ar: "رحلات", color: "var(--teal-deep)",
      onClick: () => onNavigate("journey"),
    },
    {
      key: "reminders", icon: <Bell size={18} />, value: reminders,
      en: "Active reminders", ar: "تنبيهات", color: "var(--gold)",
      onClick: () => onNavigate("medications"),
    },
    {
      key: "records", icon: <FolderOpen size={18} />, value: records,
      en: "Records & artefacts", ar: "سجلات وملفات", color: "var(--teal-bright)",
      onClick: () => onNavigate("records"),
    },
    {
      key: "ahead", icon: <CalendarCheck size={18} />, value: plannedAhead,
      en: "Planned ahead", ar: "مهام قادمة", color: "var(--success)",
      onClick: () => onNavigate("journey"),
    },
  ];

  return (
    <section aria-label="At a glance · نظرة سريعة" className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={it.onClick}
          className="flex flex-col items-start gap-1 rounded-2xl p-3 text-left btn-press outline-none focus:ring-2"
          style={{
            background: "var(--white)",
            border: "1px solid rgba(0,77,91,0.08)",
            boxShadow: "0 2px 8px rgba(0,77,91,0.06)",
          }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: `${it.color}1A`, color: it.color }}
            aria-hidden="true"
          >
            {it.icon}
          </span>
          <span className="text-[22px] font-bold leading-none" style={{ color: "var(--navy)" }}>
            {it.value}
          </span>
          <span className="block text-[11px] font-semibold" style={{ color: "var(--navy)" }}>
            {it.en}
          </span>
          <span className="font-arabic block text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
            {it.ar}
          </span>
        </button>
      ))}
    </section>
  );
};

export default HomeStatsGrid;
