/**
 * FileUploadPreview — shared preview card for any uploaded file.
 *
 * Renders:
 *   • Image thumbnail (object-contain, max-h 56) for image/* types.
 *   • Inline PDF embed (height 220) for application/pdf.
 *   • Generic icon + filename + size for everything else.
 *
 * Always shows: filename, formatted size, MIME, and an optional remove button.
 * Bilingual labels (EN/AR) when `lang="ar"` is passed.
 *
 * Uses URL.createObjectURL with proper cleanup so it works for File or Blob.
 */
import { useEffect, useState } from "react";
import { FileText, X, Eye, CheckCircle2 } from "lucide-react";

export interface FileUploadPreviewProps {
  file: File | null;
  onRemove?: () => void;
  lang?: "en" | "ar" | "both";
  compact?: boolean;
  /** Override max preview height in pixels for image/PDF. */
  maxHeight?: number;
}

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const FileUploadPreview = ({ file, onRemove, lang = "both", maxHeight = 224, compact = false }: FileUploadPreviewProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  const isAr = lang === "ar";
  const showBoth = lang === "both";

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(148,163,184,0.25)", background: "rgba(15,23,42,0.04)" }}>
      {/* Preview area */}
      {isImage && url && (
        <div className="bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <img src={url} alt={file.name} className="w-full object-contain" style={{ maxHeight }} />
        </div>
      )}
      {isPdf && url && (
        <div className="bg-slate-50 dark:bg-slate-900">
          <embed src={url} type="application/pdf" className="w-full block" style={{ height: maxHeight }} />
        </div>
      )}
      {!isImage && !isPdf && (
        <div className="flex items-center gap-3 px-3 py-4">
          <FileText size={28} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 truncate">
            {isAr ? "لا توجد معاينة لهذا النوع" : "No inline preview for this file type"}
          </p>
        </div>
      )}

      {/* Meta footer */}
      <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate" title={file.name}>{file.name}</p>
          {!compact && (
            <p className="text-[10px] text-slate-500 truncate">
              {formatBytes(file.size)} · {file.type || (isAr ? "نوع غير معروف" : "unknown type")}
              {showBoth && " · جاهز"}
            </p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
            aria-label={isAr ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
          >
            <Eye size={11} /> {isAr ? "فتح" : "Open"}
          </a>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] inline-flex items-center gap-1 text-rose-500 hover:text-rose-600"
            aria-label={isAr ? "إزالة الملف" : "Remove file"}
          >
            <X size={12} /> {isAr ? "إزالة" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploadPreview;
