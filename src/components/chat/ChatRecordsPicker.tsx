/**
 * ChatRecordsPicker — bottom sheet that lets a Companion+ subscriber attach
 * one of their previously saved records (travel attachments + scanned medical
 * records) into the AI chat.
 *
 * Pure presentational + data fetch; tier gating is handled by the caller.
 */
import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { listScannedRecords } from "@/lib/scannedRecordsStore";

export interface PickedRecord {
  kind: "travel" | "medical";
  label: string;
  file_name: string;
  sourceLabelEn: string;
  sourceLabelAr: string;
  signedUrl?: string;
  mime_type?: string | null;
}

interface RowItem {
  id: string;
  kind: "travel" | "medical";
  label: string;
  fileName: string;
  isImage: boolean;
  dateLabel: string;
  // Only for travel rows
  filePath?: string;
  mimeType?: string | null;
}

const BUCKET = "transport-attachments";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (pick: PickedRecord) => void;
}

const ChatRecordsPicker = ({ open, onClose, onPick }: Props) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const deviceId = getDeviceId();
        const [travelRes, medical] = await Promise.all([
          supabase
            .from("transport_attachments")
            .select("id, label, file_name, file_path, mime_type, created_at, deleted_at, device_id")
            .eq("device_id", deviceId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(100),
          Promise.resolve(listScannedRecords()),
        ]);

        const travelRows: RowItem[] = ((travelRes.data as Array<{
          id: string; label: string; file_name: string; file_path: string;
          mime_type: string | null; created_at: string;
        }>) ?? []).map((r) => ({
          id: `t-${r.id}`,
          kind: "travel",
          label: r.label || "Travel document",
          fileName: r.file_name,
          isImage: !!r.mime_type && r.mime_type.startsWith("image/"),
          dateLabel: formatDate(r.created_at),
          filePath: r.file_path,
          mimeType: r.mime_type,
        }));

        const medRows: RowItem[] = (medical ?? []).map((r) => ({
          id: `m-${r.id}`,
          kind: "medical",
          label: r.titleEn || r.category || "Medical record",
          fileName: r.source || r.category || "Scanned document",
          isImage: false,
          dateLabel: r.date || formatDate(r.createdAt),
        }));

        if (!cancelled) setRows([...travelRows, ...medRows]);
      } catch (e) {
        console.warn("[ChatRecordsPicker] load failed", e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.label.toLowerCase().includes(q) || r.fileName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const handlePick = async (row: RowItem) => {
    setPicking(row.id);
    try {
      let signedUrl: string | undefined;
      if (row.kind === "travel" && row.filePath) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(row.filePath, 3600);
        signedUrl = data?.signedUrl;
      }
      onPick({
        kind: row.kind,
        label: row.label,
        file_name: row.fileName,
        sourceLabelEn: row.kind === "travel" ? "Travel" : "Medical",
        sourceLabelAr: row.kind === "travel" ? "سفر" : "طبي",
        signedUrl,
        mime_type: row.mimeType ?? null,
      });
    } catch (e) {
      console.warn("[ChatRecordsPicker] pick failed", e);
      onPick({
        kind: row.kind,
        label: row.label,
        file_name: row.fileName,
        sourceLabelEn: row.kind === "travel" ? "Travel" : "Medical",
        sourceLabelAr: row.kind === "travel" ? "سفر" : "طبي",
      });
    } finally {
      setPicking(null);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col"
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
            style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
          >
            COMPANION+
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
              <p className="text-[13px]" style={{ color: "var(--navy)" }}>
                No records yet
              </p>
              <p className="font-arabic text-[12px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                لا توجد سجلات بعد
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const Icon = r.isImage ? ImageIcon : FileText;
                const isTravel = r.kind === "travel";
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
                        background: isTravel ? "var(--gold-pale)" : "var(--teal-light)",
                        color: isTravel ? "var(--gold)" : "var(--teal-deep)",
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
                          background: isTravel ? "var(--gold-pale)" : "var(--teal-light)",
                          color: isTravel ? "var(--gold)" : "var(--teal-deep)",
                        }}
                      >
                        {isTravel ? "TRAVEL" : "MEDICAL"}
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
  );
};

export default ChatRecordsPicker;
