import { Download, Eye, FileText } from "lucide-react";

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

const UniversalDocumentPreview = ({ url, fileName, title, mimeType, page = 1, className }: Props) => {
  if (isImage(mimeType, fileName)) {
    return <img src={url} alt={title} className={className ?? "max-h-full max-w-full object-contain rounded-lg"} />;
  }

  if (isPdf(mimeType, fileName)) {
    const pageHash = `#page=${Math.max(1, page)}&view=FitH&toolbar=1`;
    return (
      <object data={`${url}${pageHash}`} type="application/pdf" aria-label={`${title} PDF preview`} className={className ?? "h-full w-full rounded-lg bg-white"}>
        <iframe src={`${url}${pageHash}`} title={fileName} className="h-full w-full rounded-lg bg-white" />
      </object>
    );
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

  return <iframe src={url} title={fileName} className={className ?? "h-full w-full rounded-lg bg-white"} />;
};

export { isImage, isPdf, isOffice };
export default UniversalDocumentPreview;