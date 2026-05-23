/**
 * AddConnectionSheet — shown right after a successful QR scan. Forces the
 * user to classify the new contact as family / provider / friend (per the
 * product spec), then persists the connection.
 */
import { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORY_META, FAMILY_RELATION_META, PROVIDER_KIND_META,
  addConnection, type ConnectionCategory, type FamilyRelation,
  type ProviderKind, type QrPayload,
} from "@/lib/connections/connectionsStore";

interface Props {
  payload: QrPayload;
  onClose: () => void;
  onSaved: () => void;
}

const AddConnectionSheet = ({ payload, onClose, onSaved }: Props) => {
  const [category, setCategory] = useState<ConnectionCategory | null>(null);
  const [providerKind, setProviderKind] = useState<ProviderKind>("doctor");
  const [familyRelation, setFamilyRelation] = useState<FamilyRelation>("relative");
  const [note, setNote] = useState("");

  const save = () => {
    if (!category) { toast.error("Choose a relationship · اختر التصنيف"); return; }
    addConnection({
      handle: payload.handle,
      name: payload.name,
      nameAr: payload.nameAr,
      phone: payload.phone,
      email: payload.email,
      category,
      providerKind: category === "provider" ? providerKind : undefined,
      familyRelation: category === "family" ? familyRelation : undefined,
      note: note.trim() || undefined,
    });
    toast.success(`Added ${payload.name} · تمت الإضافة`);
    onSaved();
  };

  const CatPill = ({ id }: { id: ConnectionCategory }) => {
    const m = CATEGORY_META[id];
    const active = category === id;
    return (
      <button
        onClick={() => setCategory(id)}
        className="flex-1 py-3 rounded-xl text-center btn-press transition-all"
        style={{
          background: active ? m.tone : "var(--off-white)",
          color: active ? "#fff" : "var(--navy)",
          border: `1px solid ${active ? m.tone : "var(--gray-light)"}`,
        }}
      >
        <div className="text-lg leading-none mb-0.5">{m.emoji}</div>
        <div className="text-[12px] font-semibold">{m.en}</div>
        <div className="font-arabic text-[10px]" dir="rtl" style={{ opacity: 0.85 }}>{m.ar}</div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.65)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5" style={{ background: "var(--white)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[17px]" style={{ color: "var(--navy)" }}>Add connection</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة جهة اتصال جديدة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}><X size={16} /></button>
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>{payload.name}</p>
          {payload.nameAr && <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{payload.nameAr}</p>}
          {(payload.phone || payload.email) && (
            <p className="font-mono text-[10px] mt-1" style={{ color: "var(--gray)" }}>
              {payload.phone || payload.email}
            </p>
          )}
        </div>

        <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>RELATIONSHIP · التصنيف</p>
        <div className="flex gap-2 mb-3">
          <CatPill id="family" />
          <CatPill id="provider" />
          <CatPill id="friend" />
        </div>

        {category === "provider" && (
          <>
            <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>PROVIDER TYPE · نوع المزوّد</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(Object.keys(PROVIDER_KIND_META) as ProviderKind[]).map((k) => {
                const active = providerKind === k;
                return (
                  <button key={k} onClick={() => setProviderKind(k)} className="py-2 rounded-lg text-[11px] btn-press"
                    style={{ background: active ? "var(--teal-deep)" : "var(--off-white)", color: active ? "#fff" : "var(--navy)", border: `1px solid ${active ? "var(--teal-deep)" : "var(--gray-light)"}` }}>
                    {PROVIDER_KIND_META[k].en}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {category === "family" && (
          <>
            <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>RELATION · صلة القرابة</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(Object.keys(FAMILY_RELATION_META) as FamilyRelation[]).map((k) => {
                const active = familyRelation === k;
                return (
                  <button key={k} onClick={() => setFamilyRelation(k)} className="py-2 rounded-lg text-[11px] btn-press"
                    style={{ background: active ? "var(--gold)" : "var(--off-white)", color: active ? "#fff" : "var(--navy)", border: `1px solid ${active ? "var(--gold)" : "var(--gray-light)"}` }}>
                    {FAMILY_RELATION_META[k].en}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>NOTE · ملاحظة</p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional · اختياري"
          className="w-full px-3 py-2 rounded-lg text-[12px] outline-none mb-4"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
        />

        <button onClick={save} disabled={!category} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 btn-press"
          style={{ background: category ? "var(--teal-deep)" : "var(--gray)", opacity: category ? 1 : 0.7 }}>
          <Check size={16} /> Save connection · حفظ
        </button>
      </div>
    </div>
  );
};

export default AddConnectionSheet;
