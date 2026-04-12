import RufayQLogo from "@/components/RufayQLogo";

const CareHubScreen = () => (
  <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
    {/* Header */}
    <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "linear-gradient(135deg, var(--gold), #A07A3A)" }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>05 — CARE HUB</p>
      <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Care Hub</p>
      <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>مركز الرعاية</p>
    </div>

    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
      {/* Vitals Summary */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>VITALS OVERVIEW</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Blood Pressure", value: "120/80", unit: "mmHg", emoji: "❤️", ar: "ضغط الدم" },
            { label: "Heart Rate", value: "72", unit: "bpm", emoji: "💓", ar: "نبض القلب" },
            { label: "Temperature", value: "36.8", unit: "°C", emoji: "🌡️", ar: "الحرارة" },
            { label: "Pain Level", value: "3", unit: "/10", emoji: "😐", ar: "مستوى الألم" },
          ].map((v) => (
            <div key={v.label} className="rounded-xl p-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <span className="text-lg">{v.emoji}</span>
              <p className="text-[18px] font-bold mt-1" style={{ color: "var(--navy)" }}>{v.value}<span className="text-[11px] font-normal" style={{ color: "var(--gray)" }}> {v.unit}</span></p>
              <p className="text-[10px]" style={{ color: "var(--gray)" }}>{v.label}</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{v.ar}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Care Plan */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>CARE PLAN</p>
        <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Post-Surgery Recovery</p>
        <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>خطة التعافي بعد العملية</p>
        <div className="mt-3 space-y-2">
          {[
            { task: "Physical therapy — 3x/week", ar: "علاج طبيعي — ٣ مرات أسبوعياً", done: true },
            { task: "Wound check — daily", ar: "فحص الجرح — يومياً", done: true },
            { task: "Ice pack — 4x/day", ar: "كمادة ثلج — ٤ مرات يومياً", done: false },
            { task: "Leg elevation — 3x/day", ar: "رفع الرجل — ٣ مرات يومياً", done: false },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--off-white)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: t.done ? "var(--success)" : "var(--gray-light)", color: t.done ? "#fff" : "var(--gray)" }}>
                {t.done ? "✓" : ""}
              </div>
              <div className="flex-1">
                <p className="text-[12px]" style={{ color: t.done ? "var(--gray)" : "var(--navy)", textDecoration: t.done ? "line-through" : "none" }}>{t.task}</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{t.ar}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>EMERGENCY CONTACTS</p>
        {[
          { name: "Dr. Klaus Mueller", role: "Treating Physician", phone: "+4930450", emoji: "👨‍⚕️", ar: "الطبيب المعالج" },
          { name: "Charité Hospital", role: "Main Hospital", phone: "+493045050", emoji: "🏥", ar: "المستشفى الرئيسي" },
          { name: "Saudi Embassy Berlin", role: "Embassy", phone: "+493050200", emoji: "🇸🇦", ar: "السفارة السعودية" },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < 2 ? "1px solid var(--gray-light)" : "none" }}>
            <span className="text-xl">{c.emoji}</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{c.name}</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{c.ar}</p>
            </div>
            <a href={`tel:${c.phone}`} className="px-3 py-1.5 rounded-full text-[10px] font-bold btn-press" style={{ background: "var(--success)", color: "#fff" }}>📞 Call</a>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CareHubScreen;
