/**
 * ReceiptAuditLog — admin-facing trail of every action taken on a single
 * payment receipt: created, attached, status changes (approve/reject/info/expire).
 *
 * Reads `admin_audit_log` rows where `target_type = 'payment_receipt'` and
 * `target_id = receiptId`. Subscribes to realtime inserts so newly logged
 * actions appear without a refresh.
 */
import { useEffect, useState } from "react";
import { Activity, Clock, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const HUMAN = (a: string): string =>
  a.replace(/^payment_receipt_/, "Status → ")
    .replace("payment_receipt_uploaded", "Receipt uploaded")
    .replace(/_/g, " ");

const ReceiptAuditLog = ({ receiptId }: { receiptId: string }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Realtime: append new rows for this receipt as they happen.
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

  if (loading) {
    return (
      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <Loader2 size={11} className="animate-spin" /> Loading audit trail…
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="text-[11px] text-slate-500">No actions recorded yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono tracking-widest text-slate-400 flex items-center gap-1">
        <Activity size={10} /> AUDIT TRAIL · {rows.length}
      </p>
      <ol className="border-l border-slate-800 pl-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="relative">
            <span className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full bg-slate-600" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${ACTION_TONE(r.action)}`}>
                {HUMAN(r.action)}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock size={9} /> {new Date(r.created_at).toLocaleString()}
              </span>
              {r.actor_email && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <UserIcon size={9} /> {r.actor_email}
                  {r.actor_role && <span className="text-slate-600">· {r.actor_role}</span>}
                </span>
              )}
              {!r.actor_email && (
                <span className="text-[10px] text-slate-500 italic">system</span>
              )}
            </div>
            {r.details && Object.keys(r.details).length > 0 && (
              <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap break-all bg-slate-900/40 rounded px-2 py-1 max-w-full overflow-x-auto">
                {JSON.stringify(r.details, null, 0)}
              </pre>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ReceiptAuditLog;
