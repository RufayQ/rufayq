import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Eye, X, Loader2, Plane, MoreVertical, Pin, Sofa, Trash2, ScanLine, CreditCard, ChevronRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import type { TransportAttachment } from "@/components/RelatedDocumentsCard";
import RecordActionsSheet from "@/components/records/RecordActionsSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  listLoungeMemberships,
  subscribeLoungeMemberships,
  deleteLoungeMembership,
  fetchLoungeMemberships,
  type LoungeMembership,
} from "@/lib/loungeMemberships";
import {
  listTravelScannedRecords,
  removeTravelScannedRecord,
  subscribeToTravelScannedRecords,
  type TravelScannedRecord,
} from "@/lib/travelScannedRecordsStore";
import TravelScannedRecordViewer from "@/components/records/TravelScannedRecordViewer";

/** Unified row shape so attachments and lounge memberships share render code. */
type UnifiedRow =
  | ({ kind: "attachment" } & TransportAttachment)
  | {
      kind: "lounge-card";
      id: string; // synthetic: "lounge:<membershipId>"
      label: string;
      file_name: string;
      created_at: string;
      mime_type: null;
      size_bytes: null;
      membership: LoungeMembership;
    }
  | {
      kind: "scanned-travel";
      id: string; // synthetic: "scanned:<recordId>"
      label: string;
      file_name: string;
      created_at: string;
      mime_type: null;
      size_bytes: null;
      record: TravelScannedRecord;
    };

const loungeExpMMYY = (iso?: string): string => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  return m ? `${m[2]}/${m[1].slice(2)}` : "";
};

const membershipToRow = (m: LoungeMembership): UnifiedRow => ({
  kind: "lounge-card",
  id: `lounge:${m.id}`,
  label: `${m.program} · ${m.cardholderName}`,
  file_name: m.membershipNumber,
  created_at: m.createdAt,
  mime_type: null,
  size_bytes: null,
  membership: m,
});

const scannedToRow = (r: TravelScannedRecord): UnifiedRow => ({
  kind: "scanned-travel",
  id: `scanned:${r.id}`,
  label: r.title,
  file_name: r.fileName,
  created_at: r.createdAt,
  mime_type: null,
  size_bytes: null,
  record: r,
});

const BUCKET = "transport-attachments";
const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

export type TravelCat = "all" | "passport" | "visa" | "booking" | "insurance" | "lounge" | "other";

export const CAT_DEFS: { key: TravelCat; en: string; ar: string }[] = [
  { key: "all",       en: "All",       ar: "الكل" },
  { key: "passport",  en: "Passport",  ar: "جواز" },
  { key: "visa",      en: "Visas",     ar: "تأشيرات" },
  { key: "booking",   en: "Bookings",  ar: "حجوزات" },
  { key: "lounge",    en: "Lounge",    ar: "صالة" },
  { key: "insurance", en: "Insurance", ar: "تأمين" },
  { key: "other",     en: "Other",     ar: "أخرى" },
];

export const classify = (it: { label: string; file_name: string }): TravelCat => {
  const s = `${it.label} ${it.file_name}`.toLowerCase();
  if (/(passport|iqama|id\b|جواز|هوية|إقامة)/.test(s)) return "passport";
  if (/(visa|تأشير|فيزا)/.test(s)) return "visa";
  if (/(lounge|dragonpass|priority\s*pass|loungekey|loungebuddy|صالة|لاونج)/.test(s)) return "lounge";
  if (/(hotel|booking|reservation|ticket|flight|boarding|itinerary|فندق|حجز|تذكر|طيران)/.test(s)) return "booking";
  if (/(insur|تأمين|policy|بوليصة)/.test(s)) return "insurance";
  return "other";
};

const PIN_KEY = "rufayq_travel_pinned_ids";
const MAX_PINS = 2;

const readPins = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_PINS) : [];
  } catch { return []; }
};
const writePins = (ids: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_KEY, JSON.stringify(ids.slice(0, MAX_PINS)));
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
  onCountsChange?: (counts: { total: number; translated: number; newCount: number }) => void;
  onVisibleItemsChange?: (items: TransportAttachment[]) => void;
}

