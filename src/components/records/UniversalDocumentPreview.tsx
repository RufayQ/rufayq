import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Eye, FileText, Loader2, Maximize2, RefreshCw, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { emitPdfAnalytics, hashUrl } from "@/lib/pdfAnalytics";
import { loadPdfViewerState, savePdfViewerState } from "@/lib/pdfViewerState";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  url: string;
  fileName: string;
  title: string;
  mimeType?: string | null;
  page?: number;
  className?: string;
  /** Optional structured logger for QC pipelines · مسجّل اختياري */
  onError?: (info: { kind: "pdf" | "image"; message: string; url: string }) => void;
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

const logError = (
  cb: Props["onError"],
  payload: { kind: "pdf" | "image"; message: string; url: string },
) => {
  try { cb?.(payload); } catch { /* never let logger crash UI */ }
  // Structured console log for QC artifact collectors.
  console.warn("[UniversalDocumentPreview]", payload);
};

const LoadingPanel = ({ label }: { label: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg"
    style={{ background: "var(--off-white)" }}
  >
    <Loader2 size={22} className="animate-spin" style={{ color: "var(--teal-deep)" }} />
    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{label}</p>
    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>جارٍ تحميل المعاينة…</p>
  </div>
);

const ErrorPanel = ({
  url, fileName, onRetry, message,
}: { url: string; fileName: string; onRetry: () => void; message?: string }) => (
  <div
    role="alert"
    className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg px-5 text-center"
    style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
  >
    <AlertTriangle size={24} aria-hidden style={{ color: "var(--error, #c0392b)" }} />
    <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Preview unavailable</p>
    <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعذّر عرض المعاينة</p>
    {message && <p className="text-[10px]" style={{ color: "var(--gray)" }}>{message}</p>}
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry preview"
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ background: "var(--teal-deep)", color: "var(--white)" }}
      >
        <RefreshCw size={12} aria-hidden /> Retry · إعادة
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open document in a new tab"
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
        style={{ background: "var(--gold)", color: "var(--white)" }}
      >
        <Eye size={12} aria-hidden /> Open in new tab
      </a>
      <a
        href={url}
        download={fileName}
        aria-label={`Download ${fileName}`}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
        style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
      >
        <Download size={12} aria-hidden /> Download
      </a>
    </div>
  </div>
);

const GenericFilePanel = ({ url, fileName, className, label }: { url: string; fileName: string; className?: string; label?: string }) => (
  <div className={className ?? "flex h-full w-full flex-col items-center justify-center rounded-lg px-6 text-center"} style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
    <FileText size={48} aria-hidden style={{ color: "var(--gold)" }} />
    <p className="mt-3 text-[13px] font-bold" style={{ color: "var(--navy)" }}>{fileName}</p>
    <p className="mt-1 text-[11px]" style={{ color: "var(--gray)" }}>
      {label ?? "This file type opens in your device's document viewer."}
      <br />
      <span dir="rtl" className="font-arabic">يُفتح هذا الملف في عارض المستندات لديك</span>
    </p>
    <div className="mt-4 flex gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${fileName}`} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold" style={{ background: "var(--gold)", color: "var(--white)" }}>
        <Eye size={13} aria-hidden /> Open
      </a>
      <a href={url} download={fileName} aria-label={`Download ${fileName}`} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold" style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
        <Download size={13} aria-hidden /> Download
      </a>
    </div>
  </div>
);

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

