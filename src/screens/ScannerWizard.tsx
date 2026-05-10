import { useState, useRef, useEffect } from "react";
import { X, RotateCw, Sun, Contrast, Crop, Palette } from "lucide-react";

import RufayQLogo from "@/components/RufayQLogo";
import { FileUploadPreview } from "@/shared/ui";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { analyzePdfPages, renderPdfPagesAtScale, type PdfAnalysis } from "@/lib/pdfToImages";
import { normalizeParsedLeg } from "@/lib/flightParsing";
import { parseFlightJourney } from "@/lib/flightJourney";
import JourneyTimeline from "@/components/JourneyTimeline";
import ManualFlightEntrySheet, { type ManualFlightPayload } from "@/components/ManualFlightEntrySheet";
import RelatedDocumentsCard from "@/components/RelatedDocumentsCard";
import type { FlightInfo } from "@/components/AddTripSheet";

export type TravelerKind = "patient" | "companion" | "family";

export interface ScannerSavePayload {
  outbound?: FlightInfo | null;
  return?: FlightInfo | null;
  legs?: FlightInfo[];
  rawOutbound?: any;
  rawReturn?: any;
  passenger?: { name?: string; passport?: string };
  /** Where the data came from. "manual" tags the document as Manual Entry. */
  source?: "ocr" | "manual";
  /** Who this ticket is for. Companion / family is gated by subscription. */
  traveler?: TravelerKind;
  /** Image data URLs of the page(s) the AI analyzed (or that the user attached
   * for manual entry). Surfaced on the success screen as a preview strip. */
  pageImages?: string[];
  /** Stable id used as the storage / DB key for related documents (VISA, etc.)
   * attached during the wizard. The Journey screen reuses this as the
   * resulting first transport segment's id so attachments stay linked. */
  pendingSegmentRef?: string;
}

interface ScannerWizardProps {
  onClose: () => void;
  preselectedCategory?: string | null;
  /** Called on save. For flights, payload contains the parsed legs so the
   * caller can inject them into the Journey timeline. */
  onSave?: (category: string | null, payload?: ScannerSavePayload) => void;
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
    { en: "Save to Medical Records", ar: "حفظ في الملفات", route: "Records → General", checked: false },
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

