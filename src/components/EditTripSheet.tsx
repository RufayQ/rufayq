import { useState, useEffect } from "react";
import { X, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { TripData } from "./AddTripSheet";

interface EditTripSheetProps {
  open: boolean;
  trip: TripData | null;
  onClose: () => void;
  onSave: (trip: TripData) => void;
}

const EditTripSheet = ({ open, trip, onClose, onSave }: EditTripSheetProps) => {
  const [destination, setDestination] = useState("");
  const [hospital, setHospital] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [doctor, setDoctor] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [insuranceRef, setInsuranceRef] = useState("");

  useEffect(() => {
    if (trip) {
      setDestination(trip.destination);
      setHospital(trip.hospital);
      setSpecialty(trip.specialty);
      setDoctor(trip.treatingDoctor);
      setDepartureDate(trip.departureDate);
      setReturnDate(trip.returnDate);
      setCompanionName(trip.companionName);
      setInsuranceRef(trip.insuranceRef);
    }
  }, [trip]);

  if (!open || !trip) return null;

  const handleSave = () => {
    if (!destination.trim() || !hospital.trim()) {
      toast.error("Destination and hospital required");
      return;
    }
    onSave({
      ...trip,
      destination: destination.trim(),
      hospital: hospital.trim(),
      specialty: specialty.trim(),
      treatingDoctor: doctor.trim(),
      departureDate, returnDate,
      companionName: companionName.trim(),
      companion: !!companionName.trim(),
      insuranceRef: insuranceRef.trim(),
    });
    toast.success("Trip updated · تم تحديث الرحلة");
    onClose();
  };

  const Field = ({ label, labelAr, value, onChange, placeholder, type = "text" }: any) => (
    <div>
      <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
        {label} · <span className="font-arabic">{labelAr}</span>
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
        style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
      />
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col"
        style={{ background: "var(--white)", maxHeight: "88%" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 shrink-0">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <MapPin size={18} style={{ color: "var(--teal-deep)" }} /> Edit Trip
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الرحلة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <Field label="DESTINATION" labelAr="الوجهة" value={destination} onChange={setDestination} placeholder="Berlin, Germany" />
          <Field label="HOSPITAL" labelAr="المستشفى" value={hospital} onChange={setHospital} placeholder="Charité Hospital" />
          <Field label="SPECIALTY" labelAr="التخصص" value={specialty} onChange={setSpecialty} placeholder="Orthopedics" />
          <Field label="TREATING DOCTOR" labelAr="الطبيب المعالج" value={doctor} onChange={setDoctor} placeholder="Dr. Mueller" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="DEPARTURE" labelAr="المغادرة" value={departureDate} onChange={setDepartureDate} type="date" />
            <Field label="RETURN" labelAr="العودة" value={returnDate} onChange={setReturnDate} type="date" />
          </div>
          <Field label="COMPANION" labelAr="المرافق" value={companionName} onChange={setCompanionName} placeholder="Sara Al-Rashidi" />
          <Field label="INSURANCE REF" labelAr="مرجع التأمين" value={insuranceRef} onChange={setInsuranceRef} placeholder="BUPA-2026-7823" />
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <button onClick={handleSave}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
            Save Changes · حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTripSheet;
