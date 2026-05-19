import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setImageSrc(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, 12000);
    (async () => {
      try {
        // pdfjs handles http(s) and blob URLs directly; for data: URLs we
        // decode to a Uint8Array so the worker can parse without a fetch.
        let source: any;
        if (url.startsWith("data:")) {
          const b64 = url.split(",")[1] || "";
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          source = { data: bytes };
        } else {
          source = { url, withCredentials: false };
        }
        const pdf = await pdfjsLib.getDocument(source).promise;
        const safePage = Math.min(Math.max(1, page), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no-canvas");
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setImageSrc(canvas.toDataURL("image/jpeg", 0.88));
        setStatus("ready");
      } catch (e) {
        console.warn("[UniversalDocumentPreview] PDF render failed", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [url, page, nonce]);

  return (
    <div className={className ?? "relative h-full w-full rounded-lg bg-white"}>
      {imageSrc && <img src={imageSrc} alt={`${title} PDF page ${page}`} className="h-full w-full rounded-lg object-contain bg-white" />}
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
            message={url.startsWith("blob:")
              ? "This preview link expired after the app reloaded. Please re-scan or re-upload the document."
              : "Your browser couldn't render this PDF inline."}
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
            message={url.startsWith("blob:")
              ? "This preview link expired after the app reloaded. Please re-scan or re-upload the image."
              : "The image could not be loaded."}
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
