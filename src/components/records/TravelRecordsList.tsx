import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Eye, X, Loader2, Plane } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import type { TransportAttachment } from "@/components/RelatedDocumentsCard";

const BUCKET = "transport-attachments";
const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

interface Props {
  userId: string | null;
  searchQuery: string;
}

const TravelRecordsList = ({ userId, searchQuery }: Props) => {
  const deviceId = getDeviceId();
  const [items, setItems] = useState<TransportAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<TransportAttachment | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      let q = supabase
        .from("transport_attachments")
        .select("*")
        .is("deleted_at", null);
      if (userId) {
        q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
      } else {
        q = q.eq("device_id", deviceId);
      }
      const { data, error } = await q.order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("[TravelRecordsList] fetch failed", error);
      } else {
        setItems((data as TransportAttachment[]) ?? []);
      }
      setLoading(false);
    };
    void run();

    const channel = supabase
      .channel(`travel-records-${userId ?? "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transport_attachments" },
        () => { void run(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, deviceId]);

  const filtered = items.filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.label.toLowerCase().includes(q) ||
      it.file_name.toLowerCase().includes(q)
    );
  });

  const openPreview = async (item: TransportAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(item.file_path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error("Could not open file");
      return;
    }
    setPreviewItem(item);
    setPreviewUrl(data.signedUrl);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10" style={{ color: "var(--gray)" }}>
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[12px]">Loading travel documents…</span>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-10">
        <span className="text-4xl">✈️</span>
        <p className="text-[14px] font-semibold mt-3" style={{ color: "var(--navy)" }}>
          {searchQuery ? "No travel documents found" : "No travel documents yet"}
        </p>
        <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>
          {searchQuery ? "لا توجد مستندات سفر مطابقة" : "لا توجد مستندات سفر بعد"}
        </p>
        {!searchQuery && (
          <p className="text-[11px] mt-2 px-6" style={{ color: "var(--gray)" }}>
            Attach passports, visas, hotel bookings or insurance from any ticket in the Journey section.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mt-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>
          {searchQuery ? `SEARCH RESULTS — ${filtered.length}` : `TRAVEL DOCUMENTS — ${filtered.length} FILES`}
        </p>
      </div>

      <div className="space-y-3 mt-2">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => openPreview(item)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left card-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--gold-pale)" }}
            >
              {isImage(item.mime_type) ? (
                <ImageIcon size={20} style={{ color: "var(--gold)" }} />
              ) : (
                <FileText size={20} style={{ color: "var(--gold)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                {item.label}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>
                {item.file_name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(197,150,90,0.12)", color: "var(--gold)" }}>
                  <Plane size={9} /> Travel
                </span>
                <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.size_bytes && (
                  <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                    · {(item.size_bytes / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            </div>
            <Eye size={16} style={{ color: "var(--gold)" }} />
          </button>
        ))}
      </div>

      {previewUrl && previewItem && (
        <div
          className="fixed inset-0 z-[110] flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => { setPreviewUrl(null); setPreviewItem(null); }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate">{previewItem.label}</p>
              <p className="text-[10px] opacity-70 truncate">{previewItem.file_name}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setPreviewItem(null); }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <X size={16} color="white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            {isImage(previewItem.mime_type) ? (
              <img src={previewUrl} alt={previewItem.label} className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
              <iframe src={previewUrl} title={previewItem.file_name} className="w-full h-full rounded-lg bg-white" />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TravelRecordsList;
