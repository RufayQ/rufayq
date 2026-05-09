/**
 * AccessRequestsInbox — provider-side view of outgoing consent requests.
 * Subscribes to consent_requests for the active org via useProviderRealtime
 * so status changes appear without refresh.
 */
import { useCallback, useEffect, useState } from "react";
import { Inbox, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { providerClient } from "@/api/clients/provider.client";
import { useProviderRealtime } from "@/api/realtime/providerChannels";
import type { ConsentRequest } from "@/api/contracts/provider";

interface Props { organizationId: string }

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending:  { label: "Pending",  cls: "text-amber-300 bg-amber-500/10",   icon: Clock },
  approved: { label: "Approved", cls: "text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
  partial:  { label: "Partial",  cls: "text-cyan-300 bg-cyan-500/10",     icon: AlertCircle },
  denied:   { label: "Denied",   cls: "text-rose-300 bg-rose-500/10",     icon: XCircle },
};

const AccessRequestsInbox = ({ organizationId }: Props) => {
  const [rows, setRows] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await providerClient.consentRequests.listMine(organizationId);
    if (res.data) setRows(res.data);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);
  useProviderRealtime(organizationId, "consent_requests", load);

  return (
    <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <Inbox size={15} className="text-amber-400" /> My access requests ({rows.length})
        </h3>
        <button onClick={load} className="p-1.5 rounded-full bg-slate-800 text-slate-300">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">No access requests yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <div key={r.id} className="rounded-lg p-3 bg-slate-900/60 border border-slate-800">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs font-mono text-slate-200">{r.patient_device_id}</p>
                    <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${s.cls}`}>
                    <Icon size={10} /> {s.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.requested_sections.map((sec) => {
                    const granted = r.approved_sections?.includes(sec);
                    return (
                      <span key={sec}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${granted ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                        {sec}{granted ? " ✓" : ""}
                      </span>
                    );
                  })}
                </div>
                {r.review_note && <p className="text-[10px] text-slate-500 mt-1.5 italic">"{r.review_note}"</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccessRequestsInbox;
