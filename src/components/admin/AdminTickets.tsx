import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { ticketsClient, useRealtimeChannel, type SupportTicket, type TicketStatus } from "@/api";
import { toast } from "sonner";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";

const STATUS_OPTIONS: Array<{ value: TicketStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = ["all", "low", "normal", "high", "urgent"] as const;

const AdminTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<typeof PRIORITY_OPTIONS[number]>("all");

  useQuickCreateSignal("tickets", () => toast.info("Open a customer ticket from the user profile or via the support reply panel."));

  const load = async () => {
    setLoading(true);
    const res = await ticketsClient.list();
    if (res.error) toast.error(res.error.message); else setTickets(res.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Live refresh — any open-ticket change triggers a reload so the moderator
  // always sees the current queue without hitting the refresh button.
  useRealtimeChannel("ticketsOpen", () => load());

  const update = async (id: string, status: string) => {
    const res = await ticketsClient.updateStatus(id, status as TicketStatus);
    if (res.error) toast.error(res.error.message);
    else { toast.success("Updated"); load(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.ticket_number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.user_email || "").toLowerCase().includes(q) ||
        (t.user_name || "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket #, title, email, category…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({counts[s.value] ?? 0})
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as typeof PRIORITY_OPTIONS[number])}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 capitalize"
        >
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p === "all" ? "All priorities" : p}</option>)}
        </select>
        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />Refresh
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          showing <span className="text-slate-300">{filtered.length}</span> of {tickets.length}
        </span>
      </div>

      {loading && tickets.length === 0 && <p className="text-slate-400 text-sm">Loading…</p>}

      <div className="space-y-3">
        {!loading && filtered.length === 0 && (
          <p className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">
            No tickets match these filters.
          </p>
        )}
        {filtered.map((t) => (
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
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {t.user_name || "—"} · {t.user_email || "no email"} · {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
              <select
                value={t.status}
                onChange={(e) => update(t.id, e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0"
              >
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
    </div>
  );
};

export default AdminTickets;
