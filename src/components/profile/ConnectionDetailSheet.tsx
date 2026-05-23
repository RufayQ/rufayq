/**
 * ConnectionDetailSheet — view + edit a saved connection. Lets the user
 * re-classify, edit note, copy/share the contact's QR link again, or remove.
 */
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Share2, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORY_META, FAMILY_RELATION_META, PROVIDER_KIND_META,
  encodeQrPayload, connectionToQrPayload, updateConnection, removeConnection,
  type Connection, type ConnectionCategory, type FamilyRelation, type ProviderKind,
} from "@/lib/connections/connectionsStore";

interface Props {
  connection: Connection;
  onClose: () => void;
  onChanged: () => void;
}

const ConnectionDetailSheet = ({ connection, onClose, onChanged }: Props) => {
  const [category, setCategory] = useState<ConnectionCategory>(connection.category);
  const [providerKind, setProviderKind] = useState<ProviderKind>(connection.providerKind ?? "doctor");
  const [familyRelation, setFamilyRelation] = useState<FamilyRelation>(connection.familyRelation ?? "relative");
  const [note, setNote] = useState(connection.note ?? "");

  const encoded = useMemo(() => encodeQrPayload(connectionToQrPayload(connection)), [connection]);

  const copy = () => { navigator.clipboard?.writeText(encoded); toast.success("Link copied · تم النسخ"); };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "RufayQ Connect", text: `${connection.name} on RufayQ`, url: encoded });
        return;
      }
    } catch { /* cancelled */ }
    copy();
  };

  const save = () => {
    updateConnection(connection.id, {
      category, note: note.trim() || undefined,
      providerKind: category === "provider" ? providerKind : undefined,
      familyRelation: category === "family" ? familyRelation : undefined,
    });
    toast.success("Saved · تم الحفظ");
    onChanged();
    onClose();
  };

  const remove = () => {
    if (!confirm(`Remove ${connection.name}?`)) return;
    removeConnection(connection.id);
    toast.success("Removed · تم الحذف");
    onChanged();
    onClose();
  };

  const CatPill = ({ id }: { id: ConnectionCategory }) => {
    const m = CATEGORY_META[id];
    const active = category === id;
    return (
      <button onClick={() => setCategory(id)} className="flex-1 py-2.5 rounded-xl text-center btn-press"
        style={{ background: active ? m.tone : "var(--off-white)", color: active ? "#fff" : "var(--navy)", border: `1px solid ${active ? m.tone : "var(--gray-light)"}` }}>
        <div className="text-base leading-none mb-0.5">{m.emoji}</div>
        <div className="text-[11px] font-semibold">{m.en}</div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.65)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5 max-h-[92vh] overflow-y-auto" style={{ background: "var(--white)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />

        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="font-display text-[17px] truncate" style={{ color: "var(--navy)" }}>{connection.name}</p>
            {connection.nameAr && <p className="font-arabic text-[11px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{connection.nameAr}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press shrink-0" style={{ background: "var(--gray-light)" }}><X size={16} /></button>
        </div>

        {/* QR re-share */}
        <div className="rounded-2xl p-4 flex flex-col items-center mb-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
          <div className="p-2 rounded-lg" style={{ background: "#fff" }}>
            <QRCodeSVG value={encoded} size={140} level="M" bgColor="#ffffff" fgColor="#06101A" includeMargin={false} />
          </div>
          {(connection.phone || connection.email) && (
            <p className="font-mono text-[10px] mt-2" style={{ color: "var(--gray)" }}>{connection.phone || connection.email}</p>
          )}
          <div className="grid grid-cols-2 gap-2 w-full mt-3">
            <button onClick={copy} className="py-2 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-semibold btn-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
              <Copy size={13} /> Copy
            </button>
            <button onClick={share} className="py-2 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white btn-press" style={{ background: "var(--teal-deep)" }}>
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>

        <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>RELATIONSHIP · التصنيف</p>
        <div className="flex gap-2 mb-3">
          <CatPill id="family" /><CatPill id="provider" /><CatPill id="friend" />
        </div>

        {category === "provider" && (
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
        )}

        {category === "family" && (
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
        )}

        <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>NOTE · ملاحظة</p>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional · اختياري"
          className="w-full px-3 py-2 rounded-lg text-[12px] outline-none mb-4"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button onClick={save} className="py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 btn-press" style={{ background: "var(--teal-deep)" }}>
            <Check size={16} /> Save · حفظ
          </button>
          <button onClick={remove} className="px-4 rounded-xl btn-press flex items-center justify-center" style={{ background: "var(--white)", border: "1px solid var(--error)", color: "var(--error)" }} aria-label="Remove">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDetailSheet;
