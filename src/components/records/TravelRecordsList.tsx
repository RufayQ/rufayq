import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Eye, X, Loader2, Plane, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import type { TransportAttachment } from "@/components/RelatedDocumentsCard";
import RecordActionsSheet from "@/components/records/RecordActionsSheet";

const BUCKET = "transport-attachments";
const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

type TravelCat = "all" | "passport" | "visa" | "booking" | "insurance" | "other";

const CAT_DEFS: { key: TravelCat; en: string; ar: string }[] = [
  { key: "all",       en: "All",       ar: "الكل" },
  { key: "passport",  en: "Passport",  ar: "جواز" },
  { key: "visa",      en: "Visas",     ar: "تأشيرات" },
  { key: "booking",   en: "Bookings",  ar: "حجوزات" },
  { key: "insurance", en: "Insurance", ar: "تأمين" },
  { key: "other",     en: "Other",     ar: "أخرى" },
];

const classify = (it: { label: string; file_name: string }): TravelCat => {
  const s = `${it.label} ${it.file_name}`.toLowerCase();
  if (/(passport|iqama|id\b|جواز|هوية|إقامة)/.test(s)) return "passport";
  if (/(visa|تأشير|فيزا)/.test(s)) return "visa";
  if (/(hotel|booking|reservation|ticket|flight|boarding|itinerary|فندق|حجز|تذكر|طيران)/.test(s)) return "booking";
  if (/(insur|تأمين|policy|بوليصة)/.test(s)) return "insurance";
  return "other";
};

// Split text into segments with matches wrapped, for inline highlighting.
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            style={{ background: "rgba(197,150,90,0.32)", color: "var(--navy)", borderRadius: 3, padding: "0 2px" }}
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

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
  const [menuItem, setMenuItem] = useState<TransportAttachment | null>(null);
  const [cat, setCat] = useState<TravelCat>("all");

  const fetchAll = async () => {
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
    if (error) console.warn("[TravelRecordsList] fetch failed", error);
    else setItems((data as TransportAttachment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
    const channel = supabase
      .channel(`travel-records-${userId ?? "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transport_attachments" },
        () => { void fetchAll(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, deviceId]);

  const filtered = items.filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return it.label.toLowerCase().includes(q) || it.file_name.toLowerCase().includes(q);
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

  const renameItem = async (item: TransportAttachment, newName: string) => {
    const { error } = await supabase
      .from("transport_attachments")
      .update({ label: newName })
      .eq("id", item.id);
    if (error) throw error;
    await fetchAll();
  };

  const deleteItem = async (item: TransportAttachment) => {
    const { error } = await supabase
      .from("transport_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) throw error;
    await fetchAll();
  };

  const shareItem = async (item: TransportAttachment) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(item.file_path, 60 * 60);
    const url = data?.signedUrl;
    const text = `📄 ${item.label} — ${item.file_name}${url ? `\n${url}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title: item.label, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const applyToMilestone = async (
    item: TransportAttachment,
    m: { id: string; refId: string; kind: string },
  ) => {
    // Map milestone → segment_ref / ticket_id pair used by RelatedDocumentsCard.
    // Flights store the ticket id under refId (e.g. "departure" / "return"), and
    // appointments / treatments use the appointment id as refId.
    const segmentRef =
      m.kind === "departure" || m.kind === "return"
        ? `flight-${m.refId}`
        : `milestone-${m.id}`;
    const ticketId = m.kind === "departure" || m.kind === "return" ? m.refId : null;
    const { error } = await supabase.from("transport_attachments").insert({
      device_id: deviceId,
      user_id: userId ?? null,
      ticket_id: ticketId,
      segment_ref: segmentRef,
      label: item.label,
      file_name: item.file_name,
      file_path: item.file_path, // same underlying storage object
      mime_type: item.mime_type,
      size_bytes: item.size_bytes,
    });
    if (error) throw error;
    await fetchAll();
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
          <div
            key={item.id}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left card-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <button onClick={() => openPreview(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--gold-pale)" }}>
                {isImage(item.mime_type) ? (
                  <ImageIcon size={20} style={{ color: "var(--gold)" }} />
                ) : (
                  <FileText size={20} style={{ color: "var(--gold)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{item.label}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>{item.file_name}</p>
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
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Eye size={16} style={{ color: "var(--gold)" }} />
              <button
                onClick={() => setMenuItem(item)}
                className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
                style={{ background: "var(--off-white)" }}
                aria-label="More actions"
              >
                <MoreVertical size={14} style={{ color: "var(--gray)" }} />
              </button>
            </div>
          </div>
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

      <RecordActionsSheet
        open={!!menuItem}
        target={menuItem ? { id: menuItem.id, name: menuItem.label, subtitle: menuItem.file_name, mutable: true } : null}
        onClose={() => setMenuItem(null)}
        onPreview={() => menuItem && openPreview(menuItem)}
        onRename={(newName) => menuItem && renameItem(menuItem, newName)}
        onShare={() => menuItem && shareItem(menuItem)}
        onApplyToMilestone={(m) => menuItem && applyToMilestone(menuItem, m)}
        onDelete={() => menuItem && deleteItem(menuItem)}
      />
    </>
  );
};

export default TravelRecordsList;
