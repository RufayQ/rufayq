import { useState, useRef } from "react";
import { X, RotateCw, Sun, Contrast, Crop, Palette } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

interface ScannerWizardProps {
  onClose: () => void;
  preselectedCategory?: string | null;
}

const categories = [
  { id: "flight", emoji: "✈️", en: "Flight Ticket", ar: "تذكرة طيران", color: "#004D5B", paleBg: "#E0F4F5",
    subs: ["One Way", "Round Trip", "Connecting", "Transit Visa"] },
  { id: "train", emoji: "🚄", en: "Train / Bus", ar: "تذكرة قطار / باص", color: "#1A3A4A", paleBg: "#E8EEF2",
    subs: ["Train", "Bus", "Ferry", "Other"] },
  { id: "hotel", emoji: "🏨", en: "Hotel / Stay", ar: "فندق / إقامة", color: "#2A1A35", paleBg: "#EEE8F2",
    subs: ["Hotel", "Apartment", "Hospital", "Private House"] },
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

const ScannerWizard = ({ onClose, preselectedCategory }: ScannerWizardProps) => {
  const [step, setStep] = useState(1);
  const [capturedFile, setCapturedFile] = useState<{ name: string; type: string; size: string } | null>(null);
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
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile({ name: file.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB` });
      setStep(2);
    }
  };

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col animate-slide-in-right" style={{ background: "#0D1B2A" }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 52, background: "#0D1B2A" }}>
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
          <Step2Review file={capturedFile} onRetake={() => setStep(1)} onConfirm={() => {
            if (preselectedCategory) {
              setSelectedCategory(preselectedCategory);
            }
            setStep(3);
          }} />
        )}
        {step === 3 && (
          <Step3Category
            selected={selectedCategory}
            selectedSub={selectedSub}
            onSelect={(id) => { setSelectedCategory(id); setSelectedSub(null); }}
            onSelectSub={setSelectedSub}
            onContinue={() => {
              // Steps 4-5 will be in Part C
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ─── STEP 1: CAPTURE ─── */
const Step1Capture = ({ onCapture }: { onCapture: (accept: string) => void }) => (
  <div className="flex flex-col items-center justify-center px-6 py-10" style={{ minHeight: "100%" }}>
    <div className="logo-pulse">
      <RufayQLogo size={52} variant="gold" />
    </div>
    <h2 className="font-display text-[32px] text-white mt-5 text-center" style={{ fontWeight: 300 }}>Scan or Import</h2>
    <p className="font-arabic text-[18px] mt-2 text-center" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>امسح أو استورد وثيقتك</p>

    <div className="w-full space-y-3 mt-8">
      {[
        { emoji: "📷", en: "Scan with Camera", ar: "امسح بالكاميرا", gradient: "linear-gradient(135deg, #004D5B, #006D7C)", accept: "image/*;capture=camera" },
        { emoji: "🖼️", en: "Choose from Photos", ar: "اختر من الصور", gradient: "linear-gradient(135deg, #1A2A3A, #0D1B2A)", accept: "image/*" },
        { emoji: "📁", en: "Upload PDF or Document", ar: "ارفع PDF أو وثيقة", gradient: "linear-gradient(135deg, #2A1A3A, #1A0D24)", accept: ".pdf,.doc,.docx,.jpg,.png,.jpeg" },
        { emoji: "☁️", en: "Import from Cloud", ar: "استورد من السحابة", gradient: "linear-gradient(135deg, #1A2A14, #0D1A08)", accept: "*/*", sub: "Google Drive · iCloud · Dropbox · Email" },
      ].map((opt) => (
        <button
          key={opt.en}
          onClick={() => onCapture(opt.accept)}
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

/* ─── STEP 2: REVIEW ─── */
const Step2Review = ({ file, onRetake, onConfirm }: { file: { name: string; type: string; size: string }; onRetake: () => void; onConfirm: () => void }) => {
  const isImage = file.type.startsWith("image");

  return (
    <div className="flex flex-col h-full" style={{ background: "#0D1B2A" }}>
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center px-6 py-6 relative">
        {isImage ? (
          <div className="w-full rounded-2xl overflow-hidden relative" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.05)", border: "2px solid var(--gold)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">📄</span>
            </div>
            {/* Corner handles */}
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

      {/* Enhance toolbar (images only) */}
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

      {/* Bottom actions */}
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
      {/* Header */}
      <div className="px-5 py-4" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}>
        <p className="text-[20px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>What type of document is this?</p>
        <p className="font-arabic text-[15px]" dir="rtl" style={{ color: "var(--gray)" }}>ما نوع هذه الوثيقة؟</p>
      </div>

      {/* AI Detection Banner */}
      <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--teal-light)", borderLeft: "3px solid var(--teal-deep)" }}>
        <RufayQLogo size={16} variant="dark" />
        <div className="flex-1">
          <p className="text-[13px]" style={{ color: "var(--teal-deep)" }}>RufayQ thinks this is a <strong>medical document</strong></p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>رُفَيِّق يرى أن هذه وثيقة طبية</p>
        </div>
      </div>

      {/* Category Grid */}
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

      {/* Sub-categories */}
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

      {/* Continue Button */}
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

export default ScannerWizard;
