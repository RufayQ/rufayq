import { useEffect, useRef, useState } from "react";
import { Plus, FileText, Image as ImageIcon, X, Eye, Loader2, FolderOpen, Pencil, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface TransportAttachment {
  id: string;
  device_id: string;
  segment_ref: string;
  label: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  // Durability fields (added by the transport_attachments durability migration)
  user_id?: string | null;
  ticket_id?: string | null;
  source_document_id?: string | null;
  deleted_at?: string | null;
  // Structured fields & subtype (added by the scanner-unification migration)
  subcategory?: string | null;
  key_fields?: { label: string; value: string }[] | null;
}

interface Props {
  /** Stable identifier for the parent transport segment (e.g. flight ticket).
   *  Used as the storage folder + DB key. */
  segmentRef: string;
  /** Optional parent ticket id. When provided, attachments survive segment-id
   *  changes (ticket replace, segment renumber) by also being matched on ticket_id. */
  ticketId?: string;
  /** Optional auth user id. When provided, attachments are claimed for the
   *  signed-in user so they survive sign-in across devices. Pass `null` for guests. */
  userId?: string | null;
  /** Optional source-document linkage (the originating Smart Scan document). */
  sourceDocumentId?: string;
  /** Optional title override (defaults to "Related documents · مستندات مرفقة"). */
  title?: string;
  /** Compact spacing, used inside scanner wizard step 5. */
  compact?: boolean;
}

const BUCKET = "transport-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const COMMON_LABELS = ["VISA", "Passport", "Insurance", "Hotel", "Other"];

const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

/**
 * RelatedDocumentsCard — durable attachments for a transport segment / ticket.
 *
 * Persistence model (after the durability migration):
 *   row.user_id     – signed-in owner (claims on first read for signed-in users)
 *   row.ticket_id   – parent ticket (survives segment-ref changes)
 *   row.segment_ref – legacy/guest key (still queried as a fallback)
 *   row.deleted_at  – soft-delete tombstone (UI hides; data recoverable)
 *
 * Read query is OR-shaped (user_id OR device_id) AND (segment_ref OR ticket_id)
 * so a row remains discoverable across:
 *   – sign-in / sign-out             (user_id ↔ device_id)
 *   – ticket replace via duplicate   (segment_ref → new segment + ticket_id)
 *   – fresh device for same account  (different device_id, same user_id)
 */
const RelatedDocumentsCard = ({
  segmentRef,
  ticketId,
  userId,
  sourceDocumentId,
  title,
  compact,
}: Props) => {
  const [items, setItems] = useState<TransportAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState<File | null>(null);
  const [labelDraft, setLabelDraft] = useState("VISA");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<TransportAttachment | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [fromRecordsOpen, setFromRecordsOpen] = useState(false);
  const [pool, setPool] = useState<TransportAttachment[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceId = getDeviceId();

  const refresh = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("transport_attachments")
        .select("*")
        .is("deleted_at", null);

      // Ownership: signed-in OR device match. Guests are device-only.
      if (userId) {
        query = query.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
      } else {
        query = query.eq("device_id", deviceId);
      }

      // Reference: segment_ref OR ticket_id (when known).
      if (ticketId) {
        query = query.or(`segment_ref.eq.${segmentRef},ticket_id.eq.${ticketId}`);
      } else {
        query = query.eq("segment_ref", segmentRef);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) {
        // Keep last-known items on screen — never blank the list on a transient error.
        console.error("[RelatedDocumentsCard] refresh failed", error);
        toast.error("Could not refresh documents", { description: error.message });
        return;
      }

      const rows = (data as TransportAttachment[]) ?? [];
      setItems(rows);

      // Best-effort client backfill: relink rows that match by device but are
      // missing the new ownership fields. RLS allows this because the existing
      // row already passes the device-id predicate.
      if (userId || ticketId) {
        const stale = rows.filter(
          (r) =>
            (userId && !r.user_id) ||
            (ticketId && !r.ticket_id),
        );
        for (const r of stale) {
          const patch: { user_id?: string; ticket_id?: string } = {};
          if (userId && !r.user_id) patch.user_id = userId;
          if (ticketId && !r.ticket_id) patch.ticket_id = ticketId;
          // Fire-and-forget; failures are non-blocking.
          void supabase
            .from("transport_attachments")
            .update(patch)
            .eq("id", r.id)
            .then(({ error: relinkErr }) => {
              if (relinkErr) console.warn("[RelatedDocumentsCard] relink failed", relinkErr);
            });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentRef, ticketId, userId]);

  // Resolve signed URLs for image attachments so tiles show real thumbnails.
  useEffect(() => {
    const pending = items.filter(
      (it) => isImage(it.mime_type) && !thumbs[it.id] && it.file_path,
    );
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(pending.map((p) => p.file_path), 60 * 30);
      if (cancelled || error || !data) return;
      const next: Record<string, string> = {};
      data.forEach((row, idx) => {
        const id = pending[idx]?.id;
        if (id && row.signedUrl) next[id] = row.signedUrl;
      });
      if (Object.keys(next).length > 0) {
        setThumbs((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const onPickFile = (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File is too large", { description: "Max 10 MB per attachment." });
      return;
    }
    setPicking(file);
    setLabelDraft("VISA");
  };

  const confirmUpload = async () => {
    if (!picking) return;
    const label = labelDraft.trim() || "Document";
    setUploading(true);
    try {
      const ext = picking.name.split(".").pop() || "bin";
      // Path scheme:
      //   signed-in: user/<uid>/<ticketId||segmentRef>/<uuid>.<ext>
      //   guest:     <deviceId>/<segmentRef>/<uuid>.<ext>   (legacy convention)
      const folderRef = ticketId || segmentRef;
      const path = userId
        ? `user/${userId}/${folderRef}/${crypto.randomUUID()}.${ext}`
        : `${deviceId}/${segmentRef}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, picking, { contentType: picking.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("transport_attachments").insert({
        device_id: deviceId,
        user_id: userId ?? null,
        ticket_id: ticketId ?? null,
        source_document_id: sourceDocumentId ?? null,
        segment_ref: segmentRef,
        label,
        file_name: picking.name,
        file_path: path,
        mime_type: picking.type,
        size_bytes: picking.size,
      });
      if (insErr) throw insErr;
      toast.success(`${label} attached`, { description: picking.name });
      setPicking(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error("Upload failed", { description: e.message });
    } finally {
      setUploading(false);
    }
  };

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

  const removeItem = async (item: TransportAttachment) => {
    if (!confirm(`Remove "${item.label} · ${item.file_name}"?`)) return;
    // Soft-delete only — file stays in the bucket so accidental taps are recoverable.
    const { error } = await supabase
      .from("transport_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      toast.error("Could not remove", { description: error.message });
      return;
    }
    toast.success("Attachment removed");
    refresh();
  };

  const renameItem = async () => {
    if (!previewItem) return;
    const name = renameDraft.trim();
    if (!name || name === previewItem.label) { setRenaming(false); return; }
    const { error } = await supabase
      .from("transport_attachments")
      .update({ label: name })
      .eq("id", previewItem.id);
    if (error) { toast.error("Could not rename", { description: error.message }); return; }
    toast.success("Renamed · تم التغيير");
    setPreviewItem({ ...previewItem, label: name });
    setRenaming(false);
    refresh();
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

  const openFromRecords = async () => {
    setFromRecordsOpen(true);
    setPoolLoading(true);
    let q = supabase
      .from("transport_attachments")
      .select("*")
      .is("deleted_at", null);
    if (userId) q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
    else q = q.eq("device_id", deviceId);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) toast.error("Could not load records", { description: error.message });
    // Exclude rows already linked to this exact segment/ticket (by file_path).
    const linkedPaths = new Set(items.map((i) => i.file_path));
    setPool(((data as TransportAttachment[]) ?? []).filter((r) => !linkedPaths.has(r.file_path)));
    setPoolLoading(false);
  };

  const linkExisting = async (src: TransportAttachment) => {
    setLinkingId(src.id);
    const { error } = await supabase.from("transport_attachments").insert({
      device_id: deviceId,
      user_id: userId ?? null,
      ticket_id: ticketId ?? null,
      source_document_id: sourceDocumentId ?? null,
      segment_ref: segmentRef,
      label: src.label,
      file_name: src.file_name,
      file_path: src.file_path, // share the same underlying storage object
      mime_type: src.mime_type,
      size_bytes: src.size_bytes,
    });
    setLinkingId(null);
    if (error) { toast.error("Could not link", { description: error.message }); return; }
    toast.success(`${src.label} attached`);
    setFromRecordsOpen(false);
    refresh();
  };

  return (
    <div
      className={`mx-4 ${compact ? "mb-2" : "mb-3.5"} rounded-2xl px-4 py-3`}
      style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gray)" }}>
          {title ?? "RELATED DOCUMENTS"} · <span className="font-arabic">مستندات مرفقة</span>
        </p>
        <span className="text-[10px]" style={{ color: "var(--gray)" }}>
          {items.length > 0 ? `${items.length} file${items.length > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {loading && items.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-3" style={{ color: "var(--gray)" }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[11px]">Loading…</span>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="shrink-0 rounded-xl p-2 relative group"
            style={{
              width: 110,
              background: "var(--off-white)",
              border: "1px solid var(--gray-light)",
            }}
          >
            <button
              onClick={() => openPreview(item)}
              className="w-full flex flex-col items-center gap-1 btn-press"
            >
              <div
                className="w-full h-14 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ background: "var(--gold-pale)" }}
              >
                {isImage(item.mime_type) && thumbs[item.id] ? (
                  <img
                    src={thumbs[item.id]}
                    alt={item.label}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : isImage(item.mime_type) ? (
                  <ImageIcon size={22} style={{ color: "var(--gold)" }} />
                ) : (
                  <FileText size={22} style={{ color: "var(--gold)" }} />
                )}
              </div>
              <p
                className="text-[10px] font-bold w-full truncate text-center"
                style={{ color: "var(--navy)" }}
                title={item.label}
              >
                {item.label}
              </p>
              <p
                className="text-[9px] w-full truncate text-center"
                style={{ color: "var(--gray)" }}
                title={item.file_name}
              >
                {item.file_name}
              </p>
            </button>
            <button
              onClick={() => removeItem(item)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "var(--navy)", color: "white" }}
              aria-label="Remove attachment"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* Add tile */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 btn-press"
          style={{
            width: 110,
            height: 92,
            border: "1.5px dashed var(--gold)",
            background: "rgba(197,150,90,0.08)",
            color: "var(--gold)",
          }}
        >
          <Plus size={20} />
          <span className="text-[10px] font-bold">Attach</span>
          <span className="font-arabic text-[9px]">إرفاق</span>
        </button>
        <button
          onClick={openFromRecords}
          className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 btn-press"
          style={{
            width: 110,
            height: 92,
            border: "1.5px dashed var(--teal-deep)",
            background: "rgba(0,77,91,0.06)",
            color: "var(--teal-deep)",
          }}
        >
          <FolderOpen size={20} />
          <span className="text-[10px] font-bold">From Records</span>
          <span className="font-arabic text-[9px]">من السجلات</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Label prompt sheet */}
      {picking && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !uploading && setPicking(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl p-5"
            style={{ background: "var(--white)" }}
          >
            <p className="text-[15px] font-bold mb-1" style={{ color: "var(--navy)" }}>
              Label this document
            </p>
            <p className="font-arabic text-[11px] mb-3" dir="rtl" style={{ color: "var(--gray)" }}>
              ضع تسمية للمستند
            </p>
            <p className="text-[11px] mb-3 truncate" style={{ color: "var(--gray)" }}>
              {picking.name} · {(picking.size / 1024).toFixed(0)} KB
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_LABELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabelDraft(l)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold btn-press"
                  style={{
                    background: labelDraft === l ? "var(--gold)" : "var(--off-white)",
                    color: labelDraft === l ? "white" : "var(--navy)",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Custom label"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] mb-4 outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPicking(null)}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl text-[13px] font-bold btn-press"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white btn-press flex items-center justify-center gap-2"
                style={{ background: "var(--gold)" }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {uploading ? "Uploading…" : "Attach"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
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
          <div
            className="flex-1 flex items-center justify-center px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage(previewItem.mime_type) ? (
              <img
                src={previewUrl}
                alt={previewItem.label}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <iframe
                src={previewUrl}
                title={previewItem.file_name}
                className="w-full h-full rounded-lg bg-white"
              />
            )}
          </div>
          <div className="px-4 pb-4 space-y-2">
            {renaming ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: "var(--white)", color: "var(--navy)" }}
                />
                <button
                  onClick={renameItem}
                  className="px-3 rounded-xl text-white font-bold flex items-center gap-1"
                  style={{ background: "var(--teal-deep)" }}
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="px-3 rounded-xl font-bold"
                  style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setRenameDraft(previewItem.label); setRenaming(true); }}
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.14)", color: "white" }}
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  onClick={() => shareItem(previewItem)}
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.14)", color: "white" }}
                >
                  <Share2 size={13} /> Share
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white"
                  style={{ background: "var(--gold)" }}
                >
                  <Eye size={13} /> Open
                </a>
              </div>
            )}
            <button
              onClick={() => { void removeItem(previewItem); setPreviewUrl(null); setPreviewItem(null); }}
              className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(192,57,43,0.18)", color: "white" }}
            >
              <X size={13} /> Delete attachment
            </button>
          </div>
        </div>
      )}

      {/* From Records picker */}
      {fromRecordsOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setFromRecordsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl pb-5"
            style={{ background: "var(--white)", maxHeight: "80%" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
            </div>
            <div className="px-5 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Attach from Records</p>
                <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>إرفاق من السجلات</p>
              </div>
              <button
                onClick={() => setFromRecordsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--off-white)" }}
              >
                <X size={14} style={{ color: "var(--gray)" }} />
              </button>
            </div>
            <div className="px-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {poolLoading ? (
                <div className="flex items-center justify-center gap-2 py-8" style={{ color: "var(--gray)" }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[12px]">Loading…</span>
                </div>
              ) : pool.length === 0 ? (
                <p className="text-[12px] text-center py-8" style={{ color: "var(--gray)" }}>
                  No other records available · لا توجد سجلات أخرى
                </p>
              ) : (
                <ul className="space-y-1.5 pb-3">
                  {pool.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => linkExisting(p)}
                        disabled={linkingId === p.id}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left btn-press"
                        style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gold-pale)" }}>
                          {isImage(p.mime_type) ? <ImageIcon size={16} style={{ color: "var(--gold)" }} /> : <FileText size={16} style={{ color: "var(--gold)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{p.label}</p>
                          <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{p.file_name}</p>
                        </div>
                        {linkingId === p.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: "var(--teal-deep)" }} />
                        ) : (
                          <Plus size={14} style={{ color: "var(--teal-deep)" }} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedDocumentsCard;
