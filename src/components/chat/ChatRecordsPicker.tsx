/**
 * ChatRecordsPicker — bottom sheet that lets ANY tier (including guests)
 * attach one of their previously saved records into the AI chat. Sharing
 * already-saved records is free on every plan; only device uploads are gated.
 *
 * Data is sourced via the unified `listAllUserRecords()` reader so the picker
 * shows the same items the user sees in the Records screen and in any
 * Journey milestone's "Attach from Records" picker.
 */
import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import OverlayLayer from "@/shared/ui/overlay/OverlayLayer";
import {
  listAllUserRecords,
  resolveRecordSignedUrl,
  type UnifiedRecord,
} from "@/lib/records/recordSources";

export interface PickedRecord {
  kind: "travel" | "medical";
  label: string;
  file_name: string;
  sourceLabelEn: string;
  sourceLabelAr: string;
  signedUrl?: string;
  mime_type?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (pick: PickedRecord) => void;
}

const ChatRecordsPicker = ({ open, onClose, onPick }: Props) => {
  const userId = useAuthUserId();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnifiedRecord[]>([]);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const all = await listAllUserRecords({
          userId: userId ?? null,
          deviceId: getDeviceId(),
          fileBackedOnly: true,
        });
        if (!cancelled) setRows(all.filter((r) => r.sendableToChat));
      } catch (e: any) {
        console.warn("[ChatRecordsPicker] load failed", e);
        if (!cancelled) setRows([]);
        toast.error("Couldn't load records · تعذّر تحميل السجلات", {
          description: e?.message ?? String(e),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.label.toLowerCase().includes(q) || r.fileName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const handlePick = async (row: UnifiedRecord) => {
    setPicking(row.id);
    const deviceId = getDeviceId();
    const isMedical = row.origin === "medical-scan";
    const base: PickedRecord = {
      kind: isMedical ? "medical" : "travel",
      label: row.label,
      file_name: row.fileName,
      sourceLabelEn: row.sourceLabelEn,
      sourceLabelAr: row.sourceLabelAr,
      mime_type: row.mimeType ?? null,
    };
    let signedUrl: string | undefined;
    try {
      signedUrl = (await resolveRecordSignedUrl(row, deviceId)) ?? undefined;
    } catch (e: any) {
      console.warn("[ChatRecordsPicker] signed-url failed", e);
      toast.error("Couldn't fetch file link · تعذّر جلب الرابط", {
        description: e?.message ?? String(e),
      });
    }
    try {
      onPick({ ...base, signedUrl });
    } catch (e: any) {
      console.error("[ChatRecordsPicker] onPick handler threw", e);
      toast.error("Couldn't attach record · تعذّر إرفاق السجل", {
        description: e?.message ?? String(e),
      });
    } finally {
      setPicking(null);
    }
  };



  if (!open) return null;

  return (
    <OverlayLayer
      open={open}
      onClose={onClose}
      layer="picker"
      ariaLabel="Attach from My Records"
      backdropClassName="bg-black/55"
    >
      <div className="flex h-full w-full items-end justify-center" onClick={onClose}>
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col w-full max-w-[420px]"
        style={{ background: "var(--white)", maxHeight: "82%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="px-5 pt-3 pb-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl" style={{ color: "var(--navy)" }}>
              Attach from My Records
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>
              إرفاق من سجلاتي
            </p>
          </div>
          <span
            className="text-[10px] font-mono tracking-wider px-2 py-1 rounded-full shrink-0"
            style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
          >
            FREE · مجاني
          </span>
        </div>

        <div className="px-5 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
          >
            <Search size={14} style={{ color: "var(--gray)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records · ابحث في السجلات"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "var(--navy)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="btn-press">
                <X size={14} style={{ color: "var(--gray)" }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-10" style={{ color: "var(--gray)" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="ml-2 text-[12px]">Loading records · جارٍ التحميل</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px]" style={{ color: "var(--navy)" }}>No records yet</p>
              <p className="font-arabic text-[12px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                لا توجد سجلات بعد
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const isMedical = r.origin === "medical-scan";
                const isImage = !!r.mimeType && r.mimeType.startsWith("image/");
                const Icon = isImage ? ImageIcon : FileText;
                return (
                  <button
                    key={r.id}
                    onClick={() => handlePick(r)}
                    disabled={picking === r.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left card-press"
                    style={{
                      background: "var(--white)",
                      border: "1px solid var(--gray-light)",
                      opacity: picking === r.id ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: isMedical ? "var(--teal-light)" : "var(--gold-pale)",
                        color: isMedical ? "var(--teal-deep)" : "var(--gold)",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                        {r.label}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>
                        {r.fileName}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: isMedical ? "var(--teal-light)" : "var(--gold-pale)",
                          color: isMedical ? "var(--teal-deep)" : "var(--gold)",
                        }}
                      >
                        {r.sourceLabelEn.toUpperCase()}
                      </span>
                      {r.dateLabel && (
                        <span className="text-[10px]" style={{ color: "var(--gray)" }}>
                          {r.dateLabel}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 text-[13px] font-medium mb-4 btn-press"
          style={{ color: "var(--gray)" }}
        >
          Cancel · <span className="font-arabic">إلغاء</span>
        </button>
      </div>
      </div>
    </OverlayLayer>
  );
};

export default ChatRecordsPicker;
