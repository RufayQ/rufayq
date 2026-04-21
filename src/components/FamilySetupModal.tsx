/**
 * 4-step Family setup modal — organizer fills full medical profile per member.
 * On finish: creates a Family subscription + 4 family_members rows + family_setup billing event.
 * Admin worklist picks it up under Subscriptions → Pending Family setups.
 */
import { useState } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Check, Users, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

const GOLD = "#C5965A", BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.25)", TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)";

interface MemberDraft {
  full_name: string;
  full_name_ar: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  national_id: string;
  nationality: string;
  blood_type: string;
  chronic_conditions: string;
  allergies: string;
  current_medications: string;
  surgical_history: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
}

const emptyMember = (): MemberDraft => ({
  full_name: "", full_name_ar: "", relationship: "child", date_of_birth: "",
  gender: "", phone: "", email: "", national_id: "", nationality: "Saudi Arabia",
  blood_type: "", chronic_conditions: "", allergies: "", current_medications: "",
  surgical_history: "", emergency_contact_name: "", emergency_contact_phone: "",
  emergency_contact_relation: "", notes: "",
});

interface Props {
  open: boolean;
  onClose: () => void;
  billingCycle: "monthly" | "annual";
}

const FamilySetupModal = ({ open, onClose, billingCycle }: Props) => {
  const { mode } = useLanguage();
  const { currency, getPrice, format } = useCurrency();
  const isAr = mode === "ar";
  const [step, setStep] = useState(1);
  const [members, setMembers] = useState<MemberDraft[]>([emptyMember()]);
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const price = getPrice("family", billingCycle);
  const periodLabel = billingCycle === "monthly" ? (isAr ? "/شهر" : "/mo") : (isAr ? "/سنة" : "/yr");

  const setMember = (i: number, patch: Partial<MemberDraft>) => {
    setMembers((arr) => arr.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const addMember = () => {
    if (members.length >= 4) return toast.error(isAr ? "حتى ٤ مرضى فقط" : "Max 4 members");
    setMembers([...members, emptyMember()]);
    setActiveMemberIdx(members.length);
  };
  const removeMember = (i: number) => {
    if (members.length <= 1) return;
    setMembers(members.filter((_, idx) => idx !== i));
    setActiveMemberIdx(Math.max(0, activeMemberIdx - (i <= activeMemberIdx ? 1 : 0)));
  };

  const validateStep2 = () => {
    for (const m of members) {
      if (!m.full_name.trim() || !m.relationship) {
        toast.error(isAr ? "أكمل اسم وصلة كل فرد" : "Fill name + relationship for each member");
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    if (!accept) return toast.error(isAr ? "وافق على الشروط" : "Please accept terms");
    setBusy(true);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud?.user;
      if (!user) {
        toast.error(isAr ? "سجل دخولك أولاً" : "Please sign in first");
        setBusy(false);
        return;
      }

      // Upsert subscription
      const periodEnd = new Date();
      if (billingCycle === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          device_id: `auth_${user.id}`,
          plan: "family",
          status: "pending_setup",
          billing_cycle: billingCycle,
          currency,
          amount: price,
          family_seat_capacity: 4,
          family_setup_completed: false,
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .single();
      if (subErr) throw subErr;

      // Wipe existing pending members for this org and reinsert
      await supabase.from("family_members").delete().eq("subscription_id", sub.id).eq("status", "active");

      const rows = members.map((m) => ({
        subscription_id: sub.id,
        organizer_id: user.id,
        full_name: m.full_name,
        full_name_ar: m.full_name_ar || null,
        relationship: m.relationship,
        date_of_birth: m.date_of_birth || null,
        gender: m.gender || null,
        phone: m.phone || null,
        email: m.email || null,
        national_id: m.national_id || null,
        nationality: m.nationality || null,
        blood_type: m.blood_type || null,
        chronic_conditions: m.chronic_conditions ? m.chronic_conditions.split(",").map(s => s.trim()).filter(Boolean) : null,
        allergies: m.allergies ? m.allergies.split(",").map(s => s.trim()).filter(Boolean) : null,
        current_medications: m.current_medications ? m.current_medications.split(",").map(s => s.trim()).filter(Boolean) : null,
        surgical_history: m.surgical_history || null,
        emergency_contact_name: m.emergency_contact_name || null,
        emergency_contact_phone: m.emergency_contact_phone || null,
        emergency_contact_relation: m.emergency_contact_relation || null,
        notes: m.notes || null,
        status: "active",
      }));
      const { error: memErr } = await supabase.from("family_members").insert(rows);
      if (memErr) throw memErr;

      await supabase.from("billing_events").insert({
        subscription_id: sub.id,
        user_id: user.id,
        event_type: "family_setup",
        amount: price,
        currency,
        details: { members: members.length, cycle: billingCycle },
      });

      toast.success(isAr ? "تم إعداد عائلتك ✓" : "Family setup submitted ✓", {
        description: isAr ? "سيتواصل فريقنا خلال ساعة لتأكيد التفعيل" : "Our team will confirm activation within 1 hour",
      });
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  };

  const stepTitles = isAr
    ? ["مراجعة الباقة", "إضافة المرضى", "السجل الطبي", "تأكيد"]
    : ["Plan review", "Add patients", "Medical history", "Confirm"];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: "rgba(6,16,26,0.85)", backdropFilter: "blur(8px)" }}
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh]"
           style={{ background: BG, border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: GOLD }}>{isAr ? "إعداد فاميلي" : "FAMILY SETUP"}</p>
            <h2 className="font-display text-xl" style={{ color: TEXT }}>{stepTitles[step - 1] || stepTitles[0]}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5"><X size={18} color={MUTED}/></button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: BG2 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
                 style={{ background: s <= step ? GOLD : "rgba(232,236,240,0.1)" }} />
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1" dir={isAr ? "rtl" : "ltr"}>
          {/* STEP 1 — Plan review */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${GOLD}22, ${BG2})`, border: `1px solid ${GOLD}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: GOLD }}>{isAr ? "حتى ٤ مرضى" : "UP TO 4 PATIENTS"}</p>
                    <h3 className="font-display text-2xl" style={{ color: TEXT }}>{isAr ? "خطة فاميلي" : "Family Plan"}</h3>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold" style={{ color: GOLD }}>{format(price)}</p>
                    <p className="text-xs" style={{ color: MUTED }}>{periodLabel}</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: TEXT }}>
                  {(isAr ? [
                    "كل مزايا كومبانيون لكل فرد",
                    "حتى ٤ ملفات مرضى مستقلة",
                    "خط زمني عائلي موحّد",
                    "جلستان مع المستشار الطبي شهرياً",
                    "تنبيهات وإسناد مهام للمرافقين",
                  ] : [
                    "Everything in Companion for every member",
                    "Up to 4 independent patient profiles",
                    "Consolidated family timeline",
                    "2 Medical Consultant sessions / month",
                    "Caregiver notifications + task assignment",
                  ]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2"><Check size={14} color={GOLD} className="mt-0.5 flex-shrink-0"/><span>{f}</span></li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl p-4 text-xs" style={{ background: BG2, color: MUTED, border: `1px solid ${BORDER}` }}>
                {isAr
                  ? "كمنظّم العائلة، ستملأ المعلومات الطبية الكاملة لكل مريض. يمكنك إضافة وإزالة الأفراد وتعديل بياناتهم لاحقاً من لوحة الاشتراك."
                  : "As the family organizer, you'll fill in full medical info for each patient. You can add, remove, or edit members later from your subscription dashboard."}
              </div>
            </div>
          )}

          {/* STEP 2 — Add patients (basic) */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: MUTED }}>
                  {isAr ? `${members.length} من ٤ مرضى` : `${members.length} of 4 patients`}
                </p>
                <button onClick={addMember} disabled={members.length >= 4}
                        className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full disabled:opacity-30"
                        style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}` }}>
                  <Plus size={12}/> {isAr ? "إضافة" : "Add"}
                </button>
              </div>
              {members.map((m, i) => (
                <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px]" style={{ color: GOLD }}>#{i + 1} · {(isAr ? "مريض" : "Patient")}</p>
                    {members.length > 1 && (
                      <button onClick={() => removeMember(i)} className="text-rose-400 p-1 hover:bg-rose-500/10 rounded">
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={m.full_name} onChange={(v) => setMember(i, { full_name: v })} placeholder={isAr ? "الاسم *" : "Full name *"} />
                    <Select value={m.relationship} onChange={(v) => setMember(i, { relationship: v })}
                            options={isAr
                              ? [["spouse","زوج/زوجة"],["child","ابن/ابنة"],["parent","والد/والدة"],["sibling","شقيق/شقيقة"],["other","آخر"]]
                              : [["spouse","Spouse"],["child","Child"],["parent","Parent"],["sibling","Sibling"],["other","Other"]]} />
                    <Input value={m.date_of_birth} onChange={(v) => setMember(i, { date_of_birth: v })} placeholder={isAr ? "تاريخ الميلاد" : "DOB"} type="date" />
                    <Select value={m.gender} onChange={(v) => setMember(i, { gender: v })}
                            options={isAr ? [["","الجنس"],["male","ذكر"],["female","أنثى"]] : [["","Gender"],["male","Male"],["female","Female"]]} />
                    <Input value={m.phone} onChange={(v) => setMember(i, { phone: v })} placeholder={isAr ? "الجوال" : "Mobile"} />
                    <Input value={m.national_id} onChange={(v) => setMember(i, { national_id: v })} placeholder={isAr ? "الهوية / جواز السفر" : "ID / Passport"} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3 — Medical history per member (tabs) */}
          {step === 3 && (
            <div>
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {members.map((m, i) => (
                  <button key={i} onClick={() => setActiveMemberIdx(i)}
                          className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                          style={{
                            background: activeMemberIdx === i ? GOLD : "transparent",
                            color: activeMemberIdx === i ? "#06101A" : MUTED,
                            border: `1px solid ${activeMemberIdx === i ? GOLD : BORDER}`,
                          }}>
                    {m.full_name || `#${i + 1}`}
                  </button>
                ))}
              </div>
              {(() => {
                const m = members[activeMemberIdx];
                const set = (p: Partial<MemberDraft>) => setMember(activeMemberIdx, p);
                return (
                  <div className="space-y-3 rounded-xl p-4" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
                    <Section icon={<Heart size={12} color={GOLD}/>} label={isAr ? "صحة" : "Medical"}>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={m.blood_type} onChange={(v) => set({ blood_type: v })}
                                options={[["","Blood type"],["A+","A+"],["A-","A-"],["B+","B+"],["B-","B-"],["O+","O+"],["O-","O-"],["AB+","AB+"],["AB-","AB-"]]} />
                        <Input value={m.allergies} onChange={(v) => set({ allergies: v })} placeholder={isAr ? "حساسية (افصل بفاصلة)" : "Allergies (comma separated)"} />
                        <Input value={m.chronic_conditions} onChange={(v) => set({ chronic_conditions: v })} placeholder={isAr ? "أمراض مزمنة" : "Chronic conditions"} />
                        <Input value={m.current_medications} onChange={(v) => set({ current_medications: v })} placeholder={isAr ? "أدوية حالية" : "Current medications"} />
                      </div>
                      <Textarea value={m.surgical_history} onChange={(v) => set({ surgical_history: v })} placeholder={isAr ? "تاريخ جراحي" : "Surgical history"} />
                    </Section>
                    <Section icon={<Users size={12} color={GOLD}/>} label={isAr ? "جهة طوارئ" : "Emergency contact"}>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={m.emergency_contact_name} onChange={(v) => set({ emergency_contact_name: v })} placeholder={isAr ? "الاسم" : "Name"} />
                        <Input value={m.emergency_contact_phone} onChange={(v) => set({ emergency_contact_phone: v })} placeholder={isAr ? "الجوال" : "Phone"} />
                      </div>
                      <Input value={m.emergency_contact_relation} onChange={(v) => set({ emergency_contact_relation: v })} placeholder={isAr ? "الصلة" : "Relation"} />
                    </Section>
                    <Textarea value={m.notes} onChange={(v) => set({ notes: v })} placeholder={isAr ? "ملاحظات إضافية" : "Additional notes"} />
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 4 — Confirm */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}` }}>
                <Check size={28} color={GOLD}/>
              </div>
              <h3 className="font-display text-2xl mb-2" style={{ color: TEXT }}>
                {isAr ? "تم إرسال طلبك ✓" : "Setup submitted ✓"}
              </h3>
              <p className="text-sm mb-6" style={{ color: MUTED }}>
                {isAr ? "سيتواصل فريقنا خلال ساعة لتأكيد التفعيل والدفع." : "Our team will confirm activation and payment within 1 hour."}
              </p>
              <a href="/app/dashboard/subscription" className="inline-block px-5 py-2.5 rounded-full text-xs font-semibold" style={{ background: GOLD, color: "#06101A" }}>
                {isAr ? "اذهب إلى لوحة الاشتراك" : "Go to subscription dashboard"}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="border-t p-4 flex items-center justify-between gap-3" style={{ borderColor: BORDER, background: BG2 }}>
            <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                    className="text-xs flex items-center gap-1 px-3 py-2 rounded-full" style={{ color: MUTED }}>
              <ChevronLeft size={14}/> {step === 1 ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "السابق" : "Back")}
            </button>
            {step === 3 && (
              <label className="text-[11px] flex items-center gap-2 cursor-pointer" style={{ color: MUTED }}>
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)}/>
                {isAr ? "أوافق على الشروط والخصوصية" : "I accept Terms & Privacy"}
              </label>
            )}
            <button
              disabled={busy || (step === 3 && !accept)}
              onClick={() => {
                if (step === 1) setStep(2);
                else if (step === 2) { if (validateStep2()) setStep(3); }
                else if (step === 3) submit();
              }}
              className="text-xs font-semibold flex items-center gap-1 px-5 py-2 rounded-full disabled:opacity-40"
              style={{ background: GOLD, color: "#06101A" }}>
              {step === 3 ? (busy ? "..." : (isAr ? "إنهاء وإرسال" : "Finish & submit")) : (isAr ? "التالي" : "Next")} <ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Input = ({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
    className="w-full px-3 py-2 rounded-lg text-xs"
    style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
);
const Textarea = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
    className="w-full px-3 py-2 rounded-lg text-xs resize-none"
    style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
);
const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs"
    style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);
const Section = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-mono tracking-widest flex items-center gap-1" style={{ color: GOLD }}>{icon}{label}</p>
    {children}
  </div>
);

export default FamilySetupModal;
