import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Activity } from "lucide-react";
import { ticketsClient, useRealtimeChannel, type SupportTicket, type TicketStatus } from "@/api";
import { toast } from "sonner";
import { useQuickCreateSignal } from "@/components/admin/shell/quickCreateSignal";
import { Can, usePermissions } from "@/features/auth";

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
  const [pulseId, setPulseId] = useState<string | null>(null);
  const { can } = usePermissions();

  useQuickCreateSignal("tickets", () => toast.info("Open a customer ticket from the user profile or via the support reply panel."));

  const load = async () => {
    setLoading(true);
    const res = await ticketsClient.list();
    if (res.error) toast.error(res.error.message); else setTickets(res.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Live refresh — listen to ALL ticket changes (any status) so badges/counts
  // for open / in_progress / resolved / closed all stay accurate as
  // moderators (and the system) move tickets between states.
  useRealtimeChannel<SupportTicket>("ticketsAny", (payload) => {
    const id = (payload.new?.id ?? payload.old?.id) as string | undefined;
    if (id) setPulseId(id);
    load();
    if (id) setTimeout(() => setPulseId((cur) => (cur === id ? null : cur)), 1500);
  });

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

  const STATUS_TONES: Record<string, string> = {
    all: "bg-slate-800 text-slate-200 border-slate-700",
    open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    closed: "bg-slate-700/40 text-slate-400 border-slate-700",
  };
  const canModerate = can("ticket.moderate");

  return (
    <div className="space-y-4">
      {/* Realtime status badges — counts update live as tickets change state */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_OPTIONS.map((s) => {
          const active = statusFilter === s.value;
          const tone = STATUS_TONES[s.value] ?? STATUS_TONES.all;
          return (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 border transition-colors ${active ? tone : "border-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {s.label}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${active ? "bg-black/30" : "bg-slate-800 text-slate-300"}`}>
                {counts[s.value] ?? 0}
              </span>
            </button>
          );
        })}
        <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Activity size={10} className="text-emerald-400 animate-pulse" />live
        </span>
      </div>

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
        {filtered.map((t) => {
          const pulse = pulseId === t.id;
          return (
          <div key={t.id} className={`rounded-xl border p-4 transition-colors ${pulse ? "border-amber-500/60 bg-amber-500/5" : "border-slate-800 bg-slate-900/50"}`}>
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
              <Can
                action="ticket.moderate"
                fallback={
                  <span
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-500 shrink-0"
                    title="You don't have permission to change ticket status"
                  >
                    {t.status}
                  </span>
                }
              >
                <select
                  value={t.status}
                  onChange={(e) => update(t.id, e.target.value)}
                  disabled={!canModerate}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </Can>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.description}</p>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminTickets;