  // Saved parsed payload from real OCR or manual entry (flight category).
  const [scannedPayload, setScannedPayload] = useState<ScannerSavePayload | null>(null);
  // Stable id so related-document attachments uploaded on Step 5 stay linked
  // to the resulting flight ticket on the Journey screen.
  const [pendingSegmentRef] = useState(() =>
    (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `seg-${Date.now()}`
  );

  const enrichedPayload = (p: ScannerSavePayload | null | undefined): ScannerSavePayload | undefined =>
    p ? { ...p, pendingSegmentRef } : undefined;

  const handleFileCapture = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
    // NOTE: removed the 1.5s "demo fallback" — it overwrote a real selected
    // file with a fake "document_scan.pdf" because the closure captured a
    // stale `capturedFile === null`, which is why scans appeared as the
    // hardcoded RUH→BER demo.
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile({ name: file.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB` });
      setRealFile(file);
      setScannedPayload(null);
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
            realFile={realFile}
            onParsed={setScannedPayload}
            onSave={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5Success
            category={selectedCategory}
            payload={scannedPayload}
            pendingSegmentRef={pendingSegmentRef}
            onViewSection={() => { if (onSave) onSave(selectedCategory, enrichedPayload(scannedPayload)); else onClose(); }}
            onScanAnother={() => {
              setStep(1);
              setCapturedFile(null);
              setRealFile(null);
              setScannedPayload(null);
              setSelectedCategory(preselectedCategory || null);
              setSelectedSub(null);
            }}
            onDone={() => { if (onSave) onSave(selectedCategory, enrichedPayload(scannedPayload)); else onClose(); }}
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
  const NON_MEDICAL = new Set(["flight", "train", "hotel", "passport", "insurance"]);
  const detectedKind = selectedCat
    ? (NON_MEDICAL.has(selectedCat.id) ? { en: "travel document", ar: "وثيقة سفر" } : { en: "medical document", ar: "وثيقة طبية" })
    : null;

  return (
    <div className="pb-8" style={{ background: "var(--off-white)" }}>
      <div className="px-5 py-4" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}>
        <p className="text-[20px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>What type of document is this?</p>
        <p className="font-arabic text-[15px]" dir="rtl" style={{ color: "var(--gray)" }}>ما نوع هذه الوثيقة؟</p>
      </div>

      {detectedKind && (
        <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--teal-light)", borderLeft: "3px solid var(--teal-deep)" }}>
          <RufayQLogo size={16} variant="dark" />
          <div className="flex-1">
            <p className="text-[13px]" style={{ color: "var(--teal-deep)" }}>RufayQ recognized a <strong>{detectedKind.en}</strong></p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعرّف رُفَيِّق على {detectedKind.ar}</p>
          </div>
        </div>
      )}

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
type OcrStatus = "idle" | "analyzing-pdf" | "pick-pages" | "scanning" | "success" | "failed";

interface FlightFields {
  Airline: string; "Flight No.": string; From: string; To: string;
  Date: string; Time: string; PNR: string; Class: string;
}
const FLIGHT_FIELD_ORDER: (keyof FlightFields)[] = ["Airline", "Flight No.", "From", "To", "Date", "Time", "PNR", "Class"];

const emptyFlightFields = (): FlightFields => ({
  Airline: "", "Flight No.": "", From: "", To: "", Date: "", Time: "", PNR: "", Class: "",
});

const fmtDateLite = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.split("T")[0] || "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const fmtTimeLite = (s: string) => (s && s.includes("T") ? s.split("T")[1].slice(0, 5) : "");
const toFlightFieldsLite = (leg: FlightInfo): FlightFields => ({
  Airline: leg.airline || "",
  "Flight No.": leg.flightNumber || "",
  From: [leg.fromAirport, leg.fromCity].filter(Boolean).join(" — "),
  To: [leg.toAirport, leg.toCity].filter(Boolean).join(" — "),
  Date: fmtDateLite(leg.departureDateTime),
  Time: fmtTimeLite(leg.departureDateTime),
  PNR: leg.bookingRef || "",
  Class: leg.seatClass || "",
});

const Step4AIReview = ({ category, fileName, realFile, onParsed, onSave }: {
  category: string | null;
  fileName: string;
  realFile?: File | null;
  onParsed?: (p: ScannerSavePayload | null) => void;
  onSave: () => void;
}) => {
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("scanning");
  const [processStep, setProcessStep] = useState(0);
  const [destinations, setDestinations] = useState<boolean[]>([]);
  const [showManualSheet, setShowManualSheet] = useState(false);

  // Flight-specific parsed state
  const [outboundFields, setOutboundFields] = useState<FlightFields | null>(null);
  const [returnFields, setReturnFields] = useState<FlightFields | null>(null);
  const [activeLeg, setActiveLeg] = useState<"outbound" | "return">("outbound");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [wasTranslated, setWasTranslated] = useState(false);

  // Generic (non-flight) demo fields
  const [genericFields, setGenericFields] = useState<{ label: string; value: string }[] | null>(null);

  // PDF preview / page picker state (flight + PDF only)
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysis | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  // Image data URLs of the page(s) actually fed to the AI (or read from a single
  // image upload). Persisted so the manual-entry split-screen and Step 5 can
  // show the user what RufayQ analyzed.
  const [analyzedImages, setAnalyzedImages] = useState<string[]>([]);

  const cat = categories.find(c => c.id === category);
  const dests = destinationsByCategory[category || ""] || destinationsByCategory["flight"];

  useEffect(() => {
    setDestinations(dests.map(d => d.checked));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const runRef = useRef<number>(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const cancelRef = useRef(false);

  // Run the OCR call against a chosen set of image data URLs. Shared by
  // both the auto-pick flow and the manual-pick "Run OCR" button.
  const runOcr = async (files: string[], myRun: number) => {
    try {
      if (cancelRef.current || runRef.current !== myRun) return;
      if (files.length === 0) throw new Error("empty-file");
      setOcrStatus("scanning");
      setProcessStep(2);

      const { data, error } = await supabase.functions.invoke("scan-itinerary", {
        body: { files },
        headers: { "x-device-id": getDeviceId() },
      });
      if (cancelRef.current || runRef.current !== myRun) return;
      if (error) {
        console.error("[scanner] scan-itinerary edge error", error);
        throw new Error("ocr-failed");
      }
      const parsed = (data as any)?.data ?? null;
      if (!parsed || typeof parsed !== "object") {
        console.error("[scanner] scan-itinerary returned no data", data);
        throw new Error("ocr-failed");
      }
      setProcessStep(3);

      const out = parsed.outboundFlight ? normalizeParsedLeg(parsed.outboundFlight) : null;
      const ret = parsed.returnFlight ? normalizeParsedLeg(parsed.returnFlight) : null;
      if (!out && !ret) {
        console.error("[scanner] no flight legs in response", parsed);
        throw new Error("no-legs");
      }

      const fmtDate = (s: string) => {
        if (!s) return "";
        const d = new Date(s);
        return isNaN(d.getTime()) ? s.split("T")[0] : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      };
      const fmtTime = (s: string) => (s && s.includes("T") ? s.split("T")[1].slice(0, 5) : "");
      const toFields = (leg: FlightInfo): FlightFields => ({
        Airline: leg.airline || "",
        "Flight No.": leg.flightNumber || "",
        From: [leg.fromAirport, leg.fromCity].filter(Boolean).join(" — "),
        To: [leg.toAirport, leg.toCity].filter(Boolean).join(" — "),
        Date: fmtDate(leg.departureDateTime),
        Time: fmtTime(leg.departureDateTime),
        PNR: leg.bookingRef || "",
        Class: leg.seatClass || "",
      });

      if (out) setOutboundFields(toFields(out));
      if (ret) setReturnFields(toFields(ret));
      setActiveLeg(out ? "outbound" : "return");

      const lang: string | undefined = parsed.detectedLanguage;
      const translated = !!parsed.translated && !!lang && lang.toLowerCase() !== "english";
      setDetectedLanguage(lang || null);
      setWasTranslated(translated);

      setProcessStep(4);
      onParsed?.({
        outbound: out,
        return: ret,
        rawOutbound: parsed.outboundFlight ?? null,
        rawReturn: parsed.returnFlight ?? null,
        passenger: {
          name: [parsed.passengerFirstName, parsed.passengerLastName].filter(Boolean).join(" ") || undefined,
          passport: parsed.passportNumber || undefined,
        },
        source: "ocr",
        pageImages: files,
      });
      setTimeout(() => {
        if (cancelRef.current || runRef.current !== myRun) return;
        setOcrStatus("success");
      }, 400);
    } catch (e: any) {
      console.error("[scanner] OCR failed", e);
      if (cancelRef.current || runRef.current !== myRun) return;
      onParsed?.(null);
      setOcrStatus("failed");
    }
  };

  useEffect(() => {
    cancelRef.current = false;
    const myRun = ++runRef.current;

    // Reset all parsed/cached state for a fresh scan
    setOutboundFields(null);
    setReturnFields(null);
    setGenericFields(null);
    setDetectedLanguage(null);
    setWasTranslated(false);
    setPdfAnalysis(null);
    setSelectedPages([]);
    setAnalyzedImages([]);
    setProcessStep(0);
    onParsed?.(null);

    async function run() {
      // Non-flight: keep the existing fake animated flow
      if (!realFile || category !== "flight") {
        setOcrStatus("scanning");
        const t = [
          setTimeout(() => !cancelRef.current && setProcessStep(1), 700),
          setTimeout(() => !cancelRef.current && setProcessStep(2), 1500),
          setTimeout(() => !cancelRef.current && setProcessStep(3), 2400),
          setTimeout(() => !cancelRef.current && setProcessStep(4), 3200),
          setTimeout(() => {
            if (cancelRef.current || runRef.current !== myRun) return;
            setGenericFields(extractedFieldsByCategory[category || ""] ?? null);
            setOcrStatus("success");
          }, 4000),
        ];
        return () => t.forEach(clearTimeout);
      }

      const isPdf = realFile.type === "application/pdf" || /\.pdf$/i.test(realFile.name);

      if (isPdf) {
        // Multi-page flow: analyse → show preview → user confirms → OCR.
        setOcrStatus("analyzing-pdf");
        try {
          const analysis = await analyzePdfPages(realFile, { hardCap: 12, topN: 2 });
          if (cancelRef.current || runRef.current !== myRun) return;
          setPdfAnalysis(analysis);
          setSelectedPages(analysis.recommended.length > 0 ? analysis.recommended : [1]);
          setOcrStatus("pick-pages");
        } catch (e) {
          console.error("[scanner] PDF analysis failed", e);
          setOcrStatus("failed");
        }
        return;
      }

      // Image flight ticket: skip the picker, OCR straight away.
      setOcrStatus("scanning");
      setProcessStep(1);
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(realFile);
        });
        if (cancelRef.current || runRef.current !== myRun) return;
        setAnalyzedImages([dataUrl]);
        await runOcr([dataUrl], myRun);
      } catch (e) {
        console.error("[scanner] read image failed", e);
        if (!cancelRef.current && runRef.current === myRun) setOcrStatus("failed");
      }
    }
    void run();
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, realFile, retryNonce]);

  // User confirmed page selection in the picker → render at full scale + OCR.
  const confirmPages = async () => {
    if (!realFile || selectedPages.length === 0) return;
    const myRun = runRef.current;
    setOcrStatus("scanning");
    setProcessStep(1);
    try {
      const images = await renderPdfPagesAtScale(realFile, selectedPages, 2);
      if (cancelRef.current || runRef.current !== myRun) return;
      setAnalyzedImages(images);
      console.info("[scanner] PDF pages chosen for OCR", selectedPages);
      await runOcr(images, myRun);
    } catch (e) {
      console.error("[scanner] render selected pages failed", e);
      if (!cancelRef.current && runRef.current === myRun) setOcrStatus("failed");
    }
  };

  const togglePage = (pageIndex: number) => {
    setSelectedPages(prev => prev.includes(pageIndex)
      ? prev.filter(p => p !== pageIndex)
      : [...prev, pageIndex].sort((a, b) => a - b));
  };
  const resetToRecommended = () => {
    if (pdfAnalysis) setSelectedPages(pdfAnalysis.recommended);
  };

  const tryAgain = () => setRetryNonce(n => n + 1);

  const toggleDest = (i: number) => {
    setDestinations(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const updateField = (key: keyof FlightFields, value: string) => {
    if (activeLeg === "outbound") {
      setOutboundFields(prev => ({ ...(prev ?? emptyFlightFields()), [key]: value }));
    } else {
      setReturnFields(prev => ({ ...(prev ?? emptyFlightFields()), [key]: value }));
    }
  };

  const processingSteps = [
    { emoji: "🔍", en: "Reading document content", ar: "قراءة محتوى الوثيقة" },
    { emoji: "🌐", en: "Detecting language", ar: "اكتشاف اللغة" },
    { emoji: "🧠", en: "Extracting key information", ar: "استخراج المعلومات" },
    { emoji: "📍", en: "Mapping to your journey", ar: "ربطها برحلتك العلاجية" },
  ];

  // PDF analysis spinner — short, lives between scanning category and pick-pages.
  if (ocrStatus === "analyzing-pdf") {
    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: "100%", background: "var(--scanner-bg)" }}>
        <div className="logo-pulse"><RufayQLogo size={56} variant="gold" /></div>
        <p className="text-[16px] text-white mt-4 text-center" style={{ fontFamily: "'DM Sans'" }}>
          Analysing document pages…
        </p>
        <p className="font-arabic text-[14px] mt-1 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>
          نحلّل صفحات الوثيقة...
        </p>
      </div>
    );
  }

  // Manual page picker — shows thumbnails + scores; user can override the auto-pick.
  if (ocrStatus === "pick-pages" && pdfAnalysis) {
    const total = pdfAnalysis.totalPages;
    const recommendedSet = new Set(pdfAnalysis.recommended);
    return (
      <div className="pb-8" style={{ background: "var(--off-white)", minHeight: "100%" }}>
        <div className="px-5 pt-4">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 4 · PICK PAGES</p>
          <h2 className="text-[18px] font-bold mt-1" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
            Confirm pages to extract
          </h2>
          <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>أكّد الصفحات للاستخراج</p>
          <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>
            We picked the page(s) most likely to contain your flight ticket
            {pdfAnalysis.scannedFallback ? " (scanned PDF — using image analysis)." : "."}
            {" "}Tap a page to include or exclude it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 mt-4">
          {pdfAnalysis.pages.map(p => {
            const isSelected = selectedPages.includes(p.pageIndex);
            const isRecommended = recommendedSet.has(p.pageIndex);
            return (
              <button
                key={p.pageIndex}
                onClick={() => togglePage(p.pageIndex)}
                className="text-left rounded-xl overflow-hidden btn-press transition-all"
                style={{
                  background: "var(--white)",
                  border: isSelected ? "2px solid var(--teal-deep)" : "2px solid transparent",
                  boxShadow: isSelected ? "0 4px 14px rgba(0,77,91,0.18)" : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ position: "relative", background: "#f4f4f4" }}>
                  <img
                    src={p.thumbDataUrl}
                    alt={`Page ${p.pageIndex} of ${total}`}
                    style={{ width: "100%", display: "block", aspectRatio: p.aspect || 0.75 }}
                  />
                  <div style={{
                    position: "absolute", top: 6, left: 6,
                    background: "rgba(0,0,0,0.65)", color: "#fff",
                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                  }}>
                    {p.pageIndex} / {total}
                  </div>
                  {isRecommended && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: "var(--gold)", color: "#0D1B2A",
                      fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999,
                    }}>
                      ★ Best pick
                    </div>
                  )}
                  <div style={{
                    position: "absolute", bottom: 6, left: 6, right: 6,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{
                      background: "rgba(255,255,255,0.92)", color: "var(--navy)",
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      fontFamily: "monospace",
                    }}>
                      score {p.score.toFixed(1)}
                    </span>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999,
                      background: isSelected ? "var(--teal-deep)" : "rgba(255,255,255,0.92)",
                      border: isSelected ? "none" : "1.5px solid var(--gray)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 700,
                    }}>
                      {isSelected ? "✓" : ""}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-5 flex items-center gap-2">
          <button
            onClick={resetToRecommended}
            className="text-[11px] font-bold px-3 py-2 rounded-full btn-press"
            style={{ background: "transparent", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
          >
            Reset to best pick
          </button>
          <p className="text-[11px] ml-auto" style={{ color: "var(--gray)" }}>
            {selectedPages.length} of {total} selected
          </p>
        </div>

        <div className="px-4 mt-4">
          <button
            onClick={confirmPages}
            disabled={selectedPages.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white btn-press"
            style={{
              background: selectedPages.length === 0 ? "var(--gray-light)" : "var(--gold)",
              color: selectedPages.length === 0 ? "var(--gray)" : "#fff",
              height: 50,
            }}
          >
            <span>Run OCR on selected page{selectedPages.length === 1 ? "" : "s"}</span>
            <span className="font-arabic text-[12px]" style={{ opacity: 0.8 }}>تشغيل OCR</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  if (ocrStatus === "scanning") {
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

  // BUG 5: when failed → render ONLY the document strip + error card. Nothing below.
  if (ocrStatus === "failed") {
    const isFlightCat = category === "flight";
    return (
      <div className="pb-8" style={{ background: "var(--off-white)" }}>
        <div className="mx-4 mt-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[18px]" style={{ background: cat?.paleBg || "#E0F4F5" }}>
            {cat?.emoji || "📄"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: "var(--navy)" }}>{cat?.en || "Document"}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{fileName}</p>
          </div>
          <span className="text-[9px] px-2 py-1 rounded-full font-bold" style={{ background: "rgba(217,79,79,0.1)", color: "var(--error)" }}>⚠ Failed</span>
        </div>

        <div className="mx-4 mt-3 rounded-2xl p-4 space-y-3" style={{ background: "var(--white)", border: "1px solid rgba(217,79,79,0.25)" }}>
          <p className="text-[13px] font-bold" style={{ color: "var(--error)" }}>We couldn't read this document</p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعذّر قراءة هذه الوثيقة</p>
          <p className="text-[11px]" style={{ color: "var(--gray)" }}>
            Please try again or upload a clearer version.
          </p>
          <button
            onClick={tryAgain}
            data-testid="retry-ocr"
            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white btn-press flex items-center justify-center gap-2"
            style={{ background: "var(--teal-deep)" }}
          >
            <RotateCw size={14} /> Try OCR again · <span className="font-arabic text-[11px]">إعادة المحاولة</span>
          </button>
          {isFlightCat && (
            <button
              onClick={() => setShowManualSheet(true)}
              data-testid="open-manual-entry"
              className="w-full py-2.5 rounded-xl text-[13px] font-bold btn-press flex items-center justify-center gap-2"
              style={{ background: "transparent", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
            >
              Enter flight details manually → · <span className="font-arabic text-[11px]">أدخل التفاصيل يدويًا</span>
            </button>
          )}
        </div>

        {showManualSheet && (
          <ManualFlightEntrySheet
            initial={null}
            documentImages={analyzedImages}
            onClose={() => setShowManualSheet(false)}
            onSubmit={(payload) => {
              setShowManualSheet(false);
              const out = payload.outbound ? normalizeParsedLeg(payload.outbound) : null;
              const ret = payload.return ? normalizeParsedLeg(payload.return) : null;
              const legs = payload.legs?.map(normalizeParsedLeg);
              if (out) setOutboundFields(toFlightFieldsLite(out));
              if (ret) setReturnFields(toFlightFieldsLite(ret));
              setActiveLeg(out ? "outbound" : "return");
              onParsed?.({
                outbound: out,
                return: ret,
                legs,
                rawOutbound: payload.outbound ?? null,
                rawReturn: payload.return ?? null,
                passenger: payload.passenger,
                source: "manual",
                traveler: payload.traveler,
                pageImages: analyzedImages,
              });
              setOcrStatus("success");
            }}
          />
        )}
      </div>
    );
  }

  // SUCCESS view
  const isFlight = category === "flight";
  const hasReturn = isFlight && !!returnFields;
  const activeFields: FlightFields | null = isFlight
    ? (activeLeg === "outbound" ? outboundFields : returnFields)
    : null;

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>EXTRACTED INFORMATION</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>المعلومات المستخرجة</p>
          </div>
          {isFlight && hasReturn && (
            <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid var(--teal-deep)" }}>
              {(["outbound", "return"] as const).map(leg => (
                <button
                  key={leg}
                  onClick={() => setActiveLeg(leg)}
                  className="px-3 py-1 text-[10px] font-bold btn-press"
                  style={{
                    background: activeLeg === leg ? "var(--teal-deep)" : "transparent",
                    color: activeLeg === leg ? "#fff" : "var(--teal-deep)",
                  }}
                >
                  {leg === "outbound" ? "Outbound" : "Return"}
                </button>
              ))}
            </div>
          )}
        </div>

        {isFlight && activeFields ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {FLIGHT_FIELD_ORDER.map((key) => (
              <EditableField
                key={`${activeLeg}-${key}`}
                label={key}
                value={activeFields[key]}
                onChange={(v) => updateField(key, v)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {(genericFields ?? []).map((f, i) => (
              <div key={i}>
                <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>{f.label}</p>
                <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{f.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* BUG 3: language chip — only when we actually detected a language */}
        {detectedLanguage && (
          <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
            <span className="text-[9px]">🌐</span>
            <p className="text-[10px]" style={{ color: "var(--gray)" }}>
              Language: <strong style={{ color: "var(--navy)" }}>{detectedLanguage}</strong>
            </p>
            {wasTranslated && (
              <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(61,170,110,0.1)", color: "#3DAA6E" }}>✓ Translated</span>
            )}
          </div>
        )}
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

/* Tap-to-edit field for the Extracted Information card */
const EditableField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  return (
    <div>
      <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>{label}</p>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
          className="w-full text-[13px] font-bold bg-transparent outline-none"
          style={{ color: "var(--navy)", borderBottom: "1.5px solid var(--gold)" }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-left w-full text-[13px] font-bold btn-press"
          style={{ color: "var(--navy)" }}
        >
          {value || "—"}
        </button>
      )}
    </div>
  );
};

/* ─── STEP 5: SUCCESS ─── */
const Step5Success = ({ category, payload, pendingSegmentRef, onViewSection, onScanAnother, onDone }: {
  category: string | null;
  payload?: ScannerSavePayload | null;
  pendingSegmentRef?: string;
  onViewSection: () => void;
  onScanAnother: () => void;
  onDone: () => void;
}) => {
  const [showContent, setShowContent] = useState(false);
  const cat = categories.find(c => c.id === category);
  const section = sectionLabels[category || ""] || "Records";

  const journey = category === "flight" && payload
    ? parseFlightJourney(
        { outbound: payload.outbound ?? null, return: payload.return ?? null, legs: payload.legs, passenger: payload.passenger },
        payload.source ?? "ocr",
      )
    : null;

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

      {/* Flight journey preview — confirms what will be added to the timeline */}
      {journey && journey.legs.length > 0 && (
        <div className="w-full mt-4" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.8s" }}>
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>
            ✈️ FLIGHT JOURNEY · <span className="font-arabic">رحلتك</span>
          </p>
          <JourneyTimeline journey={journey} compact />
          {journey.source === "manual" && (
            <p className="mt-2 text-[10px] text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
              ✎ Manual Entry · <span className="font-arabic">إدخال يدوي</span>
            </p>
          )}
          {payload?.traveler && payload.traveler !== "patient" && (
            <p className="mt-1 text-[10px] text-center" style={{ color: "var(--gold)" }}>
              👥 For: {payload.traveler === "companion" ? "Companion" : "Family"}
            </p>
          )}
        </div>
      )}

      {/* Attached pages — what AI analyzed (or what user used as reference for manual entry) */}
      {payload?.pageImages && payload.pageImages.length > 0 && (
        <div className="w-full mt-4" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.85s" }} data-testid="success-attached-pages">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>
            📎 ATTACHED PAGE{payload.pageImages.length === 1 ? "" : "S"}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {payload.pageImages.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg overflow-hidden btn-press"
                style={{ width: 88, height: 112, border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <img src={src} alt={`Attached page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related documents (VISA, etc.) — flight tickets only */}
      {category === "flight" && pendingSegmentRef && (
        <div className="w-full -mx-4 mt-4" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.5s ease 0.9s" }}>
          <p className="font-mono text-[10px] tracking-widest mb-2 px-1" style={{ color: "var(--gold)" }}>
            📎 RELATED DOCUMENTS · <span className="font-arabic">مستندات مرفقة</span>
          </p>
          <p className="text-[10px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Attach VISA, passport, insurance or any related file. Stays linked to this ticket.
          </p>
          <RelatedDocumentsCard segmentRef={pendingSegmentRef} compact />
        </div>
      )}

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