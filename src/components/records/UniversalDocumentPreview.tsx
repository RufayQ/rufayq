import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";

interface Props {
  url: string;
  fileName: string;
  title: string;
  mimeType?: string | null;
  page?: number;
  className?: string;
}

const isImage = (mime?: string | null, name?: string) =>
  (!!mime && mime.startsWith("image/")) || (!!name && /\.(png|jpe?g|webp|gif|heic)$/i.test(name));

const isPdf = (mime?: string | null, name?: string) =>
  mime === "application/pdf" || (!!name && /\.pdf$/i.test(name));

const isOffice = (mime?: string | null, name?: string) => {
  if (mime) {
    if (
      mime === "application/msword" ||
      mime.startsWith("application/vnd.openxmlformats-officedocument") ||
      mime.startsWith("application/vnd.ms-")
    ) return true;
  }
  return !!name && /\.(docx?|xlsx?|pptx?)$/i.test(name);
};

/** Generic loading panel · لوحة تحميل */
const LoadingPanel = ({ label }: { label: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg" style={{ background: "var(--off-white)" }}>
    <Loader2 size={22} className="animate-spin" style={{ color: "var(--teal-deep)" }} />
    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{label}</p>
    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>جارٍ تحميل المعاينة…</p>
  </div>
);

/** Generic error panel with retry / fallback links · لوحة خطأ */
const ErrorPanel = ({
  url,
  fileName,
  onRetry,
  message,
}: { url: string; fileName: string; onRetry: () => void; message?: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg px-5 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
    <AlertTriangle size={24} style={{ color: "var(--error, #c0392b)" }} />
    <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Preview unavailable</p>
    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعذّر عرض المعاينة</p>
    {message && <p className="text-[10px]" style={{ color: "var(--gray)" }}>{message}</p>}
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold" style={{ background: "var(--teal-deep)", color: "var(--white)" }}>
        <RefreshCw size={12} /> Retry · إعادة
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold" style={{ background: "var(--gold)", color: "var(--white)" }}>
        <Eye size={12} /> Open in new tab
      </a>
      <a href={url} download={fileName} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold" style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
        <Download size={12} /> Download
      </a>
    </div>
  </div>
);

/** PDF preview with loading + error + retry. */
const PdfPreview = ({ url, fileName, title, page, className }: { url: string; fileName: string; title: string; page: number; className?: string }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const timerRef = useRef<number | null>(null);
  const pageHash = `#page=${Math.max(1, page)}&view=FitH&toolbar=1`;
  const src = `${url}${pageHash}`;

  useEffect(() => {
    setStatus("loading");
    // Some browsers (especially mobile WebViews) never fire load on <object>/PDF.
    // Treat 8s with no load event as a soft failure so we can offer Open/Download.
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, 8000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [src, nonce]);

  const onReady = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setStatus("ready");
  };

  return (
    <div className={className ?? "relative h-full w-full rounded-lg bg-white"}>
      <object
        key={`obj-${nonce}`}
        data={src}
        type="application/pdf"
        aria-label={`${title} PDF preview`}
        className="h-full w-full rounded-lg bg-white"
        onLoad={onReady}
        onError={() => setStatus("error")}
      >
        <iframe
          key={`if-${nonce}`}
          src={src}
          title={fileName}
          className="h-full w-full rounded-lg bg-white"
          onLoad={onReady}
          onError={() => setStatus("error")}
        />
      </object>
      {status === "loading" && (
        <div className="absolute inset-0">
          <LoadingPanel label="Loading PDF preview…" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0">
          <ErrorPanel
            url={url}
            fileName={fileName}
            message="Your browser couldn't render this PDF inline."
            onRetry={() => { setStatus("loading"); setNonce((n) => n + 1); }}
          />
        </div>
      )}
    </div>
  );
};

/** Image preview with loading + error fallback. */
const ImagePreview = ({ url, title, fileName, className }: { url: string; title: string; fileName: string; className?: string }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  return (
    <div className={className ?? "relative max-h-full max-w-full"}>
      <img
        key={nonce}
        src={url}
        alt={title}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className={status === "ready" ? "max-h-full max-w-full object-contain rounded-lg" : "opacity-0 max-h-full max-w-full"}
      />
      {status === "loading" && (
        <div className="absolute inset-0"><LoadingPanel label="Loading image…" /></div>
      )}
      {status === "error" && (
        <div className="absolute inset-0">
          <ErrorPanel
            url={url}
            fileName={fileName}
            message="The image could not be loaded."
            onRetry={() => { setStatus("loading"); setNonce((n) => n + 1); }}
          />
        </div>
      )}
    </div>
  );
};

const UniversalDocumentPreview = ({ url, fileName, title, mimeType, page = 1, className }: Props) => {
  if (isImage(mimeType, fileName)) {
    return <ImagePreview url={url} title={title} fileName={fileName} className={className} />;
  }

  if (isPdf(mimeType, fileName)) {
    return <PdfPreview url={url} fileName={fileName} title={title} page={page} className={className} />;
  }

  if (isOffice(mimeType, fileName)) {
    return (
      <div className={className ?? "flex h-full w-full flex-col items-center justify-center rounded-lg px-6 text-center"} style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
        <FileText size={48} style={{ color: "var(--gold)" }} />
        <p className="mt-3 text-[13px] font-bold" style={{ color: "var(--navy)" }}>{fileName}</p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--gray)" }}>
          Word and Office files open in your document viewer.
          <br />
          <span dir="rtl" className="font-arabic">تُفتح ملفات Word و Office في عارض المستندات</span>
        </p>
        <div className="mt-4 flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold" style={{ background: "var(--gold)", color: "var(--white)" }}>
            <Eye size={13} /> Open
          </a>
          <a href={url} download={fileName} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold" style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
            <Download size={13} /> Download
          </a>
        </div>
      </div>
    );
  }

  // Generic fallback (unknown type): try iframe with loading state.
  return <PdfPreview url={url} fileName={fileName} title={title} page={page} className={className} />;
};

export { isImage, isPdf, isOffice };
export default UniversalDocumentPreview;
