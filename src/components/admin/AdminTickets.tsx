import { useEffect, useState } from "react";
import { ticketsClient, type SupportTicket, type TicketStatus } from "@/api";
import { toast } from "sonner";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";

const AdminTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);

  useQuickCreateSignal("tickets", () => toast.info("Open a customer ticket from the user profile or via the support reply panel."));

  const load = async () => {
    setLoading(true);
    const res = await ticketsClient.list();
    if (res.error) toast.error(res.error.message); else setTickets(res.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const res = await ticketsClient.updateStatus(id, status as TicketStatus);
    if (res.error) toast.error(res.error.message);
    else { toast.success("Updated"); load(); }
  };

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-3">
      {tickets.length === 0 && <p className="text-slate-500 text-sm">No tickets yet.</p>}
      {tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs text-amber-400">{t.ticket_number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.category}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.priority}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{t.status}</span>
              </div>
              <h3 className="font-semibold text-sm">{t.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{t.user_name || "—"} · {t.user_email || "no email"} · {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <select value={t.status} onChange={(e) => update(t.id, e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.description}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminTickets;
