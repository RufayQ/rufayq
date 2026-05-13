import { MapPin, Video, Building2 } from "lucide-react";
import type { Appointment } from "@/constants/data";

interface Props {
  appointments: Appointment[];
  onSelect: (appt: Appointment) => void;
  onViewAll: () => void;
}

const UpcomingAppointmentsList = ({ appointments, onSelect, onViewAll }: Props) => (
  <div className="stagger-3">
    <div className="flex items-center justify-between mb-2">
      <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>UPCOMING APPOINTMENTS</p>
      <button onClick={onViewAll} className="text-[10px] btn-press" style={{ color: "var(--teal-mid)" }}>View all →</button>
    </div>
    {appointments.length === 0 ? (
      <div
        className="rounded-xl p-3 text-center"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      >
        <p className="text-[12px]" style={{ color: "var(--gray)" }}>No upcoming appointments</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد مواعيد قادمة</p>
      </div>
    ) : (
      <div className="space-y-2">
        {appointments.map((apt) => (
          <button
            key={apt.id}
            onClick={() => onSelect(apt)}
            className="w-full rounded-xl p-3 flex items-center gap-3 text-left card-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: apt.type === "telemedicine" ? "var(--teal-light)" : "var(--gold-pale)" }}
            >
              {apt.type === "telemedicine"
                ? <Video size={16} style={{ color: "var(--teal-deep)" }} />
                : apt.type === "clinic"
                  ? <Building2 size={16} style={{ color: "var(--gold)" }} />
                  : <MapPin size={16} style={{ color: "var(--success)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{apt.doctorName}</p>
              <p className="text-[10px]" style={{ color: "var(--gray)" }}>{apt.specialty} · {apt.date}</p>
            </div>
            <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--teal-deep)" }}>{apt.time}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default UpcomingAppointmentsList;
