/**
 * StepDetailsPanel — per-step attachments + timestamped notes.
 *
 * Used by:
 *   - Journey master timeline (UnifiedTimeline): flights + appointments.
 *   - Care Hub exercises tab.
 *
 * Scope model (mirrors RelatedDocumentsCard):
 *   - Signed-in: rows carry both user_id AND device_id, read via OR.
 *   - Guest:     rows carry device_id only.
 *   - Soft-delete only — UI sets deleted_at, never calls .delete() or storage.remove().
 *   - Storage paths are user/<uid>/<safeStepRef>/<uuid>.<ext> or
 *     <deviceId>/<safeStepRef>/<uuid>.<ext>. step_ref is always URL-encoded.
 */
import { useEffect, useRef, useState } from "react";
import { Plus, FileText, Image as ImageIcon, X, Eye, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface StepAttachment {
  id: string;
  user_id: string | null;
  device_id: string | null;
  step_ref: string;
  timeline_kind: "journey" | "carehub";
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  deleted_at: string | null;
  created_at: string;
}

export interface StepNote {
  id: string;
  user_id: string | null;
  device_id: string | null;
  step_ref: string;
  timeline_kind: "journey" | "carehub";
  body: string;
  deleted_at: string | null;
  created_at: string;
}

export interface StepDetailsPanelProps {
  stepRef: string;
  timelineKind: "journey" | "carehub";
  userId?: string | null;
}

const BUCKET = "step-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const NOTE_MAX = 1000;

const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

const StepDetailsPanel = ({ stepRef, timelineKind, userId }: StepDetailsPanelProps) => {
  const [attachments, setAttachments] = useState<StepAttachment[]>([]);
  const [notes, setNotes] = useState<StepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StepAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceId = getDeviceId();
  const safeStepRef = encodeURIComponent(stepRef);

  const buildOwnerFilter = () =>
    userId ? `user_id.eq.${userId},device_id.eq.${deviceId}` : null;

  const refresh = async () => {
    setLoading(true);
    try {
      // Attachments
      let aq = supabase
        .from("step_attachments")
        .select("*")
        .is("deleted_at", null)
        .eq("timeline_kind", timelineKind)
        .eq("step_ref", stepRef);
      const ownerFilter = buildOwnerFilter();
      if (ownerFilter) aq = aq.or(ownerFilter);
      else aq = aq.eq("device_id", deviceId);
      const { data: aData, error: aErr } = await aq.order("created_at", { ascending: true });

      // Notes
      let nq = supabase
        .from("step_notes")
        .select("*")
        .is("deleted_at", null)
        .eq("timeline_kind", timelineKind)
        .eq("step_ref", stepRef);
      if (ownerFilter) nq = nq.or(ownerFilter);
      else nq = nq.eq("device_id", deviceId);
      const { data: nData, error: nErr } = await nq.order("created_at", { ascending: false });

      if (aErr || nErr) {
        console.error("[StepDetailsPanel] refresh failed", aErr || nErr);
        toast.error("Could not refresh step details · تعذّر تحديث تفاصيل الخطوة");
        return;
      }
      setAttachments((aData as StepAttachment[]) ?? []);
      setNotes((nData as StepNote[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepRef, timelineKind, userId]);

  // --- Attachments ---
  const onPickFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large · الملف كبير جدًا", { description: "Max 10 MB" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = userId
        ? `user/${userId}/${safeStepRef}/${crypto.randomUUID()}.${ext}`
        : `${deviceId}/${safeStepRef}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("step_attachments").insert({
        user_id: userId ?? null,
        device_id: deviceId,
        step_ref: stepRef,
        timeline_kind: timelineKind,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (insErr) throw insErr;
      toast.success("Attached · تمت الإضافة", { description: file.name });
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error("Upload failed · فشل الرفع", { description: e.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openPreview = async (item: StepAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(item.file_path, 60 * 5);
      if (error) throw error;
      setPreviewItem(item);
      setPreviewUrl(data.signedUrl);
    } catch (e: any) {
      toast.error("Could not open · تعذّر الفتح", { description: e.message });
    }
  };

  const removeAttachment = async (item: StepAttachment) => {
    const before = attachments;
    setAttachments((cur) => cur.filter((x) => x.id !== item.id));
    const { error } = await supabase
      .from("step_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setAttachments(before);
      toast.error("Could not remove · تعذّر الحذف", { description: error.message });
    }
  };

  // --- Notes ---
  const addNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    if (body.length > NOTE_MAX) {
      toast.error("Note too long · الملاحظة طويلة جدًا");
      return;
    }
    setSavingNote(true);

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: StepNote = {
      id: tempId,
      user_id: userId ?? null,
      device_id: deviceId,
      step_ref: stepRef,
      timeline_kind: timelineKind,
      body,
      deleted_at: null,
      created_at: new Date().toISOString(),
    };
    setNotes((cur) => [optimistic, ...cur]);
    setNoteDraft("");

    const { data, error } = await supabase
      .from("step_notes")
      .insert({
        user_id: userId ?? null,
        device_id: deviceId,
        step_ref: stepRef,
        timeline_kind: timelineKind,
        body,
      })
      .select()
      .single();

    setSavingNote(false);
    if (error) {
      setNotes((cur) => cur.filter((n) => n.id !== tempId));
      setNoteDraft(body);
      toast.error("Could not save note · تعذّر حفظ الملاحظة", { description: error.message });
      return;
    }
    setNotes((cur) => cur.map((n) => (n.id === tempId ? (data as StepNote) : n)));
  };

  const removeNote = async (n: StepNote) => {
    const before = notes;
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
    const { error } = await supabase
      .from("step_notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", n.id);
    if (error) {
      setNotes(before);
      toast.error("Could not remove · تعذّر الحذف", { description: error.message });
    }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="rounded-xl p-3 mt-2 space-y-3"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold" style={{ color: "var(--navy)" }}>
            Attachments
            <span className="font-arabic text-[10px] ml-1" dir="rtl" style={{ color: "var(--gray)" }}>
              · المرفقات
            </span>
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md"
            style={{ background: "var(--teal-deep)", color: "var(--white)" }}
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
        </div>
        {loading && attachments.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>Loading…</p>
        ) : attachments.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>
            No files yet · لا توجد ملفات
          </p>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "var(--off-white)", color: "var(--teal-deep)" }}
                >
                  {isImage(a.mime_type) ? <ImageIcon size={13} /> : <FileText size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate" style={{ color: "var(--navy)" }}>
                    {a.file_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openPreview(a)}
                  aria-label="Open"
                  className="p-1 rounded-md"
                  style={{ color: "var(--teal-deep)" }}
                >
                  <Eye size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => removeAttachment(a)}
                  aria-label="Remove"
                  className="p-1 rounded-md"
                  style={{ color: "var(--gray)" }}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold mb-2" style={{ color: "var(--navy)" }}>
          Notes
          <span className="font-arabic text-[10px] ml-1" dir="rtl" style={{ color: "var(--gray)" }}>
            · ملاحظات
          </span>
        </p>
        <div className="flex items-start gap-2 mb-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value.slice(0, NOTE_MAX))}
            placeholder="Add a note… · أضف ملاحظة…"
            rows={2}
            maxLength={NOTE_MAX}
            className="flex-1 text-[11px] rounded-md px-2 py-1.5 resize-none"
            style={{
              background: "var(--white)",
              border: "1px solid var(--gray-light)",
              color: "var(--navy)",
            }}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={savingNote || !noteDraft.trim()}
            aria-label="Save note"
            className="p-2 rounded-md shrink-0"
            style={{
              background: "var(--teal-deep)",
              color: "var(--white)",
              opacity: savingNote || !noteDraft.trim() ? 0.5 : 1,
            }}
          >
            {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>
            No notes yet · لا توجد ملاحظات
          </p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg px-2 py-1.5"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
              >
                <div className="flex items-start gap-2">
                  <p
                    className="flex-1 text-[11px] whitespace-pre-wrap break-words"
                    style={{ color: "var(--navy)" }}
                  >
                    {n.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeNote(n)}
                    aria-label="Remove note"
                    className="p-1 rounded-md shrink-0"
                    style={{ color: "var(--gray)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="font-mono text-[9px] mt-1" style={{ color: "var(--gray)" }}>
                  {fmtTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewUrl && previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => {
            setPreviewUrl(null);
            setPreviewItem(null);
          }}
        >
          <div
            className="max-w-sm w-full rounded-xl overflow-hidden"
            style={{ background: "var(--white)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                {previewItem.file_name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewItem(null);
                }}
                className="p-1"
                style={{ color: "var(--gray)" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {isImage(previewItem.mime_type) ? (
              <img src={previewUrl} alt={previewItem.file_name} className="w-full h-auto block" />
            ) : (
              <div className="p-4 text-center">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-semibold underline"
                  style={{ color: "var(--teal-deep)" }}
                >
                  Open file · فتح الملف
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepDetailsPanel;
