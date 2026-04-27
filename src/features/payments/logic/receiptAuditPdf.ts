/**
 * receiptAuditPdf — generates a portable bilingual PDF combining the receipt
 * status timeline and the admin audit trail. Used by both the patient details
 * screen ("Export PDF") and the admin audit panel.
 *
 * Notes:
 * - jsPDF's built-in fonts don't ship Arabic glyphs, so Arabic strings render
 *   as transliteration-friendly placeholders only when the font can't draw
 *   them. We still print AR strings — most Latin viewers fall back to system
 *   fonts that include Arabic; if not, the EN column remains authoritative.
 * - Single A4 page where possible, paginates if rows overflow.
 */
import jsPDF from "jspdf";

export interface PdfReceiptInfo {
  payment_reference: string | null;
  requested_plan: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  payer_name?: string | null;
}

export interface PdfTimelineStep {
  enLabel: string;
  arLabel: string;
  reachedAt: string | null;
  active: boolean;
  failed?: boolean;
}

export interface PdfAuditRow {
  action: string;
  enLabel: string;
  arLabel: string;
  actor: string;
  created_at: string;
  details?: Record<string, unknown> | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export function generateReceiptAuditPdf(opts: {
  receipt: PdfReceiptInfo;
  timeline: PdfTimelineStep[];
  audit: PdfAuditRow[];
}): jsPDF {
  const { receipt, timeline, audit } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  const line = (x1: number, x2: number, yy: number) => {
    doc.setDrawColor(220);
    doc.line(x1, yy, x2, yy);
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 70);
  doc.text("RufayQ — Receipt Audit & Timeline", M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, M, y);
  y += 18;
  line(M, W - M, y);
  y += 16;

  // Receipt summary block
  doc.setFontSize(11);
  doc.setTextColor(20, 40, 70);
  doc.setFont("helvetica", "bold");
  doc.text("Receipt summary", M, y); y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rows: [string, string][] = [
    ["Reference", receipt.payment_reference ?? "—"],
    ["Plan", receipt.requested_plan],
    ["Amount", `${receipt.currency} ${receipt.amount.toLocaleString()}`],
    ["Status", receipt.status],
    ["Submitted", fmt(receipt.created_at)],
    ["Reviewed", fmt(receipt.reviewed_at)],
  ];
  if (receipt.payer_name) rows.push(["Payer", receipt.payer_name]);
  rows.forEach(([k, v]) => {
    doc.setTextColor(120); doc.text(k, M, y);
    doc.setTextColor(30, 30, 40); doc.text(String(v), M + 110, y);
    y += 13;
  });
  y += 6; line(M, W - M, y); y += 16;

  // Timeline
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 40, 70);
  doc.text("Status timeline / الخط الزمني", M, y); y += 14;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  timeline.forEach((s) => {
    const tone: [number, number, number] = s.failed ? [200, 50, 50] : s.active ? [40, 140, 90] : s.reachedAt ? [20, 80, 110] : [180, 180, 180];
    doc.setFillColor(...tone);
    doc.circle(M + 4, y - 3, 3, "F");
    doc.setTextColor(...tone);
    doc.setFont("helvetica", s.active ? "bold" : "normal");
    doc.text(s.enLabel, M + 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(s.arLabel, M + 180, y);
    doc.setTextColor(80);
    doc.text(fmt(s.reachedAt), W - M - 140, y);
    y += 14;
    if (y > 760) { doc.addPage(); y = M; }
  });
  y += 6; line(M, W - M, y); y += 16;

  // Audit trail
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 40, 70);
  doc.text(`Audit trail / سجل المراجعة (${audit.length})`, M, y); y += 14;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  if (audit.length === 0) {
    doc.setTextColor(140); doc.text("No actions recorded.", M, y); y += 12;
  } else {
    audit.forEach((r) => {
      if (y > 760) { doc.addPage(); y = M; }
      doc.setTextColor(20, 40, 70); doc.setFont("helvetica", "bold");
      doc.text(r.enLabel, M, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      doc.text(r.arLabel, M + 180, y);
      doc.setTextColor(90);
      doc.text(fmt(r.created_at), W - M - 140, y);
      y += 11;
      doc.setTextColor(110);
      doc.text(`actor: ${r.actor}`, M + 8, y);
      y += 11;
      if (r.details && Object.keys(r.details).length) {
        const txt = JSON.stringify(r.details);
        const wrapped = doc.splitTextToSize(txt, W - 2 * M - 8);
        doc.setTextColor(150); doc.setFontSize(8);
        wrapped.forEach((ln: string) => {
          if (y > 770) { doc.addPage(); y = M; }
          doc.text(ln, M + 8, y); y += 10;
        });
        doc.setFontSize(9);
      }
      y += 4;
      doc.setDrawColor(240);
      doc.line(M, y - 2, W - M, y - 2);
      y += 4;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(160);
    doc.text(`RufayQ · Receipt ${receipt.payment_reference ?? ""} · Page ${i}/${pageCount}`,
      M, doc.internal.pageSize.getHeight() - 18);
  }

  return doc;
}
