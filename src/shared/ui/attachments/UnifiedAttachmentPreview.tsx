/**
 * Canonical attachment preview — single source of truth for Chat, Records,
 * Journey, and any future surface. Light Records-style chrome (X · title ·
 * fullscreen header, inline 60dvh preview, optional DETAILS panel, gold
 * "Preview document" + "Share" CTAs). Do NOT reimplement this in
 * section-local code.
 */
import { useState } from "react";
import { Check, Download, Eye, Maximize2, Pencil, Share2, X } from "lucide-react";
import OverlayLayer from "../overlay/OverlayLayer";
import UniversalDocumentPreview, { isImage } from "@/components/records/UniversalDocumentPreview";

export interface AttachmentKeyField {
  label: string;
  value: string;
}

export interface AttachmentActions {
  /** Opens the original in a new tab (Preview-document CTA). */
  canOpen?: boolean;
  /** Show download button. */
  canDownload?: boolean;
  /** Show share button. */
  canShare?: boolean;
  /** Inline rename support. */
  canRename?: boolean;
  /** Show delete CTA. */
  canDelete?: boolean;
}

export interface UnifiedAttachmentPreviewProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
  title: string;
  mimeType?: string | null;
  /** Optional structured metadata rendered under the preview. */
  keyFields?: AttachmentKeyField[];
  actions?: AttachmentActions;
  onShare?: () => void | Promise<void>;
  onRename?: (next: string) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export default function UnifiedAttachmentPreview({
  open,
  onClose,
  url,
  fileName,
  title,
  mimeType,
  keyFields,
  actions,
  onShare,
  onRename,
  onDelete,
}: UnifiedAttachmentPreviewProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(title);
  const [fullscreen, setFullscreen] = useState(false);

  const a = {
    canOpen: true,
    canDownload: false,
    canShare: !!onShare,
    canRename: !!onRename,
    canDelete: !!onDelete,
    ...actions,
  };

  const hasFields = !!(keyFields && keyFields.length > 0);
  const hasUrl = !!url;

  return (
    <OverlayLayer
      open={open}
      onClose={onClose}
      layer="preview"
      ariaLabel={`Attachment preview: ${title}`}
      backdropClassName="bg-black/55"
      closeOnBackdrop={false}
    >
      <div
        className="absolute inset-0 flex items-stretch justify-center"
        onClick={onClose}
      >
        <div
          className="relative flex h-[100dvh] w-full max-w-[420px] flex-col"
          style={{ background: "var(--white)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — Records-style */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--gray-light)", background: "var(--off-white)" }}
          >
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-9 w-9 items-center justify-center rounded-full btn-press"
              style={{ background: "var(--white)" }}
            >
              <X size={18} style={{ color: "var(--navy)" }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold" style={{ color: "var(--navy)" }} title={title}>
                {title}
              </p>
              <p className="truncate text-[10px]" style={{ color: "var(--gray)" }} title={fileName}>
                {fileName}
              </p>
            </div>
            {hasUrl && (
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
          <div className="flex-1 overflow-y-auto">
            {/* Inline doc preview */}
            <div className="relative" style={{ background: "var(--off-white)" }}>
              {hasUrl ? (
                isImage(mimeType, fileName) ? (
                  <img
                    src={url!}
                    alt={title}
                    className="block w-full"
                    style={{ maxHeight: "60dvh", objectFit: "contain", background: "#000" }}
                  />
                ) : (
                  <div style={{ height: "60dvh" }}>
                    <UniversalDocumentPreview
                      url={url!}
                      fileName={fileName}
                      title={title}
                      mimeType={mimeType ?? undefined}
                      className="h-full w-full bg-white"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "40dvh" }}>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
                  >
                    <Eye size={20} />
                  </div>
                  <p className="mt-3 text-[13px] font-bold" style={{ color: "var(--navy)" }}>
                    Preview unavailable
                  </p>
                  <p className="font-arabic text-[12px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
                    المعاينة غير متاحة
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--gray)" }}>
                    This link expired. Reopen from the original record.
                  </p>
                </div>
              )}
            </div>

            {/* DETAILS · Preview / Share row */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="font-mono text-[10px] tracking-widest"
                  style={{ color: "var(--gray)" }}
                >
                  DETAILS · <span className="font-arabic">التفاصيل</span>
                </p>
                {a.canRename && !renaming && (
                  <button
                    onClick={() => {
                      setRenameDraft(title);
                      setRenaming(true);
                    }}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold btn-press"
                    style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
                  >
                    <Pencil size={11} className="inline mr-1 -mt-0.5" /> Edit ·{" "}
                    <span className="font-arabic">تعديل</span>
                  </button>
                )}
              </div>

              {/* Primary CTAs — Preview document (gold) + Share */}
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Number(a.canOpen && hasUrl) + Number(a.canShare)}, minmax(0, 1fr))`,
                }}
              >
                {a.canOpen && hasUrl && (
                  <a
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-[12.5px] font-bold"
                    style={{ background: "var(--gold)", color: "var(--white)" }}
                  >
                    <Eye size={14} /> Preview document
                  </a>
                )}
                {a.canShare && (
                  <button
                    onClick={() => void onShare?.()}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-[12.5px] font-bold btn-press"
                    style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
                  >
                    <Share2 size={14} /> Share
                  </button>
                )}
              </div>

              {a.canDownload && hasUrl && (
                <a
                  href={url!}
                  download={fileName}
                  className="mt-2 flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
                >
                  <Download size={13} /> Download
                </a>
              )}
            </div>

            {/* Title / Rename */}
            {renaming && a.canRename ? (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gray)" }}>
                  Title · <span className="font-arabic">العنوان</span>
                </p>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
                  />
                  <button
                    onClick={async () => {
                      const next = renameDraft.trim();
                      if (next && next !== title) await onRename?.(next);
                      setRenaming(false);
                    }}
                    className="px-3 rounded-xl text-white font-bold flex items-center gap-1"
                    style={{ background: "var(--teal-deep)" }}
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={() => setRenaming(false)}
                    className="px-3 rounded-xl font-bold"
                    style={{ background: "var(--off-white)", color: "var(--navy)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>
                  Title · <span className="font-arabic">العنوان</span>
                </p>
                <p className="text-[14px] font-bold break-words" style={{ color: "var(--navy)" }} dir="auto">
                  {title}
                </p>
              </div>
            )}

            {/* Key fields */}
            {hasFields && (
              <div className="px-4 pb-4">
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>
                  Key fields · <span className="font-arabic">الحقول الرئيسية</span>
                </p>
                <dl className="space-y-1.5">
                  {keyFields!.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                    >
                      <dt className="text-[11px]" style={{ color: "var(--gray)" }}>
                        {f.label}
                      </dt>
                      <dd
                        className="text-[12.5px] font-semibold text-right truncate ml-3 min-w-0"
                        style={{ color: "var(--navy)" }}
                        title={f.value}
                      >
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {a.canDelete && (
              <div className="px-4 pb-6">
                <button
                  onClick={() => void onDelete?.()}
                  className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(192,57,43,0.10)", color: "#c0392b" }}
                >
                  <X size={13} /> Delete attachment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen layer — pure document, dark backdrop, single close button. */}
      {fullscreen && hasUrl && (
        <OverlayLayer
          open
          onClose={() => setFullscreen(false)}
          layer="scanner"
          ariaLabel="Fullscreen document"
          backdropClassName="bg-black"
        >
          <div className="absolute inset-0 flex items-center justify-center" onClick={() => setFullscreen(false)}>
            {isImage(mimeType, fileName) ? (
              <img
                src={url!}
                alt={title}
                className="max-h-[100dvh] max-w-full"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <UniversalDocumentPreview
                url={url!}
                fileName={fileName}
                title={title}
                mimeType={mimeType ?? undefined}
                className="h-[100dvh] w-full max-w-[960px] bg-white"
              />
            )}
            <button
              onClick={() => setFullscreen(false)}
              aria-label="Exit fullscreen"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              <X size={20} />
            </button>
          </div>
        </OverlayLayer>
      )}
    </OverlayLayer>
  );
}