const PdfPreview = ({
  url, fileName, title, page, className, onError,
}: { url: string; fileName: string; title: string; page: number; className?: string; onError?: Props["onError"] }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [currentPage, setCurrentPage] = useState<number>(Math.max(1, page));
  const [numPages, setNumPages] = useState<number>(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | "manual">("fit");
  const [zoom, setZoom] = useState<number>(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<Array<{ page: number; index: number }>>([]);
  const [matchCursor, setMatchCursor] = useState(0);
  const [pageText, setPageText] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setCurrentPage(Math.max(1, page)); }, [url, page]);

  // Render current page → image
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setImageSrc(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setStatus((s) => {
        if (s === "loading") {
          setErrorMessage("Loading timed out after 12 seconds.");
          logError(onError, { kind: "pdf", message: "timeout", url });
          return "error";
        }
        return s;
      });
    }, 12000);
    (async () => {
      try {
        let pdf = pdfRef.current;
        if (!pdf) {
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
          pdf = await pdfjsLib.getDocument(source).promise;
          pdfRef.current = pdf;
          if (cancelled) return;
          setNumPages(pdf.numPages);
        }
        const safePage = Math.min(Math.max(1, currentPage), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        let scale = 1.6 * zoom;
        if (zoomMode === "fit" && containerRef.current) {
          const w = containerRef.current.clientWidth || 600;
          scale = Math.max(0.5, (w - 8) / baseViewport.width);
        }
        const viewport = pdfPage.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no-canvas");
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        // Collect text for in-document search
        try {
          const tc = await pdfPage.getTextContent();
          const text = tc.items.map((it: any) => it.str).join(" ");
          setPageText(text);
        } catch { setPageText(""); }
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setImageSrc(canvas.toDataURL("image/jpeg", 0.88));
        setStatus("ready");
      } catch (e: any) {
        const msg = e?.message || "Render failed";
        logError(onError, { kind: "pdf", message: msg, url });
        if (!cancelled) {
          setErrorMessage(msg);
          setStatus("error");
        }
      }
    })();
    return () => { cancelled = true; if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [url, currentPage, nonce, zoom, zoomMode, onError]);

  // Drop cached pdf when url/nonce changes
  useEffect(() => { pdfRef.current = null; }, [url, nonce]);

  const runSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    setMatchCursor(0);
    if (!term.trim() || !pdfRef.current) { setMatches([]); return; }
    const pdf = pdfRef.current;
    const needle = term.toLowerCase();
    const results: Array<{ page: number; index: number }> = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const p = await pdf.getPage(i);
        const tc = await p.getTextContent();
        const t = tc.items.map((it: any) => it.str).join(" ").toLowerCase();
        let from = 0;
        while (true) {
          const at = t.indexOf(needle, from);
          if (at === -1) break;
          results.push({ page: i, index: at });
          from = at + needle.length;
          if (results.length > 500) break;
        }
        if (results.length > 500) break;
      } catch { /* ignore page */ }
    }
    setMatches(results);
    if (results.length > 0) setCurrentPage(results[0].page);
  }, []);

  const gotoMatch = (delta: number) => {
    if (!matches.length) return;
    const next = (matchCursor + delta + matches.length) % matches.length;
    setMatchCursor(next);
    setCurrentPage(matches[next].page);
  };

  // Build highlighted snippet for current page
  const highlightedSnippet = useMemo(() => {
    if (!searchTerm.trim() || !pageText) return null;
    const text = pageText;
    const lower = text.toLowerCase();
    const needle = searchTerm.toLowerCase();
    const at = lower.indexOf(needle);
    if (at === -1) return null;
    const start = Math.max(0, at - 40);
    const end = Math.min(text.length, at + needle.length + 40);
    return {
      before: (start > 0 ? "… " : "") + text.slice(start, at),
      hit: text.slice(at, at + needle.length),
      after: text.slice(at + needle.length, end) + (end < text.length ? " …" : ""),
    };
  }, [pageText, searchTerm]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (status !== "ready") return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      setCurrentPage((p) => Math.min(numPages, p + 1));
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      setCurrentPage((p) => Math.max(1, p - 1));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setZoomMode("manual"); setZoom((z) => clampZoom(z + ZOOM_STEP));
    } else if (e.key === "-") {
      e.preventDefault();
      setZoomMode("manual"); setZoom((z) => clampZoom(z - ZOOM_STEP));
    } else if (e.key === "0") {
      e.preventDefault();
      setZoomMode("fit"); setZoom(1);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 10);
    } else if (e.key === "Escape" && searchOpen) {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  const canPaginate = status === "ready" && numPages > 1;

  return (
    <div
      ref={containerRef}
      className={className ?? "relative h-full w-full rounded-lg bg-white"}
      role="region"
      aria-label={`PDF preview: ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="PDF viewer controls"
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow"
        style={{ background: "rgba(0,0,0,0.65)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        <button type="button" aria-label="Zoom out" onClick={() => { setZoomMode("manual"); setZoom((z) => clampZoom(z - ZOOM_STEP)); }} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
          <ZoomOut size={12} aria-hidden />
        </button>
        <span data-testid="pdf-zoom-indicator" aria-live="polite">{Math.round((zoomMode === "fit" ? 1 : zoom) * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => { setZoomMode("manual"); setZoom((z) => clampZoom(z + ZOOM_STEP)); }} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
          <ZoomIn size={12} aria-hidden />
        </button>
        <button type="button" aria-label="Fit to width" aria-pressed={zoomMode === "fit"} onClick={() => { setZoomMode("fit"); setZoom(1); }} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
          <Maximize2 size={12} aria-hidden />
        </button>
        <button type="button" aria-label="Search in document" aria-pressed={searchOpen} onClick={() => { setSearchOpen((v) => !v); setTimeout(() => searchInputRef.current?.focus(), 10); }} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
          <Search size={12} aria-hidden />
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] shadow"
             style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Find in document"
            placeholder="Find · بحث"
            value={searchTerm}
            onChange={(e) => runSearch(e.target.value)}
            className="bg-transparent outline-none px-2 py-0.5 placeholder-white/60 w-40"
          />
          <span data-testid="pdf-search-count" aria-live="polite" className="px-1">
            {matches.length ? `${matchCursor + 1}/${matches.length}` : "0/0"}
          </span>
          <button type="button" aria-label="Previous match" disabled={!matches.length} onClick={() => gotoMatch(-1)} className="px-2 py-0.5 rounded-full disabled:opacity-40" style={{ background: "rgba(255,255,255,0.15)" }}>‹</button>
          <button type="button" aria-label="Next match" disabled={!matches.length} onClick={() => gotoMatch(1)} className="px-2 py-0.5 rounded-full disabled:opacity-40" style={{ background: "rgba(255,255,255,0.15)" }}>›</button>
          <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}><X size={11} aria-hidden /></button>
        </div>
      )}

      {imageSrc && (
        <div className="h-full w-full overflow-auto">
          <img
            src={imageSrc}
            alt={`${title} — page ${currentPage} of ${numPages}`}
            className="block mx-auto bg-white"
            style={{ maxWidth: zoomMode === "fit" ? "100%" : "none" }}
          />
        </div>
      )}

      {/* Highlight snippet */}
      {highlightedSnippet && (
        <div
          data-testid="pdf-search-highlight"
          role="status"
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 max-w-[90%] rounded-md px-3 py-1.5 text-[11px] shadow"
          style={{ background: "rgba(255,255,255,0.95)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        >
          {highlightedSnippet.before}
          <mark style={{ background: "var(--gold)", color: "#fff", padding: "0 2px", borderRadius: 2 }}>{highlightedSnippet.hit}</mark>
          {highlightedSnippet.after}
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0"><LoadingPanel label="Loading PDF preview…" /></div>
      )}
      {status === "error" && (
        <div className="absolute inset-0">
          <ErrorPanel
            url={url}
            fileName={fileName}
            message={errorMessage ?? (url.startsWith("blob:")
              ? "This preview link expired after the app reloaded. Please re-scan or re-upload the document."
              : "Your browser couldn't render this PDF inline.")}
            onRetry={() => { setStatus("loading"); setErrorMessage(null); setNonce((n) => n + 1); }}
          />
        </div>
      )}

      {canPaginate && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold shadow"
          style={{ background: "rgba(0,0,0,0.65)", color: "#fff", backdropFilter: "blur(4px)" }}
          role="group"
          aria-label="PDF pagination"
        >
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2 py-0.5 rounded-full disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >‹</button>
          <span data-testid="pdf-page-indicator" aria-live="polite">{currentPage} / {numPages}</span>
          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            className="px-2 py-0.5 rounded-full disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >›</button>
          <a
            href={url}
            download={fileName}
            aria-label="Download PDF"
            className="ml-1 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={11} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
};

const ImagePreview = ({
  url, title, fileName, className, onError,
}: { url: string; title: string; fileName: string; className?: string; onError?: Props["onError"] }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  return (
    <div className={className ?? "relative max-h-full max-w-full"}>
      <img
        key={nonce}
        src={url}
        alt={title}
        onLoad={() => setStatus("ready")}
        onError={() => { logError(onError, { kind: "image", message: "image load failed", url }); setStatus("error"); }}
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

const UniversalDocumentPreview = ({ url, fileName, title, mimeType, page = 1, className, onError }: Props) => {
  if (isImage(mimeType, fileName)) {
    return <ImagePreview url={url} title={title} fileName={fileName} className={className} onError={onError} />;
  }
  if (isPdf(mimeType, fileName)) {
    return <PdfPreview url={url} fileName={fileName} title={title} page={page} className={className} onError={onError} />;
  }
  if (isOffice(mimeType, fileName)) {
    return <GenericFilePanel url={url} fileName={fileName} className={className} label="Word and Office files open in your document viewer." />;
  }
  return <GenericFilePanel url={url} fileName={fileName} className={className} />;
};

export { isImage, isPdf, isOffice };
export default UniversalDocumentPreview;
