import { useState } from "react";
import { X, Camera, ChevronRight } from "lucide-react";
import RufayQLogo from "./RufayQLogo";
import { toast } from "sonner";

export interface AppointmentFormData {
  appointmentType: "physician" | "lab" | "radiology";
  visitType: "in-person" | "telemedicine" | "clinic";
  specialty: string;
  doctorName: string;
  doctorNameAr: string;
  hospital: string;
  hospitalAr: string;
  location: string;
  locationAr: string;
  date: string;
  time: string;
  notes: string;
  notesAr: string;
}

const specialties = [
  { en: "Orthopedics", ar: "جراحة العظام", emoji: "🦴" },
  { en: "Cardiology", ar: "أمراض القلب", emoji: "❤️" },
  { en: "Neurology", ar: "الأعصاب", emoji: "🧠" },
  { en: "Physiotherapy", ar: "العلاج الطبيعي", emoji: "🏋️" },
  { en: "Oncology", ar: "الأورام", emoji: "🔬" },
  { en: "Dermatology", ar: "الجلدية", emoji: "🧴" },
  { en: "Ophthalmology", ar: "العيون", emoji: "👁️" },
  { en: "General Surgery", ar: "الجراحة العامة", emoji: "🔪" },
  { en: "Internal Medicine", ar: "الباطنية", emoji: "🩺" },
  { en: "Urology", ar: "المسالك البولية", emoji: "💧" },
  { en: "ENT", ar: "الأنف والأذن والحنجرة", emoji: "👂" },
  { en: "Dental", ar: "الأسنان", emoji: "🦷" },
];

