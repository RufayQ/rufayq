import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";

interface Ticket {
  id: string; ticket_number: string; title: string; description: string;
  category: string; priority: string; status: string; user_email: string | null;
  user_name: string | null; created_at: string; resolution_notes: string | null;
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setTickets((data || []) as Ticket[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "ticket_updated", _target_type: "ticket", _target_id: id, _details: { status } });
      toast.success("Updated"); load();
    }
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
