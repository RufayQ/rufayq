import { useState } from "react";
import { Check, Download, Eye, Pencil, Share2, X } from "lucide-react";
import OverlayLayer from "../overlay/OverlayLayer";
import UniversalDocumentPreview, { isImage } from "@/components/records/UniversalDocumentPreview";

export interface AttachmentKeyField {
  label: string;
  value: string;
}

export interface AttachmentActions {
  /** Open in new tab (always shown when url available). */
  canOpen?: boolean;
  /** Show download anchor. */
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
  /** Resolved signed/blob URL for the attachment. */
  url: string | null;
  fileName: string;
  title: string;
  mimeType?: string | null;
  /** Optional structured metadata to render under the preview. */
  keyFields?: AttachmentKeyField[];
  actions?: AttachmentActions;
  onShare?: () => void | Promise<void>;
  onRename?: (next: string) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

/**
 * Canonical attachment preview — single source of truth for Journey + Records
 * + any future section. Renders via the shared OverlayLayer primitive so
 * portal mounting, back/escape handling, focus trap, and z-index layering are
 * uniform across the app.
 *
 * Do NOT reimplement this in section-local code. Compose this component or
 * extend it via props.
 */
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

  const a = {
    canOpen: true,
    canDownload: false,
    canShare: !!onShare,
    canRename: !!onRename,
    canDelete: !!onDelete,
    ...actions,
  };

  const hasFields = !!(keyFields && keyFields.length > 0);

  return (
    <OverlayLayer
      open={open && !!url}
      onClose={onClose}
      layer="preview"
      ariaLabel={`Attachment preview: ${title}`}
      backdropClassName="bg-black/90"
      closeOnBackdrop={false}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[13px] font-bold truncate">{title}</p>
            <p className="text-[10px] opacity-70 truncate">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 overflow-y-auto">
          <div className="flex-1 w-full min-h-[40vh] flex items-center justify-center">
            {url ? (
              isImage(mimeType, fileName) ? (
                <img
                  src={url}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <UniversalDocumentPreview
                  url={url}
                  fileName={fileName}
                  title={title}
                  mimeType={mimeType ?? undefined}
                  className="w-full h-full rounded-lg bg-white"
                />
              )
            ) : null}
          </div>

          {hasFields && (
            <div
              className="w-full mt-3 rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              <p
                className="font-mono text-[9px] tracking-widest mb-2"
                style={{ color: "var(--gold)" }}
              >
                EXTRACTED FIELDS · <span className="font-arabic">الحقول المستخرجة</span>
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {keyFields!.map((f, i) => (
                  <div key={i} className="min-w-0">
                    <dt
                      className="text-[9px] uppercase tracking-wide"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {f.label}
                    </dt>
                    <dd
                      className="text-[12px] font-semibold truncate"
                      style={{ color: "white" }}
                      title={f.value}
                    >
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2">
          {renaming && a.canRename ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: "var(--white)", color: "var(--navy)" }}
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
                style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${
                  Number(!!a.canRename) + Number(!!a.canShare) + Number(!!a.canOpen)
                }, minmax(0, 1fr))`,
              }}
            >
              {a.canRename && (
                <button
                  onClick={() => {
                    setRenameDraft(title);
                    setRenaming(true);
                  }}
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.14)", color: "white" }}
                >
                  <Pencil size={13} /> Rename
                </button>
              )}
              {a.canShare && (
                <button
                  onClick={() => void onShare?.()}
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.14)", color: "white" }}
                >
                  <Share2 size={13} /> Share
                </button>
              )}
              {a.canOpen && url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white"
                  style={{ background: "var(--gold)" }}
                >
                  <Eye size={13} /> Open
                </a>
              )}
            </div>
          )}

          {a.canDownload && url && (
            <a
              href={url}
              download={fileName}
              className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.14)", color: "white" }}
            >
              <Download size={13} /> Download
            </a>
          )}

          {a.canDelete && (
            <button
              onClick={() => void onDelete?.()}
              className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(192,57,43,0.18)", color: "white" }}
            >
              <X size={13} /> Delete attachment
            </button>
          )}
        </div>
      </div>
    </OverlayLayer>
  );
}
