/**
 * ConnectionsCard — shown inside ProfileScreen. Surfaces the user's QR,
 * scan entry-point, and the list of saved connections grouped by category.
 */
import { useEffect, useState } from "react";
import { QrCode, ScanLine, ChevronRight, UserPlus } from "lucide-react";
import QrShareSheet from "@/components/profile/QrShareSheet";
import QrScanSheet from "@/components/profile/QrScanSheet";
import AddConnectionSheet from "@/components/profile/AddConnectionSheet";
import ConnectionDetailSheet from "@/components/profile/ConnectionDetailSheet";
import {
  CATEGORY_META, FAMILY_RELATION_META, PROVIDER_KIND_META,
  loadConnections,
  type Connection, type QrPayload,
} from "@/lib/connections/connectionsStore";

const ConnectionsCard = () => {
  const [items, setItems] = useState<Connection[]>([]);
  const [share, setShare] = useState(false);
  const [scan, setScan] = useState(false);
  const [pending, setPending] = useState<QrPayload | null>(null);
  const [detail, setDetail] = useState<Connection | null>(null);

  const refresh = () => setItems(loadConnections());
  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("rufayq:connections-changed", onChange);
    return () => window.removeEventListener("rufayq:connections-changed", onChange);
  }, []);

  const grouped = {
    family: items.filter((c) => c.category === "family"),
    provider: items.filter((c) => c.category === "provider"),
    friend: items.filter((c) => c.category === "friend"),
  };

  return (
    <div className="mt-4 mx-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>
          MY NETWORK · شبكتي
        </p>
        <span className="text-[10px] font-mono" style={{ color: "var(--gray)" }}>
          {items.length} {items.length === 1 ? "connection" : "connections"}
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
        {/* QR actions */}
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--gray-light)" }}>
          <button onClick={() => setShare(true)} className="flex items-center gap-2 px-4 py-3 btn-press" style={{ background: "var(--white)" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(15,124,138,0.12)" }}>
              <QrCode size={16} style={{ color: "var(--teal-deep)" }} />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>My QR</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>رمزي</p>
            </div>
          </button>
          <button onClick={() => setScan(true)} className="flex items-center gap-2 px-4 py-3 btn-press" style={{ background: "var(--white)" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(197,150,90,0.15)" }}>
              <ScanLine size={16} style={{ color: "var(--gold)" }} />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>Scan & add</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>مسح وإضافة</p>
            </div>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-5 text-center" style={{ borderTop: "1px solid var(--gray-light)" }}>
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2" style={{ background: "var(--off-white)" }}>
              <UserPlus size={16} style={{ color: "var(--gray)" }} />
            </div>
            <p className="text-[12px]" style={{ color: "var(--navy)" }}>No connections yet</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد جهات اتصال بعد</p>
          </div>
        ) : (
          (["family", "provider", "friend"] as const).map((cat) => {
            const list = grouped[cat];
            if (list.length === 0) return null;
            const m = CATEGORY_META[cat];
            return (
              <div key={cat} style={{ borderTop: "1px solid var(--gray-light)" }}>
                <div className="px-4 py-2 flex items-center gap-2" style={{ background: "var(--off-white)" }}>
                  <span className="text-sm">{m.emoji}</span>
                  <span className="text-[11px] font-semibold" style={{ color: m.tone }}>{m.en}</span>
                  <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{m.ar}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: "var(--gray)" }}>{list.length}</span>
                </div>
                {list.map((c) => {
                  const sub = c.category === "provider" && c.providerKind
                    ? PROVIDER_KIND_META[c.providerKind].en
                    : c.category === "family" && c.familyRelation
                    ? FAMILY_RELATION_META[c.familyRelation].en
                    : c.note || (c.email || c.phone || "");
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--gray-light)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: m.tone }}>
                        {(c.name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{c.name}</p>
                        {sub && <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{sub}</p>}
                      </div>
                      <button onClick={() => { removeConnection(c.id); refresh(); }} className="p-2 btn-press" aria-label="Remove">
                        <Trash2 size={14} style={{ color: "var(--gray)" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {share && <QrShareSheet onClose={() => setShare(false)} />}
      {scan && (
        <QrScanSheet
          onClose={() => setScan(false)}
          onDetected={(p) => { setScan(false); setPending(p); }}
        />
      )}
      {pending && (
        <AddConnectionSheet
          payload={pending}
          onClose={() => setPending(null)}
          onSaved={() => { setPending(null); refresh(); }}
        />
      )}
    </div>
  );
};

export default ConnectionsCard;
