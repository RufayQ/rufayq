/**
 * ReceiptAuditLog — admin/patient-facing trail of every action taken on a
 * single payment receipt: created, attached, status changes (approve/reject/
 * info/expire).
 *
 * Reads `admin_audit_log` rows where `target_type = 'payment_receipt'` and
 * `target_id = receiptId`. Subscribes to realtime inserts so newly logged
 * actions appear without a refresh.
 *
 * Bilingual: action labels and timestamps render in EN, AR, or both based on
 * `useLanguage()` and flip to RTL when the active mode is `ar`.
 */
import { useEffect, useState } from "react";
import { Activity, Clock, User as UserIcon, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateReceiptAuditPdf, type PdfAuditRow, type PdfReceiptInfo, type PdfTimelineStep } from "@/features/payments/logic/receiptAuditPdf";
import { ACTION_LABELS } from "@/features/payments/logic/auditLabels";

interface AuditRow {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_TONE = (a: string): string => {
  if (a.endsWith("verified")) return "text-emerald-300 bg-emerald-500/10";
  if (a.endsWith("rejected")) return "text-rose-300 bg-rose-500/10";
  if (a.endsWith("code_expired")) return "text-orange-300 bg-orange-500/10";
  if (a.endsWith("under_review")) return "text-blue-300 bg-blue-500/10";
  if (a.endsWith("uploaded") || a.includes("created")) return "text-amber-300 bg-amber-500/10";
  return "text-slate-300 bg-slate-700/40";
};

interface Props {
  receiptId: string;
  /** Optional: enables the inline PDF export button when provided. */
  exportContext?: {
    receipt: PdfReceiptInfo;
    timeline: PdfTimelineStep[];
  };
}

const ReceiptAuditLog = ({ receiptId, exportContext }: Props) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { mode, showEn, showAr } = useLanguage();
  const isRtl = mode === "ar";

  const tLabels = {
    loading: { en: "Loading audit trail…", ar: "جاري تحميل سجل المراجعة…" },
    none: { en: "No actions recorded yet.", ar: "لا توجد إجراءات مسجّلة بعد." },
    title: { en: "AUDIT TRAIL", ar: "سجل المراجعة" },
    system: { en: "system", ar: "النظام" },
    export: { en: "Export PDF", ar: "تصدير PDF" },
  };

  const tsLocale = mode === "ar" ? "ar-SA" : undefined;
  const fmtTs = (iso: string) => new Date(iso).toLocaleString(tsLocale);

  const renderBi = (en: string, ar: string) => {
    if (showEn && showAr) return `${en} · ${ar}`;
    return showAr ? ar : en;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id,actor_email,actor_role,action,details,created_at")
        .eq("target_type", "payment_receipt")
        .eq("target_id", receiptId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setRows((data ?? []) as AuditRow[]);
        setLoading(false);
      }
    };
    load();

    const ch = supabase
      .channel(`audit-receipt-${receiptId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        (payload) => {
          const r = payload.new as AuditRow & { target_type?: string; target_id?: string };
          if (r.target_type === "payment_receipt" && r.target_id === receiptId) {
            setRows((cur) => [r, ...cur]);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [receiptId]);

  const handleExport = () => {
    if (!exportContext) return;
    const auditPdf: PdfAuditRow[] = rows.map((r) => {
      const lbl = ACTION_LABELS[r.action] ?? { en: r.action.replace(/_/g, " "), ar: r.action };
      return {
        action: r.action,
        enLabel: lbl.en,
        arLabel: lbl.ar,
        actor: r.actor_email ? `${r.actor_email}${r.actor_role ? ` (${r.actor_role})` : ""}` : "system",
        created_at: r.created_at,
        details: r.details ?? null,
      };
    });
    const doc = generateReceiptAuditPdf({
      receipt: exportContext.receipt,
      timeline: exportContext.timeline,
      audit: auditPdf,
    });
    doc.save(`receipt-${exportContext.receipt.payment_reference ?? receiptId}.pdf`);
  };

  if (loading) {
    return (
      <p className="text-[11px] text-slate-500 flex items-center gap-1" dir={isRtl ? "rtl" : "ltr"}>
        <Loader2 size={11} className="animate-spin" /> {renderBi(tLabels.loading.en, tLabels.loading.ar)}
      </p>
    );
  }

  return (
    <div className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono tracking-widest text-slate-400 flex items-center gap-1">
          <Activity size={10} /> {renderBi(tLabels.title.en, tLabels.title.ar)} · {rows.length}
        </p>
        {exportContext && rows.length > 0 && (
          <button onClick={handleExport}
            className="text-[10px] px-2 py-1 rounded flex items-center gap-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200">
            <Download size={10} /> {renderBi(tLabels.export.en, tLabels.export.ar)}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500">{renderBi(tLabels.none.en, tLabels.none.ar)}</p>
      ) : (
        <ol className={`${isRtl ? "border-r pr-3" : "border-l pl-3"} border-slate-800 space-y-2`}>
          {rows.map((r) => {
            const lbl = ACTION_LABELS[r.action] ?? { en: r.action.replace(/_/g, " "), ar: r.action };
            return (
              <li key={r.id} className="relative">
                <span className={`absolute ${isRtl ? "-right-[15px]" : "-left-[15px]"} top-1.5 w-2 h-2 rounded-full bg-slate-600`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${ACTION_TONE(r.action)}`}>
                    {showEn && lbl.en}
                    {showEn && showAr && " · "}
                    {showAr && <span className="font-arabic" dir="rtl">{lbl.ar}</span>}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock size={9} /> {fmtTs(r.created_at)}
                  </span>
                  {r.actor_email ? (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <UserIcon size={9} /> {r.actor_email}
                      {r.actor_role && <span className="text-slate-600">· {r.actor_role}</span>}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">
                      {renderBi(tLabels.system.en, tLabels.system.ar)}
                    </span>
                  )}
                </div>
                {r.details && Object.keys(r.details).length > 0 && (
                  <pre dir="ltr" className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap break-all bg-slate-900/40 rounded px-2 py-1 max-w-full overflow-x-auto">
                    {JSON.stringify(r.details, null, 0)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default ReceiptAuditLog;
