import { useState, useRef, useEffect } from "react";
import { X, RotateCw, Sun, Contrast, Crop, Palette } from "lucide-react";
import { toast } from "sonner";
import RufayQLogo from "@/components/RufayQLogo";
import { FileUploadPreview } from "@/shared/ui";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { pdfToImageDataUrls } from "@/lib/pdfToImages";
import { normalizeParsedLeg } from "@/lib/flightParsing";
import type { FlightInfo } from "@/components/AddTripSheet";

interface ScannerWizardProps {
  onClose: () => void;
  preselectedCategory?: string | null;
  /** Called on save. For flights, payload contains the parsed legs so the
   * caller can inject them into the Journey timeline. */
  onSave?: (category: string | null, payload?: { outbound?: FlightInfo | null; return?: FlightInfo | null; passenger?: { name?: string; passport?: string } }) => void;
}

const categories = [
  { id: "flight", emoji: "✈️", en: "Flight Ticket", ar: "تذكرة طيران", color: "#004D5B", paleBg: "#E0F4F5",
    subs: ["One Way", "Round Trip", "Connecting", "Transit Visa"] },
  { id: "train", emoji: "🚄", en: "Train / Bus", ar: "تذكرة قطار / باص", color: "#1A3A4A", paleBg: "#E8EEF2",
    subs: ["Train", "Bus", "Ferry", "Other"] },
  { id: "hotel", emoji: "🏨", en: "Hotel / Stay", ar: "فندق / إقامة", color: "#2A1A35", paleBg: "#EEE8F2",
    subs: ["Hotel", "Apartment", "Hospital", "Private House"] },
  { id: "passport", emoji: "🛂", en: "Passport / ID", ar: "جواز سفر / هوية", color: "#1A3A1A", paleBg: "#E8F2E8",
    subs: ["Passport", "National ID", "Visa", "Residency Permit", "Travel Insurance Card"] },
  { id: "lab", emoji: "🔬", en: "Lab Results", ar: "نتائج التحاليل", color: "#3DAA6E", paleBg: "#E8F5EE",
    subs: ["Blood Test", "Urine", "Pathology", "Microbiology", "Other"] },
  { id: "prescription", emoji: "💊", en: "Prescription", ar: "وصفة طبية", color: "#004D5B", paleBg: "#E0F4F5",
    subs: ["Inpatient", "Outpatient", "Topical", "Injection", "Supplement"] },
  { id: "discharge", emoji: "📋", en: "Discharge / Summary", ar: "ملخص الخروج", color: "#C5965A", paleBg: "#FBF3E8",
    subs: ["Discharge Summary", "Clinical Letter", "Referral", "Follow-up Plan"] },
  { id: "imaging", emoji: "🩻", en: "Imaging / Radiology", ar: "أشعة وتصوير", color: "#6B7A8A", paleBg: "#F0F2F5",
    subs: ["X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "DEXA"] },
  { id: "insurance", emoji: "🛡️", en: "Insurance / Billing", ar: "تأمين وفواتير", color: "#0D1B2A", paleBg: "#E8EAF0",
    subs: ["Insurance Card", "Authorization", "Invoice", "Receipt", "Claim"] },
  { id: "other", emoji: "📄", en: "Other Medical", ar: "وثيقة طبية أخرى", color: "#6B7A8A", paleBg: "#F0F2F5",
    subs: ["Referral", "Consultation Note", "Surgical Report", "Consent Form", "Vaccination", "Medical Certificate", "Other"] },
];

const destinationsByCategory: Record<string, { en: string; ar: string; route: string; checked: boolean }[]> = {
  flight: [
    { en: "Add to Transport Timeline", ar: "أضف لجدول التنقل", route: "Journey → Tickets", checked: true },
    { en: "Save to Medical Records", ar: "حفظ في الملفات", route: "Records → General", checked: true },
    { en: "Send to KSA Doctor", ar: "أرسل لطبيبي", route: "Share", checked: false },
  ],
  lab: [
    { en: "Add to Lab Results", ar: "أضف لنتائج التحاليل", route: "Records → Lab", checked: true },
    { en: "Update Care Hub Vitals", ar: "حدّث قراءات الرعاية", route: "Care Hub → Vitals", checked: true },
    { en: "Translate to Arabic", ar: "ترجم للعربية", route: "Translation", checked: false },
    { en: "Send to KSA Doctor", ar: "أرسل لطبيبي", route: "Share", checked: false },
  ],
  hotel: [
    { en: "Add to Accommodation", ar: "أضف للإقامة", route: "Journey → Stay", checked: true },
    { en: "Save to Records", ar: "حفظ في الملفات", route: "Records → General", checked: true },
  ],
  prescription: [
    { en: "Update Medication Schedule", ar: "حدّث جدول الأدوية", route: "Medications", checked: true },
    { en: "Save to Records", ar: "حفظ في الملفات", route: "Records → Prescription", checked: true },
    { en: "Set medication reminders", ar: "فعّل تذكيرات الأدوية", route: "Notifications", checked: true },
  ],
  discharge: [
    { en: "Update Care Plan", ar: "حدّث خطة الرعاية", route: "Care Hub → Care Plan", checked: true },
    { en: "Save to Discharge Pack", ar: "أضف لحزمة الخروج", route: "Records → Discharge", checked: true },
    { en: "Update Journey Steps", ar: "حدّث خطوات الرحلة", route: "Journey → Steps", checked: true },
    { en: "Send to KSA Doctor", ar: "أرسل لطبيبي", route: "Share", checked: false },
  ],
  passport: [
    { en: "Save to Profile", ar: "حفظ في الملف الشخصي", route: "Profile → ID", checked: true },
    { en: "Save to Medical Records", ar: "حفظ في الملفات الطبية", route: "Records → Identity", checked: true },
    { en: "Share with Hospital", ar: "مشاركة مع المستشفى", route: "Share", checked: false },
    { en: "Attach to Insurance", ar: "إرفاق بالتأمين", route: "Insurance", checked: false },
  ],
};

const extractedFieldsByCategory: Record<string, { label: string; value: string }[]> = {
  flight: [
    { label: "Airline", value: "Saudia" }, { label: "Flight No.", value: "SV 301" },
    { label: "From", value: "RUH — Riyadh" }, { label: "To", value: "BER — Berlin" },
    { label: "Date", value: "Apr 5, 2026" }, { label: "Time", value: "08:30" },
    { label: "PNR", value: "AB1234" }, { label: "Class", value: "Business" },
  ],
  lab: [
    { label: "Test", value: "CBC — Complete Blood Count" }, { label: "Result", value: "See details" },
    { label: "Hemoglobin", value: "14.2 g/dL ✓" }, { label: "WBC", value: "7,200 /μL ✓" },
    { label: "Platelets", value: "245,000 /μL ✓" }, { label: "CRP", value: "12 mg/L ⚠" },
  ],
  hotel: [
    { label: "Hotel", value: "Hotel Berlin Mitte" }, { label: "Check-in", value: "Apr 5, 14:00" },
    { label: "Check-out", value: "Apr 8, 07:00" }, { label: "Ref", value: "HTL-2026-4821" },
    { label: "Room", value: "Deluxe Double" }, { label: "Rate", value: "€185/night" },
  ],
  prescription: [
    { label: "Medication", value: "Ibuprofen 400mg" }, { label: "Dose", value: "1 tablet" },
    { label: "Frequency", value: "3× daily" }, { label: "Duration", value: "14 days" },
    { label: "Medication 2", value: "Omeprazole 20mg" }, { label: "Refills", value: "2" },
  ],
  discharge: [
    { label: "Diagnosis", value: "Right knee arthroplasty" }, { label: "Procedure", value: "Total knee replacement" },
    { label: "Discharge", value: "Apr 10, 2026" }, { label: "Follow-up", value: "Apr 17 — wound check" },
    { label: "Red Flags", value: "Fever >38.5°C, swelling" }, { label: "Physician", value: "Dr. Klaus Mueller" },
  ],
  passport: [
    { label: "Full Name", value: "Mohammed Abdullah Al-Rashidi" }, { label: "Name (Arabic)", value: "محمد عبدالله الراشدي" },
    { label: "Passport No.", value: "K482916" }, { label: "Nationality", value: "Saudi Arabian" },
    { label: "Date of Birth", value: "15 Mar 1985" }, { label: "Gender", value: "Male" },
    { label: "Issue Date", value: "Jan 12, 2024" }, { label: "Expiry Date", value: "Jan 11, 2034" },
    { label: "Issued By", value: "Kingdom of Saudi Arabia" },
  ],
};

const sectionLabels: Record<string, string> = {
  flight: "Transport Timeline", lab: "Lab Results", hotel: "Accommodation",
  prescription: "Medications", discharge: "Discharge Pack", train: "Transport Timeline",
  imaging: "Imaging Records", insurance: "Insurance Records", passport: "Profile",
  other: "Medical Records",
};

const ScannerWizard = ({ onClose, preselectedCategory, onSave }: ScannerWizardProps) => {
  const [step, setStep] = useState(1);
  const [capturedFile, setCapturedFile] = useState<{ name: string; type: string; size: string } | null>(null);
  const [realFile, setRealFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(preselectedCategory || null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleFileCapture = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
    // Demo fallback: if file dialog is dismissed or unavailable, use mock after short delay
    setTimeout(() => {
      if (!capturedFile) {
        setCapturedFile({ name: "document_scan.pdf", type: "application/pdf", size: "1.2 MB" });
        setStep(2);
      }
    }, 1500);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile({ name: file.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB` });
      setRealFile(file);
      setStep(2);
    }
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col animate-slide-in-right" style={{ background: "var(--scanner-bg)" }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 52, background: "var(--scanner-bg)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
          <X size={16} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <RufayQLogo size={20} variant="dark" />
          <span className="text-[14px] text-white font-medium" style={{ fontFamily: "'DM Sans'" }}>RufayQ Scanner</span>
        </div>
        <span className="font-mono text-[11px]" style={{ color: "var(--gold)" }}>{step} / {totalSteps}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full shrink-0" style={{ height: 4, background: "rgba(255,255,255,0.1)" }}>
        <div style={{ height: 4, width: `${progress}%`, background: "var(--gold)", transition: "width 400ms ease" }} />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        {step === 1 && <Step1Capture onCapture={handleFileCapture} />}
        {step === 2 && capturedFile && (
          <Step2Review file={capturedFile} realFile={realFile} onRetake={() => { setStep(1); setRealFile(null); }} onConfirm={() => {
            if (preselectedCategory) setSelectedCategory(preselectedCategory);
            setStep(3);
          }} />
        )}
        {step === 3 && (
          <Step3Category
            selected={selectedCategory}
            selectedSub={selectedSub}
            onSelect={(id) => { setSelectedCategory(id); setSelectedSub(null); }}
            onSelectSub={setSelectedSub}
            onContinue={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4AIReview
            category={selectedCategory}
            fileName={capturedFile?.name || "document"}
            onSave={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5Success
            category={selectedCategory}
            onViewSection={() => { if (onSave) onSave(selectedCategory); else onClose(); }}
            onScanAnother={() => {
              setStep(1);
              setCapturedFile(null);
              setSelectedCategory(preselectedCategory || null);
              setSelectedSub(null);
            }}
            onDone={() => { if (onSave) onSave(selectedCategory); else onClose(); }}
          />
        )}
      </div>
    </div>
  );
};

/* ─── STEP 1: CAPTURE ─── */
const Step1Capture = ({ onCapture }: { onCapture: (accept: string) => void }) => {
  const [showQRScanner, setShowQRScanner] = useState(false);

  if (showQRScanner) {
    return (
      <div className="flex flex-col items-center px-6 py-8" style={{ minHeight: "100%" }}>
        {/* QR Scanner UI */}
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "1", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", maxWidth: 300 }}>
          {/* Scanner frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: "70%", height: "70%" }}>
              {/* Corner brackets */}
              {[
                { top: 0, left: 0, borderTop: "3px solid var(--gold)", borderLeft: "3px solid var(--gold)" },
                { top: 0, right: 0, borderTop: "3px solid var(--gold)", borderRight: "3px solid var(--gold)" },
                { bottom: 0, left: 0, borderBottom: "3px solid var(--gold)", borderLeft: "3px solid var(--gold)" },
                { bottom: 0, right: 0, borderBottom: "3px solid var(--gold)", borderRight: "3px solid var(--gold)" },
              ].map((style, i) => (
                <div key={i} className="absolute" style={{ ...style, width: 24, height: 24, borderRadius: 2 } as any} />
              ))}
              {/* Scanning line animation */}
              <div className="absolute left-2 right-2" style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--gold), transparent)", animation: "qrScan 2s ease-in-out infinite" }} />
            </div>
          </div>
          {/* Center QR icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl" style={{ opacity: 0.2 }}>📱</span>
          </div>
        </div>

        <p className="text-[16px] text-white font-bold mt-5" style={{ fontFamily: "'DM Sans'" }}>Scan QR Code</p>
        <p className="font-arabic text-[14px] mt-1" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>امسح رمز QR</p>
        <p className="text-[11px] text-center mt-2 px-8" style={{ color: "rgba(255,255,255,0.4)" }}>
          Point your camera at a QR code on a medical document, boarding pass, or prescription label
        </p>
        <p className="font-arabic text-[10px] text-center mt-1 px-6" dir="rtl" style={{ color: "rgba(255,255,255,0.3)" }}>
          وجّه الكاميرا نحو رمز QR على وثيقة طبية أو بطاقة صعود أو ملصق وصفة
        </p>

        {/* Demo: simulate QR detection */}
        <button
          onClick={() => onCapture("image/*")}
          className="mt-6 px-6 py-3 rounded-xl text-[13px] font-bold text-white btn-press"
          style={{ background: "var(--gold)" }}
        >
          📱 Simulate QR Detection · محاكاة الكشف
        </button>

        <button
          onClick={() => setShowQRScanner(false)}
          className="mt-3 text-[12px] font-medium btn-press"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          ← Back to sources · العودة
        </button>

        <style>{`
          @keyframes qrScan {
            0%, 100% { top: 10%; opacity: 0.3; }
            50% { top: 85%; opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-10" style={{ minHeight: "100%" }}>
      <div className="logo-pulse">
        <RufayQLogo size={52} variant="gold" />
      </div>
      <h2 className="font-display text-[32px] text-white mt-5 text-center" style={{ fontWeight: 300 }}>Scan or Import</h2>
      <p className="font-arabic text-[18px] mt-2 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>امسح أو استورد وثيقتك</p>

      <div className="w-full space-y-3 mt-8">
        {[
          { emoji: "📷", en: "Scan with Camera", ar: "امسح بالكاميرا", gradient: "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))", accept: "image/*;capture=camera" },
          { emoji: "📱", en: "Scan QR Code", ar: "امسح رمز QR", gradient: "linear-gradient(135deg, #3A2A1A, #2A1A0A)", accept: "qr", sub: "Boarding pass · Rx label · Hospital ID" },
          { emoji: "🖼️", en: "Choose from Photos", ar: "اختر من الصور", gradient: "linear-gradient(135deg, var(--header-dark-alt), var(--scanner-bg))", accept: "image/*" },
          { emoji: "📁", en: "Upload PDF or Document", ar: "ارفع PDF أو وثيقة", gradient: "linear-gradient(135deg, #2A1A3A, #1A0D24)", accept: ".pdf,.doc,.docx,.jpg,.png,.jpeg" },
          { emoji: "☁️", en: "Import from Cloud", ar: "استورد من السحابة", gradient: "linear-gradient(135deg, #1A2A14, #0D1A08)", accept: "*/*", sub: "Google Drive · iCloud · Dropbox · Email" },
        ].map((opt) => (
          <button
            key={opt.en}
            onClick={() => opt.accept === "qr" ? setShowQRScanner(true) : onCapture(opt.accept)}
            className="w-full flex items-center gap-4 px-5 rounded-2xl card-press"
            style={{ background: opt.gradient, height: 72 }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[28px]" style={{ background: "rgba(255,255,255,0.1)" }}>
              {opt.emoji}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] text-white font-bold" style={{ fontFamily: "'DM Sans'" }}>{opt.en}</p>
              <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "rgba(255,255,255,0.6)" }}>{opt.ar}</p>
              {opt.sub && <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{opt.sub}</p>}
            </div>
            <span className="text-white text-xl" style={{ opacity: 0.4 }}>›</span>
          </button>
        ))}
      </div>

      <p className="font-mono text-[9px] mt-8 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
        🔒 All documents encrypted in your secure vault
      </p>
      <p className="font-arabic text-[9px] text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.25)" }}>
        جميع الوثائق مشفرة في خزنتك الآمنة
      </p>
    </div>
  );
};

/* ─── STEP 2: REVIEW ─── */
const Step2Review = ({ file, realFile, onRetake, onConfirm }: { file: { name: string; type: string; size: string }; realFile?: File | null; onRetake: () => void; onConfirm: () => void }) => {
  const isImage = file.type.startsWith("image");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--scanner-bg)" }}>
      <div className="flex-1 flex items-center justify-center px-6 py-6 relative">
        {realFile ? (
          <div className="w-full">
            <FileUploadPreview file={realFile} lang="both" maxHeight={360} />
          </div>
        ) : isImage ? (
          <div className="w-full rounded-2xl overflow-hidden relative" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.05)", border: "2px solid var(--gold)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">📄</span>
            </div>
            {[{ t: 8, l: 8 }, { t: 8, r: 8 }, { b: 8, l: 8 }, { b: 8, r: 8 }].map((pos, i) => (
              <div key={i} className="absolute w-5 h-5 rounded-full" style={{
                background: "var(--gold)", top: (pos as any).t, bottom: (pos as any).b, left: (pos as any).l, right: (pos as any).r,
                boxShadow: "0 2px 8px rgba(197,150,90,0.4)",
              }} />
            ))}
            <p className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px]" style={{ color: "var(--gold)" }}>{file.name} · {file.size}</p>
          </div>
        ) : (
          <div className="w-full rounded-2xl p-8 flex flex-col items-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-6xl mb-4">📄</span>
            <p className="text-[14px] text-white font-semibold">{file.name}</p>
            <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>{file.size}</p>
            <p className="font-mono text-[9px] mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>Page 1 of 1</p>
          </div>
        )}
      </div>

      {isImage && (
        <div className="flex justify-center gap-2 px-4 pb-3">
          {[
            { icon: <Sun size={18} />, label: "Brightness" },
            { icon: <Contrast size={18} />, label: "Contrast" },
            { icon: <Crop size={18} />, label: "Crop" },
            { icon: <RotateCw size={18} />, label: "Rotate" },
            { icon: <Palette size={18} />, label: "B&W" },
          ].map((tool) => (
            <button key={tool.label} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
              {tool.icon}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 px-5 pb-8 pt-3">
        <button onClick={onRetake} className="flex-1 py-3.5 rounded-xl text-[13px] font-medium btn-press" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
          Retake · <span className="font-arabic">إعادة</span>
        </button>
        <button onClick={onConfirm} className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>
          Use This · <span className="font-arabic">استخدم</span>
        </button>
      </div>
    </div>
  );
};

/* ─── STEP 3: CATEGORY ─── */
const Step3Category = ({ selected, selectedSub, onSelect, onSelectSub, onContinue }: {
  selected: string | null; selectedSub: string | null;
  onSelect: (id: string) => void; onSelectSub: (sub: string) => void;
  onContinue: () => void;
}) => {
  const selectedCat = categories.find((c) => c.id === selected);

  return (
    <div className="pb-8" style={{ background: "var(--off-white)" }}>
      <div className="px-5 py-4" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}>
        <p className="text-[20px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>What type of document is this?</p>
        <p className="font-arabic text-[15px]" dir="rtl" style={{ color: "var(--gray)" }}>ما نوع هذه الوثيقة؟</p>
      </div>

      <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--teal-light)", borderLeft: "3px solid var(--teal-deep)" }}>
        <RufayQLogo size={16} variant="dark" />
        <div className="flex-1">
          <p className="text-[13px]" style={{ color: "var(--teal-deep)" }}>RufayQ thinks this is a <strong>medical document</strong></p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>رُفَيِّق يرى أن هذه وثيقة طبية</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-4 mt-4">
        {categories.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex flex-col items-center py-3.5 px-2 rounded-2xl text-center card-press transition-all"
              style={{
                background: isSelected ? cat.paleBg : "var(--white)",
                border: isSelected ? `2px solid ${cat.color}` : "1px solid var(--gray-light)",
                boxShadow: isSelected ? `0 4px 16px rgba(0,0,0,0.08)` : "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <span className="text-[24px]">{cat.emoji}</span>
              <p className="text-[11px] font-bold mt-1.5" style={{ color: cat.color }}>{cat.en}</p>
              <p className="font-arabic text-[9px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{cat.ar}</p>
            </button>
          );
        })}
      </div>

      {selectedCat && (
        <div className="px-4 mt-4">
          <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: selectedCat.color }}>SUB-CATEGORY</p>
          <div className="flex flex-wrap gap-2">
            {selectedCat.subs.map((sub) => (
              <button
                key={sub}
                onClick={() => onSelectSub(sub)}
                className="text-[11px] px-3 py-1.5 rounded-full btn-press transition-all"
                style={{
                  background: selectedSub === sub ? selectedCat.color : "var(--white)",
                  color: selectedSub === sub ? "#fff" : selectedCat.color,
                  border: `1px solid ${selectedCat.color}`,
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <button
          onClick={onContinue}
          disabled={!selected}
          className="w-full py-3.5 rounded-2xl text-[16px] font-bold text-white btn-press transition-all"
          style={{
            background: selected ? "var(--gold)" : "var(--gray-light)",
            color: selected ? "#fff" : "var(--gray)",
            height: 52,
          }}
        >
          Continue → · <span className="font-arabic">متابعة →</span>
        </button>
      </div>
    </div>
  );
};

/* ─── STEP 4: AI REVIEW & DATA EXTRACT ─── */
const Step4AIReview = ({ category, fileName, onSave }: {
  category: string | null; fileName: string; onSave: () => void;
}) => {
  const [processing, setProcessing] = useState(true);
  const [processStep, setProcessStep] = useState(0);
  const [destinations, setDestinations] = useState<boolean[]>([]);

  const cat = categories.find(c => c.id === category);
  const fields = extractedFieldsByCategory[category || ""] || extractedFieldsByCategory["flight"];
  const dests = destinationsByCategory[category || ""] || destinationsByCategory["flight"];

  useEffect(() => {
    setDestinations(dests.map(d => d.checked));
  }, [category]);

  useEffect(() => {
    if (!processing) return;
    const timers = [
      setTimeout(() => setProcessStep(1), 800),
      setTimeout(() => setProcessStep(2), 1800),
      setTimeout(() => setProcessStep(3), 3000),
      setTimeout(() => setProcessStep(4), 4200),
      setTimeout(() => setProcessing(false), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [processing]);

  const toggleDest = (i: number) => {
    setDestinations(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const processingSteps = [
    { emoji: "🔍", en: "Reading document content", ar: "قراءة محتوى الوثيقة" },
    { emoji: "🌐", en: "Detecting language", ar: "اكتشاف اللغة" },
    { emoji: "🧠", en: "Extracting key information", ar: "استخراج المعلومات" },
    { emoji: "📍", en: "Mapping to your journey", ar: "ربطها برحلتك العلاجية" },
  ];

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: "100%", background: "var(--scanner-bg)" }}>
        <div className="logo-pulse">
          <RufayQLogo size={56} variant="gold" />
        </div>
        <p className="text-[16px] text-white mt-4 text-center" style={{ fontFamily: "'DM Sans'" }}>
          RufayQ is reading your document
        </p>
        <p className="font-arabic text-[14px] mt-1 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>
          رُفَيِّق يقرأ وثيقتك...
        </p>

        <div className="w-full mt-8 space-y-3">
          {processingSteps.map((ps, i) => {
            const isDone = processStep > i;
            const isActive = processStep === i;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  background: isDone ? "rgba(61,170,110,0.1)" : isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  opacity: processStep >= i ? 1 : 0.3,
                  transition: "all 0.4s ease",
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]"
                  style={{ background: isDone ? "rgba(61,170,110,0.2)" : "rgba(255,255,255,0.08)" }}>
                  {isDone ? <span style={{ color: "#3DAA6E" }}>✓</span> : ps.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-[13px]" style={{ color: isDone ? "#3DAA6E" : "rgba(255,255,255,0.8)" }}>{ps.en}</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "rgba(255,255,255,0.4)" }}>{ps.ar}</p>
                </div>
                {isActive && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--teal-bright)", animationDelay: `${d * 0.2}s` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Results view
  return (
    <div className="pb-8" style={{ background: "var(--off-white)" }}>
      {/* Document Preview Strip */}
      <div className="mx-4 mt-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[18px]" style={{ background: cat?.paleBg || "#E0F4F5" }}>
          {cat?.emoji || "📄"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: "var(--navy)" }}>{cat?.en || "Document"}</p>
          <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{fileName}</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-bold" style={{ background: "rgba(61,170,110,0.1)", color: "#3DAA6E" }}>✓ Processed</span>
      </div>

      {/* Extracted Data */}
      <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>EXTRACTED INFORMATION</p>
        <p className="font-arabic text-[10px] mb-3" dir="rtl" style={{ color: "var(--gray)" }}>المعلومات المستخرجة</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {fields.map((f, i) => (
            <div key={i}>
              <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>{f.label}</p>
              <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{f.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <span className="text-[9px]">🌐</span>
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>Language: <strong style={{ color: "var(--navy)" }}>German / English</strong></p>
          <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(61,170,110,0.1)", color: "#3DAA6E" }}>✓ Translated</span>
        </div>
      </div>

      {/* Edit note */}
      <div className="flex items-center gap-2 px-5 mt-3">
        <span className="text-[11px]">✏️</span>
        <p className="text-[11px]" style={{ color: "var(--gray)" }}>Tap any field to edit before saving</p>
      </div>
      <div className="px-5 mt-0.5">
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>اضغط على أي حقل لتعديله قبل الحفظ</p>
      </div>

      {/* Save Destinations */}
      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gray)" }}>SAVE TO: · <span className="font-arabic">احفظ في:</span></p>
        <div className="space-y-2.5">
          {dests.map((dest, i) => (
            <button key={i} onClick={() => toggleDest(i)} className="w-full flex items-center gap-3 py-2 btn-press">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all" style={{
                background: destinations[i] ? "var(--teal-deep)" : "transparent",
                border: destinations[i] ? "none" : "1.5px solid var(--teal-deep)",
              }}>
                {destinations[i] && <span className="text-[10px] text-white">✓</span>}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{dest.en}</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{dest.ar}</p>
              </div>
              <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{dest.route}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save CTA */}
      <div className="px-4 mt-5">
        <button onClick={onSave} className="w-full flex items-center justify-center gap-2 rounded-2xl text-[16px] font-bold text-white btn-press" style={{ background: "var(--gold)", height: 52 }}>
          <RufayQLogo size={18} variant="light" />
          <span>Save to RufayQ</span>
          <span className="font-arabic text-[13px]" style={{ opacity: 0.8 }}>حفظ</span>
          <span className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
};

/* ─── STEP 5: SUCCESS ─── */
const Step5Success = ({ category, onViewSection, onScanAnother, onDone }: {
  category: string | null; onViewSection: () => void; onScanAnother: () => void; onDone: () => void;
}) => {
  const [showContent, setShowContent] = useState(false);
  const cat = categories.find(c => c.id === category);
  const section = sectionLabels[category || ""] || "Records";

  const actionsTaken: { en: string; ar: string }[] = [];
  const dests = destinationsByCategory[category || ""] || destinationsByCategory["flight"];
  dests.filter(d => d.checked).forEach(d => {
    actionsTaken.push({ en: d.en, ar: d.ar });
  });

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center px-5 pt-16 pb-8" style={{ minHeight: "100%", background: "var(--scanner-bg)" }}>
      {/* Success checkmark */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] text-white"
        style={{
          background: "#3DAA6E",
          animation: "success-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>
        ✓
      </div>
      <div className="mt-3" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.4s ease 0.2s" }}>
        <RufayQLogo size={32} variant="gold" />
      </div>

      <h2 className="font-display text-[32px] text-white mt-4 text-center" style={{ fontWeight: 300, opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.4s" }}>
        Document Saved!
      </h2>
      <p className="font-arabic text-[18px] mt-1 text-center" dir="rtl"
        style={{ color: "rgba(255,255,255,0.55)", opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }}>
        تم حفظ الوثيقة بنجاح
      </p>

      {/* Actions Taken */}
      <div className="w-full rounded-2xl p-4 mt-6" style={{
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
        opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.7s",
      }}>
        <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>
          ✓ RUFAYQ UPDATED: · <span className="font-arabic">قام رُفَيِّق بتحديث:</span>
        </p>
        <div className="space-y-2.5">
          {actionsTaken.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-[12px] mt-0.5" style={{ color: "#3DAA6E" }}>✓</span>
              <div>
                <p className="text-[12px] text-white">{a.en}</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "rgba(255,255,255,0.4)" }}>{a.ar}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="w-full mt-6 space-y-3" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.9s" }}>
        <button onClick={onViewSection} className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white btn-press" style={{ background: "var(--gold)", height: 48 }}>
          View in {section} · <span className="font-arabic text-[12px]">عرض في {section}</span>
        </button>
        <button onClick={onScanAnother} className="w-full py-3 rounded-2xl text-[14px] font-medium btn-press" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", height: 44 }}>
          Scan Another Document · <span className="font-arabic text-[12px]">امسح وثيقة أخرى</span>
        </button>
        <button onClick={onDone} className="w-full py-2 text-[13px] text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
          Done · <span className="font-arabic">تم</span>
        </button>
      </div>
    </div>
  );
};

export default ScannerWizard;