const AppointmentFormSheet = ({ open, onClose, onSubmit, onScan }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => void;
  onScan?: () => void;
}) => {
  const [step, setStep] = useState(1);
  const [appointmentType, setAppointmentType] = useState<"physician" | "lab" | "radiology" | "">("");
  const [visitType, setVisitType] = useState<"in-person" | "telemedicine" | "clinic">("in-person");
  const [specialty, setSpecialty] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorNameAr, setDoctorNameAr] = useState("");
  const [hospital, setHospital] = useState("");
  const [hospitalAr, setHospitalAr] = useState("");
  const [location, setLocation] = useState("");
  const [locationAr, setLocationAr] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [notesAr, setNotesAr] = useState("");
  const [aiExtracting, setAiExtracting] = useState(false);

  if (!open) return null;

  const handleAiScan = () => {
    setAiExtracting(true);
    // Simulate AI extraction
    setTimeout(() => {
      setAppointmentType("physician");
      setVisitType("in-person");
      setSpecialty("Orthopedics");
      setDoctorName("Dr. Klaus Mueller");
      setDoctorNameAr("د. كلاوس مولر");
      setHospital("Charité Hospital");
      setHospitalAr("مستشفى شاريتيه");
      setLocation("Charitéplatz 1, Berlin");
      setLocationAr("ساحة شاريتيه ١، برلين");
      setDate("2026-04-25");
      setTime("10:00");
      setNotes("Follow-up appointment post-surgery");
      setNotesAr("موعد متابعة بعد العملية");
      setAiExtracting(false);
      setStep(4); // Jump to review
      toast.success("AI extracted appointment details · استخرج الذكاء الاصطناعي تفاصيل الموعد");
    }, 2000);
  };

  const handleSubmit = () => {
    if (!appointmentType || !date || !time) {
      toast.error("Please fill required fields · يرجى ملء الحقول المطلوبة");
      return;
    }
    onSubmit({
      appointmentType: appointmentType as any,
      visitType,
      specialty,
      doctorName,
      doctorNameAr,
      hospital,
      hospitalAr,
      location,
      locationAr,
      date,
      time,
      notes,
      notesAr,
    });
    onClose();
  };

  const stepTitle = [
    "", "Select Type", "Details", "Date & Time", "Review"
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div className="relative animate-slide-up rounded-t-3xl overflow-y-auto" style={{ background: "var(--white)", maxHeight: "90%" }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10" style={{ background: "var(--white)" }}>
          <div className="flex justify-center pt-3"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>
          <div className="px-5 pt-3 pb-2 flex items-center justify-between">
            <div>
              <p className="font-display text-lg" style={{ color: "var(--navy)" }}>
                {step === 4 ? "Review Appointment" : stepTitle[step]}
              </p>
              <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>
                {step === 1 ? "اختر نوع الموعد" : step === 2 ? "تفاصيل الموعد" : step === 3 ? "التاريخ والوقت" : "مراجعة الموعد"}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--off-white)" }}>
              <X size={16} style={{ color: "var(--gray)" }} />
            </button>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5 px-5 pb-3">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 h-1 rounded-full" style={{ background: s <= step ? "var(--teal-deep)" : "var(--gray-light)" }} />
            ))}
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* AI Scan Button */}
          {step === 1 && (
            <button onClick={handleAiScan} disabled={aiExtracting}
              className="w-full rounded-xl p-4 flex items-center gap-3 card-press"
              style={{ background: "linear-gradient(135deg, var(--navy), var(--teal-deep))", opacity: aiExtracting ? 0.7 : 1 }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                {aiExtracting ? (
                  <div className="w-5 h-5 rounded-full" style={{ border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                ) : (
                  <RufayQLogo size={24} variant="light" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-semibold text-white">
                  {aiExtracting ? "Extracting with AI..." : "Smart Scan with RufayQ AI"}
                </p>
                <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {aiExtracting ? "جاري الاستخراج..." : "امسح وصفة أو موعد — سيستخرج الذكاء الاصطناعي التفاصيل"}
                </p>
              </div>
              <Camera size={18} color="var(--gold)" />
            </button>
          )}

          {/* STEP 1: Type Selection */}
          {step === 1 && (
            <>
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>APPOINTMENT TYPE · نوع الموعد</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "physician", emoji: "🩺", en: "Physician", ar: "طبيب" },
                  { value: "lab", emoji: "🔬", en: "Laboratory", ar: "مختبر" },
                  { value: "radiology", emoji: "🩻", en: "Radiology", ar: "أشعة" },
                ].map(t => (
                  <button key={t.value} onClick={() => { setAppointmentType(t.value as any); setStep(2); }}
                    className="rounded-xl py-4 flex flex-col items-center gap-1.5 card-press"
                    style={{ background: appointmentType === t.value ? "var(--teal-light)" : "var(--off-white)", border: appointmentType === t.value ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}>
                    <span className="text-[28px]">{t.emoji}</span>
                    <span className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{t.en}</span>
                    <span className="font-arabic text-[10px]" style={{ color: "var(--gray)" }}>{t.ar}</span>
                  </button>
                ))}
              </div>

              <p className="font-mono text-[9px] tracking-widest mt-2" style={{ color: "var(--gold)" }}>VISIT TYPE · نوع الزيارة</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "in-person", emoji: "🏥", en: "Hospital", ar: "مستشفى" },
                  { value: "clinic", emoji: "🏢", en: "Clinic", ar: "عيادة" },
                  { value: "telemedicine", emoji: "💻", en: "Telemedicine", ar: "عن بُعد" },
                ].map(t => (
                  <button key={t.value} onClick={() => setVisitType(t.value as any)}
                    className="rounded-xl py-3 flex flex-col items-center gap-1 card-press"
                    style={{ background: visitType === t.value ? "var(--teal-light)" : "var(--off-white)", border: visitType === t.value ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}>
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-[10px] font-bold" style={{ color: "var(--navy)" }}>{t.en}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 2: Details */}
          {step === 2 && (
            <>
              {/* Specialty (only for physician) */}
              {appointmentType === "physician" && (
                <div>
                  <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>SPECIALTY · التخصص</p>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {specialties.map(s => (
                      <button key={s.en} onClick={() => setSpecialty(s.en)}
                        className="rounded-lg py-2 flex flex-col items-center gap-0.5 card-press"
                        style={{ background: specialty === s.en ? "var(--teal-light)" : "var(--off-white)", border: specialty === s.en ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}>
                        <span className="text-lg">{s.emoji}</span>
                        <span className="text-[9px] font-bold" style={{ color: "var(--navy)" }}>{s.en}</span>
                        <span className="font-arabic text-[8px]" style={{ color: "var(--gray)" }}>{s.ar}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>
                  {appointmentType === "physician" ? "DOCTOR · الطبيب" : appointmentType === "lab" ? "LAB NAME · المختبر" : "FACILITY · المنشأة"}
                </p>
                <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder={appointmentType === "physician" ? "Dr. Name..." : "Facility name..."}
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
                <input value={doctorNameAr} onChange={e => setDoctorNameAr(e.target.value)} placeholder="الاسم بالعربية (اختياري)" dir="rtl"
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none mt-2 font-arabic" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>

              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>HOSPITAL / FACILITY · المستشفى</p>
                <input value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Hospital name..."
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>

              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>LOCATION · الموقع</p>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address..."
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>
            </>
          )}

          {/* STEP 3: Date & Time */}
          {step === 3 && (
            <>
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>DATE · التاريخ</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>TIME · الوقت</p>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>NOTES · ملاحظات</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={3}
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none resize-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>
            </>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <>
              <div className="rounded-xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>APPOINTMENT SUMMARY</p>
                {[
                  { label: "Type", value: `${appointmentType} · ${visitType}` },
                  ...(specialty ? [{ label: "Specialty", value: specialty }] : []),
                  { label: appointmentType === "physician" ? "Doctor" : "Facility", value: doctorName || "—" },
                  { label: "Hospital", value: hospital || "—" },
                  { label: "Location", value: location || "—" },
                  { label: "Date", value: date || "—" },
                  { label: "Time", value: time || "—" },
                  ...(notes ? [{ label: "Notes", value: notes }] : []),
                ].map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? "1px solid var(--gray-light)" : "none" }}>
                    <p className="text-[11px]" style={{ color: "var(--gray)" }}>{r.label}</p>
                    <p className="text-[11px] font-semibold text-right max-w-[60%]" style={{ color: "var(--navy)" }}>{r.value}</p>
                  </div>
                ))}
              </div>

              {/* AI badge */}
              <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.2)" }}>
                <RufayQLogo size={16} variant="dark" />
                <p className="text-[10px]" style={{ color: "var(--teal-deep)" }}>Generated by RufayQ AI · تم الإنشاء بواسطة رُفَيِّق</p>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl text-[13px] font-medium btn-press"
                style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
                Back · رجوع
              </button>
            )}
            {step < 4 && step > 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white btn-press"
                style={{ background: "var(--teal-deep)" }}>
                Next · التالي
              </button>
            ) : step === 4 ? (
              <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 btn-press"
                style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
                <RufayQLogo size={14} variant="light" />
                Confirm · تأكيد
              </button>
            ) : null}
          </div>

          <button onClick={onClose} className="w-full py-2 text-[12px] btn-press" style={{ color: "var(--gray)" }}>
            Cancel · إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentFormSheet;
