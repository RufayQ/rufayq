/**
 * EmergencyContactsSheet — bilingual manager for the patient's emergency
 * contacts, grouped by relation category. Stored in localStorage scoped to
 * the current user / device so it survives reloads without requiring a
 * dedicated DB table (per-user table can come later if needed).
 *
 * Shape:
 *   { id, name, phone, category, customLabel? }
 * Categories: relative · spouse · family · doctor · provider · custom
 */
import { useEffect, useState } from "react";
import { X, Plus, Trash2, Phone, Edit3 } from "lucide-react";
import { toast } from "sonner";

export type EmergencyCategory = "relative" | "spouse" | "family" | "doctor" | "provider" | "custom";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  category: EmergencyCategory;
  customLabel?: string;
}

export const CATEGORY_META: Record<EmergencyCategory, { en: string; ar: string; emoji: string; color: string }> = {
  relative: { en: "Relative", ar: "قريب", emoji: "👤", color: "var(--teal-deep)" },
  spouse:   { en: "Wife / Spouse", ar: "زوجة / زوج", emoji: "💞", color: "#D94F4F" },
  family:   { en: "Family", ar: "العائلة", emoji: "👨‍👩‍👧", color: "var(--gold)" },
  doctor:   { en: "Doctor", ar: "طبيب", emoji: "🩺", color: "var(--success)" },
  provider: { en: "Provider", ar: "مزوّد", emoji: "🏥", color: "var(--teal-mid)" },
  custom:   { en: "Custom", ar: "مخصّص", emoji: "⭐", color: "var(--navy)" },
};

const STORAGE_KEY = "rufayq_emergency_contacts_v1";

export const loadEmergencyContacts = (): EmergencyContact[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const saveContacts = (list: EmergencyContact[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* noop */ }
};

interface Props {
  onClose: () => void;
  onChange?: (list: EmergencyContact[]) => void;
}

const EmergencyContactsSheet = ({ onClose, onChange }: Props) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);

  useEffect(() => { setContacts(loadEmergencyContacts()); }, []);

  const persist = (next: EmergencyContact[]) => {
    setContacts(next);
    saveContacts(next);
    onChange?.(next);
  };

  const startNew = () => {
    setEditing({ id: crypto.randomUUID(), name: "", phone: "", category: "relative" });
  };

  const submit = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) {
      toast.error("Name and phone are required · الاسم والرقم مطلوبان");
      return;
    }
    if (editing.category === "custom" && !editing.customLabel?.trim()) {
      toast.error("Add a label for the custom contact · أضِف تسمية للجهة المخصصة");
      return;
    }
    const exists = contacts.some((c) => c.id === editing.id);
    const next = exists
      ? contacts.map((c) => (c.id === editing.id ? editing : c))
      : [editing, ...contacts];
    persist(next);
    setEditing(null);
    toast.success(exists ? "Contact updated · تم التحديث" : "Contact added · تمت الإضافة");
  };

  const remove = (id: string) => {
    if (!confirm("Remove this emergency contact?")) return;
    persist(contacts.filter((c) => c.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-3xl flex flex-col"
        style={{ background: "var(--off-white)", maxHeight: "88vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--gray-light)" }}>
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>EMERGENCY CONTACTS</p>
            <p className="font-display text-lg" style={{ color: "var(--navy)" }}>Who to call in emergencies</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>من تتصل بهم في الحالات الطارئة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}>
            <X size={16} style={{ color: "var(--navy)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {editing ? (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>CATEGORY · التصنيف</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_META) as EmergencyCategory[]).map((cat) => {
                    const m = CATEGORY_META[cat];
                    const sel = editing.category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setEditing({ ...editing, category: cat })}
                        className="rounded-xl py-2.5 flex flex-col items-center gap-1 card-press"
                        style={{
                          background: sel ? "var(--teal-light)" : "var(--off-white)",
                          border: sel ? `2px solid ${m.color}` : "1px solid var(--gray-light)",
                        }}
                      >
                        <span className="text-lg leading-none">{m.emoji}</span>
                        <span className="text-[10px] font-bold" style={{ color: "var(--navy)" }}>{m.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {editing.category === "custom" && (
                <div>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>CUSTOM LABEL · التسمية</p>
                  <input
                    value={editing.customLabel || ""}
                    onChange={(e) => setEditing({ ...editing, customLabel: e.target.value })}
                    placeholder="e.g. Neighbor, Driver, Embassy…"
                    className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                  />
                </div>
              )}

              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>NAME · الاسم</p>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                />
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>PHONE · الجوال</p>
                <input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  inputMode="tel"
                  placeholder="+966 5X XXX XXXX"
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none font-mono"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-medium btn-press"
                  style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}
                >
                  Cancel · إلغاء
                </button>
                <button
                  onClick={submit}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white btn-press"
                  style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}
                >
                  Save · حفظ
                </button>
              </div>
            </div>
          ) : (
            <>
              {contacts.length === 0 ? (
                <div className="text-center py-10 rounded-xl" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                  <span className="text-3xl">🆘</span>
                  <p className="text-[14px] font-semibold mt-2" style={{ color: "var(--navy)" }}>No emergency contacts yet</p>
                  <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد جهات اتصال طارئة بعد</p>
                  <p className="text-[11px] mt-1.5 max-w-[260px] mx-auto" style={{ color: "var(--gray)" }}>
                    Add the people you'd want contacted in case of an emergency — relatives, doctors, your provider.
                  </p>
                </div>
              ) : (
                contacts.map((c) => {
                  const m = CATEGORY_META[c.category];
                  return (
                    <div key={c.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: "rgba(197,150,90,0.08)" }}
                      >
                        {m.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{c.name}</p>
                        <p className="text-[10px]" style={{ color: m.color }}>
                          {c.category === "custom" ? c.customLabel || m.en : m.en} · <span className="font-arabic" dir="rtl">{m.ar}</span>
                        </p>
                        <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="font-mono text-[11px] truncate inline-flex items-center gap-1 btn-press" style={{ color: "var(--teal-deep)" }}>
                          <Phone size={10} /> {c.phone}
                        </a>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg btn-press" style={{ background: "var(--off-white)" }}>
                          <Edit3 size={12} style={{ color: "var(--gray)" }} />
                        </button>
                        <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg btn-press" style={{ background: "rgba(217,79,79,0.08)" }}>
                          <Trash2 size={12} style={{ color: "#D94F4F" }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!editing && (
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--gray-light)", background: "var(--white)" }}>
            <button
              onClick={startNew}
              className="w-full py-3 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 btn-press"
              style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}
            >
              <Plus size={14} /> Add emergency contact · إضافة جهة طوارئ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyContactsSheet;
