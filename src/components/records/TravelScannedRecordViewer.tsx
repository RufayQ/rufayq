/**
 * Travel scanned record viewer + inline editor.
 *
 * Used by TravelRecordsList for visa / passport / residency / hotel-booking
 * documents created via the Scanner wizard. Provides:
 *   - Full-screen image preview with paging when multiple pages exist.
 *   - Editable title and key fields (document number, expiry, nationality…).
 *   - Quick "fullscreen" toggle that lifts a single image to true viewport
 *     bounds so users can pinch-zoom the document.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Maximize2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  type TravelScannedRecord,
  updateTravelScannedRecord,
} from "@/lib/travelScannedRecordsStore";

interface Props {
  record: TravelScannedRecord;
  onClose: () => void;
  onUpdated?: (next: TravelScannedRecord) => void;
}

const TravelScannedRecordViewer = ({ record, onClose, onUpdated }: Props) => {
  const [page, setPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(record.title);
  const [fields, setFields] = useState(record.keyFields ?? []);

  const images = record.pageImages ?? [];
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[Math.min(page, images.length - 1)] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
      if (e.key === "ArrowLeft" && hasImages) setPage((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight" && hasImages) setPage((p) => Math.min(images.length - 1, p + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, hasImages, images.length, onClose]);

  const handleSave = () => {
    const cleaned = fields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label.length > 0 || f.value.length > 0);
    const next = updateTravelScannedRecord(record.id, {
      title: title.trim() || record.title,
      keyFields: cleaned.length ? cleaned : undefined,
    });
    if (next) {
      onUpdated?.(next);
      toast.success("Saved · تم الحفظ");
      setEditing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-stretch justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[100dvh] w-full max-w-[420px] flex-col"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--gray-light)", background: "var(--off-white)" }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
            style={{ background: "var(--white)" }}
          >
            <X size={18} style={{ color: "var(--navy)" }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold" style={{ color: "var(--navy)" }}>
              {record.title}
            </p>
            <p className="truncate text-[10px]" style={{ color: "var(--gray)" }}>
              {record.subcategory || record.category} · {record.fileName}
            </p>
          </div>
          {hasImages && (
            <button
              onClick={() => setFullscreen(true)}
              aria-label="Fullscreen"
              className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
              style={{ background: "var(--white)" }}
            >
              <Maximize2 size={16} style={{ color: "var(--teal-deep)" }} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Image preview */}
          <div className="relative flex-shrink-0" style={{ background: "var(--off-white)" }}>
            {currentImage ? (
              <div className="relative">
                <img
                  src={currentImage}
                  alt={`${record.title} – page ${page + 1}`}
                  className="block w-full"
                  style={{ maxHeight: "60dvh", objectFit: "contain", background: "#000" }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      aria-label="Previous page"
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(images.length - 1, p + 1))}
                      disabled={page === images.length - 1}
                      aria-label="Next page"
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <span
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 font-mono text-[10px]"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      {page + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>
            ) : record.pdfUrl ? (
              <object
                data={`${record.pdfUrl}#view=FitH&toolbar=1`}
                type="application/pdf"
                aria-label={`${record.title} PDF preview`}
                className="block w-full bg-white"
                style={{ height: "60dvh" }}
              >
                <iframe
                  src={record.pdfUrl}
                  title={`${record.title} PDF`}
                  className="block w-full bg-white"
                  style={{ height: "60dvh", border: 0 }}
                />
              </object>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px]" style={{ color: "var(--gray)" }}>
                  No preview image was saved with this document.
                </p>
                <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                  لم يتم حفظ صورة معاينة مع هذا المستند
                </p>
                <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>
                  Tip: re-scan or re-upload to attach a preview.
                </p>
              </div>
            )}
          </div>

          {/* Details / editor */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--navy)" }}>
                Details · التفاصيل
              </p>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full btn-press"
                  style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
                >
                  Edit · تعديل
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full btn-press text-white"
                  style={{ background: "var(--teal-deep)" }}
                >
                  <Save size={12} /> Save
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] font-semibold" style={{ color: "var(--gray)" }}>
                Title · العنوان
              </label>
              {editing ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                />
              ) : (
                <p className="mt-0.5 text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
                  {title}
                </p>
              )}
            </div>

            {/* Key fields */}
            <div>
              <label className="text-[10px] font-semibold" style={{ color: "var(--gray)" }}>
                Key fields · الحقول الرئيسية
              </label>
              {!editing ? (
                fields.length === 0 ? (
                  <p className="mt-1 text-[12px]" style={{ color: "var(--gray)" }}>
                    No additional fields.
                  </p>
                ) : (
                  <div className="mt-1 grid grid-cols-1 gap-1.5">
                    {fields.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-2 rounded-lg px-2.5 py-1.5"
                        style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                      >
                        <span className="text-[11px]" style={{ color: "var(--gray)" }}>{f.label}</span>
                        <span className="text-[12px] text-right font-semibold break-words" style={{ color: "var(--navy)" }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="mt-1 space-y-1.5">
                  {fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        value={f.label}
                        onChange={(e) => {
                          const next = [...fields];
                          next[i] = { ...next[i], label: e.target.value };
                          setFields(next);
                        }}
                        placeholder="Label"
                        className="w-[40%] rounded-lg px-2 py-1.5 text-[12px] outline-none"
                        style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                      />
                      <input
                        value={f.value}
                        onChange={(e) => {
                          const next = [...fields];
                          next[i] = { ...next[i], value: e.target.value };
                          setFields(next);
                        }}
                        placeholder="Value"
                        className="flex-1 rounded-lg px-2 py-1.5 text-[12px] outline-none"
                        style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                      />
                      <button
                        onClick={() => setFields(fields.filter((_, j) => j !== i))}
                        aria-label="Remove field"
                        className="flex h-7 w-7 items-center justify-center rounded-full btn-press"
                        style={{ background: "var(--off-white)" }}
                      >
                        <Trash2 size={12} style={{ color: "var(--gray)" }} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setFields([...fields, { label: "", value: "" }])}
                    className="mt-1 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg btn-press"
                    style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
                  >
                    <Plus size={12} /> Add field · إضافة حقل
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {fullscreen && currentImage && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={currentImage}
            alt={`${record.title} – fullscreen`}
            className="max-h-[100dvh] max-w-full"
            style={{ objectFit: "contain" }}
          />
          <button
            onClick={() => setFullscreen(false)}
            aria-label="Exit fullscreen"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default TravelScannedRecordViewer;