const TravelRecordsList = ({ userId, searchQuery, onCountsChange, onVisibleItemsChange }: Props) => {
  const deviceId = getDeviceId();
  const [items, setItems] = useState<TransportAttachment[]>([]);
  const [loungeCards, setLoungeCards] = useState<LoungeMembership[]>(() => listLoungeMemberships());
  const [scannedTravel, setScannedTravel] = useState<TravelScannedRecord[]>(() => listTravelScannedRecords());
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<TransportAttachment | null>(null);
  const [qrTarget, setQrTarget] = useState<LoungeMembership | null>(null);
  const [menuItem, setMenuItem] = useState<UnifiedRow | null>(null);
  const [scannedViewer, setScannedViewer] = useState<TravelScannedRecord | null>(null);
  const [cat, setCat] = useState<TravelCat>("all");
  const [clearPinOpen, setClearPinOpen] = useState(false);

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

  // Lounge memberships live in localStorage — subscribe for real-time updates.
  useEffect(() => {
    void fetchLoungeMemberships().then(() => setLoungeCards(listLoungeMemberships()));
    return subscribeLoungeMemberships(() => setLoungeCards(listLoungeMemberships()));
  }, []);

  // Scanner-saved travel docs (visas, etc.) also live in localStorage.
  useEffect(() => {
    return subscribeToTravelScannedRecords(() => setScannedTravel(listTravelScannedRecords()));
  }, []);

  // Merge attachments + lounge cards + scanned travel docs into one sorted list.
  const unified: UnifiedRow[] = useMemo(() => {
    const attachments: UnifiedRow[] = items.map((it) => ({ kind: "attachment" as const, ...it }));
    const lounge: UnifiedRow[] = loungeCards.map(membershipToRow);
    const scanned: UnifiedRow[] = scannedTravel.map(scannedToRow);
    return [...lounge, ...scanned, ...attachments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [items, loungeCards, scannedTravel]);

  const classifyRow = (r: UnifiedRow): TravelCat =>
    r.kind === "lounge-card" ? "lounge" : classify(r);

  const counts = unified.reduce<Record<TravelCat, number>>(
    (acc, it) => { acc.all += 1; acc[classifyRow(it)] += 1; return acc; },
    { all: 0, passport: 0, visa: 0, booking: 0, lounge: 0, insurance: 0, other: 0 },
  );

  useEffect(() => {
    onCountsChange?.({ total: counts.all, translated: 0, newCount: 0 });
  }, [counts.all, onCountsChange]);

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readPins());

  const togglePin = (id: string, label?: string) => {
    setPinnedIds((prev) => {
      let next: string[];
      const name = label?.trim() || "Record";
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
        toast(`Unpinned · تم إلغاء التثبيت`, {
          description: `${name} · ${next.length}/${MAX_PINS} pinned`,
          duration: 1800,
          action: {
            label: "Undo",
            onClick: () => togglePin(id, label),
          },
        });
      } else {
        if (prev.length >= MAX_PINS) {
          next = [...prev.slice(1), id];
          toast(`Pinned · تم التثبيت`, {
            description: `${name} · replaced oldest (${next.length}/${MAX_PINS})`,
            duration: 1800,
          });
        } else {
          next = [...prev, id];
          toast.success(`Pinned · تم التثبيت`, {
            description: `${name} · ${next.length}/${MAX_PINS} pinned`,
            duration: 1600,
          });
        }
      }
      writePins(next);
      return next;
    });
  };

  const clearAllPins = () => {
    setPinnedIds([]);
    writePins([]);
    toast.success("All pins cleared · تم إلغاء كل التثبيتات", { duration: 1400 });
  };

  const matchesSearch = (it: UnifiedRow) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (it.label.toLowerCase().includes(q) || it.file_name.toLowerCase().includes(q)) return true;
    if (it.kind === "lounge-card") {
      const m = it.membership;
      return (
        m.program.toLowerCase().includes(q) ||
        m.cardholderName.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q)
      );
    }
    return false;
  };
  const matchesCat = (it: UnifiedRow) => cat === "all" || classifyRow(it) === cat;

  // Pinned section: respects search, ignores category (so user always sees them)
  const pinnedItems = pinnedIds
    .map((id) => unified.find((it) => it.id === id))
    .filter((it): it is UnifiedRow => !!it && matchesSearch(it));

  const filtered = unified.filter((it) => matchesCat(it) && matchesSearch(it) && !pinnedIds.includes(it.id));

  // Expose visible attachment rows (pinned + filtered) so the parent header
  // kebab can copy/export/share whatever the user is currently looking at.
  useEffect(() => {
    if (!onVisibleItemsChange) return;
    const visibleAttachments: TransportAttachment[] = [
      ...pinnedItems,
      ...filtered,
    ]
      .filter((row): row is Extract<UnifiedRow, { kind: "attachment" }> => row.kind === "attachment")
      .map(({ kind: _kind, ...rest }) => rest as TransportAttachment);
    onVisibleItemsChange(visibleAttachments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loungeCards, cat, searchQuery, pinnedIds.join("|")]);

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

  const chipStrip = (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mt-1" style={{ WebkitOverflowScrolling: "touch" }}>
      {CAT_DEFS.map((c) => {
        const active = cat === c.key;
        const n = counts[c.key];
        return (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold btn-press transition-all"
            style={{
              background: active ? "var(--teal-deep)" : "var(--white)",
              color: active ? "#fff" : "var(--gray)",
              border: active ? "none" : "1px solid var(--gray-light)",
              opacity: !active && n === 0 ? 0.5 : 1,
            }}
          >
            <span>{c.en}</span>
            <span
              className="font-mono text-[9px] px-1 rounded-full"
              style={{
                background: active ? "rgba(255,255,255,0.18)" : "var(--off-white)",
                color: active ? "#fff" : "var(--navy)",
                minWidth: 16,
                textAlign: "center",
              }}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10" style={{ color: "var(--gray)" }}>
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[12px]">Loading travel documents…</span>
      </div>
    );
  }

  const renderRow = (item: UnifiedRow, isPinned: boolean) => {
    const isLounge = item.kind === "lounge-card";
    const isScanned = item.kind === "scanned-travel";
    const handleOpen = () => {
      if (item.kind === "lounge-card") setQrTarget(item.membership);
      else if (item.kind === "attachment") void openPreview(item);
      else if (item.kind === "scanned-travel") setScannedViewer(item.record);
    };
    const expMMYY = item.kind === "lounge-card" ? loungeExpMMYY(item.membership.expiresOn) : "";
    const scannedFields = isScanned && item.kind === "scanned-travel" ? (item.record.keyFields ?? []).filter((f) => f.value.trim().length > 0) : [];
    return (
      <div
        key={item.id}
        className="w-full flex flex-col gap-2 p-3.5 rounded-xl text-left card-press relative"
        style={{
          background: "var(--white)",
          border: isPinned ? "1.5px solid rgba(197,150,90,0.55)" : "1px solid var(--gray-light)",
          boxShadow: isPinned ? "0 4px 14px rgba(197,150,90,0.18)" : "0 1px 6px rgba(0,0,0,0.04)",
        }}
      >
       <div className="flex items-center gap-3">
        <button onClick={handleOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isLounge ? "rgba(45,138,158,0.12)" : "var(--gold-pale)" }}
          >
            {isLounge ? (
              <Sofa size={20} style={{ color: "var(--teal-deep)" }} />
            ) : item.kind === "attachment" && isImage(item.mime_type) ? (
              <ImageIcon size={20} style={{ color: "var(--gold)" }} />
            ) : (
              <FileText size={20} style={{ color: "var(--gold)" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>
              <Highlight text={item.label} query={searchQuery} />
            </p>
            <p className="text-[11px] truncate font-mono" style={{ color: "var(--gray)" }}>
              <Highlight text={item.file_name} query={searchQuery} />
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {isLounge ? (
                <>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(45,138,158,0.14)", color: "var(--teal-deep)" }}>
                    <Sofa size={9} /> Lounge Card · <span className="font-arabic">بطاقة صالة</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(197,150,90,0.14)", color: "var(--gold)" }}>
                    <ScanLine size={9} /> QR
                  </span>
                  {expMMYY && (
                    <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                      Exp {expMMYY}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(197,150,90,0.12)", color: "var(--gold)" }}>
                  <Plane size={9} /> Travel
                </span>
              )}
              <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              {item.kind === "attachment" && item.size_bytes && (
                <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                  · {(item.size_bytes / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => togglePin(item.id, item.label)}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-press"
            style={{ background: isPinned ? "rgba(197,150,90,0.18)" : "var(--off-white)" }}
            aria-label={isPinned ? "Unpin" : "Pin to top"}
            title={isPinned ? "Unpin" : `Pin to top (max ${MAX_PINS})`}
          >
            {isPinned ? (
              <Pin size={13} fill="var(--gold)" style={{ color: "var(--gold)" }} />
            ) : (
              <Pin size={13} style={{ color: "var(--gray)" }} />
            )}
          </button>
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
        {scannedFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
            {scannedFields.slice(0, 6).map((f, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-1 rounded-full"
                style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
              >
                <span style={{ color: "var(--gray)" }}>{f.label}: </span>
                <span style={{ fontWeight: 600 }}>{f.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const visibleCount = filtered.length + pinnedItems.length;
  const nothingToShow = visibleCount === 0;

  if (nothingToShow) {
    return (
      <>
        {items.length > 0 && chipStrip}
        <div className="text-center py-10">
          <span className="text-4xl">✈️</span>
          <p className="text-[14px] font-semibold mt-3" style={{ color: "var(--navy)" }}>
            {searchQuery || cat !== "all" ? "No travel documents found" : "No travel documents yet"}
          </p>
          <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>
            {searchQuery || cat !== "all" ? "لا توجد مستندات سفر مطابقة" : "لا توجد مستندات سفر بعد"}
          </p>
          {!searchQuery && cat === "all" && (
            <p className="text-[11px] mt-2 px-6" style={{ color: "var(--gray)" }}>
              Attach passports, visas, hotel bookings, lounge passes or insurance from any ticket in the Journey section.
            </p>
          )}
          {(searchQuery || cat !== "all") && (
            <button
              onClick={() => setCat("all")}
              className="mt-3 px-3 py-1.5 rounded-full text-[11px] font-semibold btn-press"
              style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
            >
              Clear filter · إزالة الفلتر
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {chipStrip}

      {pinnedItems.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-mono text-[10px] tracking-widest flex items-center gap-1" style={{ color: "var(--gold)" }}>
              <Pin size={9} fill="var(--gold)" style={{ color: "var(--gold)" }} /> PINNED · <span className="font-arabic">مثبتة</span>
              <span className="opacity-60">({pinnedItems.length}/{MAX_PINS})</span>
            </p>
            <button
              onClick={() => setClearPinOpen(true)}
              className="flex items-center gap-1 text-[10px] font-semibold btn-press"
              style={{ color: "var(--error)" }}
              aria-label="Clear all pinned"
            >
              <Trash2 size={10} /> Clear pinned · <span className="font-arabic">إزالة التثبيت</span>
            </button>
          </div>
          {pinnedItems.length > 1 && (
            <div
              className="flex items-center gap-1 mb-1.5 text-[10px]"
              style={{ color: "var(--gray)" }}
            >
              <ChevronRight size={10} className="animate-pulse" style={{ color: "var(--gold)" }} />
              <span>Swipe to view</span>
              <span className="font-arabic" dir="rtl">· اسحب للعرض</span>
            </div>
          )}
          <div
            className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: "none" }}
          >
            {pinnedItems.map((item) => {
              const isLounge = item.kind === "lounge-card";
              const isImg = item.kind === "attachment" && isImage(item.mime_type);
              const handleOpen = () => {
                if (item.kind === "lounge-card") setQrTarget(item.membership);
                else if (item.kind === "attachment") void openPreview(item);
              };
              return (
                <div
                  key={item.id}
                  className="shrink-0 flex flex-col items-center"
                  style={{ width: 64 }}
                  title={item.label}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleOpen}
                      className="w-11 h-11 rounded-full flex items-center justify-center btn-press"
                      style={{
                        background: "var(--white)",
                        border: "1.5px solid var(--gold)",
                        boxShadow: "0 3px 10px rgba(197,150,90,0.22)",
                      }}
                      aria-label={`Open ${item.label}`}
                      title={item.label}
                    >
                      {isLounge ? (
                        <Sofa size={18} style={{ color: "var(--teal-deep)" }} />
                      ) : isImg ? (
                        <ImageIcon size={18} style={{ color: "var(--gold)" }} />
                      ) : (
                        <FileText size={18} style={{ color: "var(--gold)" }} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.label); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--navy)", color: "var(--white)" }}
                      aria-label="Unpin"
                      title="Unpin"
                    >
                      <X size={9} />
                    </button>
                  </div>
                  <p
                    className="mt-1 text-[10px] leading-tight text-center w-full break-words"
                    style={{
                      color: "var(--navy)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                    title={item.label}
                  >
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gray)" }}>
          {searchQuery || cat !== "all" ? `RESULTS — ${visibleCount}` : `TRAVEL DOCUMENTS — ${visibleCount} FILES`}
        </p>
      </div>

      <div className="space-y-3 mt-2">
        {filtered.map((item) => renderRow(item, false))}
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

      <ConfirmDialog
        open={clearPinOpen}
        title="Clear all pinned?"
        titleAr="إزالة كل التثبيتات؟"
        description="This will unpin all travel records and restore the normal list order."
        descriptionAr="سيتم إلغاء تثبيت كل المستندات وإعادة الترتيب الطبيعي."
        confirmLabel="Clear"
        confirmLabelAr="إزالة"
        cancelLabel="Cancel"
        cancelLabelAr="إلغاء"
        destructive
        onConfirm={clearAllPins}
        onClose={() => setClearPinOpen(false)}
      />

      <RecordActionsSheet
        open={!!menuItem}
        target={menuItem ? { id: menuItem.id, name: menuItem.label, subtitle: menuItem.file_name, mutable: true } : null}
        onClose={() => setMenuItem(null)}
        onPreview={() => {
          if (!menuItem) return;
          if (menuItem.kind === "lounge-card") setQrTarget(menuItem.membership);
          else if (menuItem.kind === "attachment") void openPreview(menuItem);
        }}
        onRename={
          menuItem && menuItem.kind === "attachment"
            ? (newName) => renameItem(menuItem, newName)
            : undefined
        }
        onShare={
          menuItem && menuItem.kind === "attachment"
            ? () => shareItem(menuItem)
            : undefined
        }
        onApplyToMilestone={
          menuItem && menuItem.kind === "attachment"
            ? (m) => applyToMilestone(menuItem, m)
            : undefined
        }
        onDelete={() => {
          if (!menuItem) return;
          if (menuItem.kind === "lounge-card") {
            deleteLoungeMembership(menuItem.membership.id);
            toast.success("Lounge card removed · تم الحذف", { duration: 1400 });
          } else if (menuItem.kind === "scanned-travel") {
            removeTravelScannedRecord(menuItem.record.id);
            toast.success("Document removed · تم الحذف", { duration: 1400 });
          } else {
            void deleteItem(menuItem);
          }
        }}
      />

      {qrTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setQrTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl p-5 animate-slide-up"
            style={{ background: "var(--white)", boxShadow: "0 -8px 32px rgba(0,0,0,0.25)" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>{qrTarget.program}</p>
                <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>
                  اعرض الرمز لموظف الصالة للمسح
                </p>
              </div>
              <button
                onClick={() => setQrTarget(null)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <div className="rounded-xl bg-white p-3" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <QRCodeSVG value={qrTarget.membershipNumber} size={196} level="M" includeMargin={false} />
              </div>
              <p className="mt-3 font-mono text-[13px] tracking-[0.2em]" style={{ color: "var(--navy)" }}>
                {qrTarget.membershipNumber.replace(/(.{4})/g, "$1 ").trim()}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--gray)" }}>{qrTarget.cardholderName}</p>
              <div className="mt-2 flex gap-3 text-[10px]" style={{ color: "var(--gray)" }}>
                {qrTarget.cardLast4 && <span>Linked card •••• {qrTarget.cardLast4}</span>}
                {loungeExpMMYY(qrTarget.expiresOn) && <span>Exp {loungeExpMMYY(qrTarget.expiresOn)}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
      {scannedViewer && (
        <TravelScannedRecordViewer
          record={scannedViewer}
          onClose={() => setScannedViewer(null)}
          onUpdated={(next) => {
            setScannedTravel((prev) => prev.map((r) => (r.id === next.id ? next : r)));
            setScannedViewer(next);
          }}
        />
      )}
    </>
  );
};

export default TravelRecordsList;
