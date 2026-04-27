import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, ShieldCheck, Crown } from "lucide-react";
import AdminTable, { type AdminTableColumn } from "@/components/admin/shell/AdminTable";

interface StaffRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  rufayq_id: string | null;
  role: "admin" | "moderator";
}

const AdminSettingsTeam = () => {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      let profiles: any[] = [];
      if (ids.length) {
        const r = await (supabase as any).from("profiles").select("id, email, full_name").in("id", ids);
        profiles = r.data ?? [];
      }
      const out: StaffRow[] = (roles ?? []).map((r: any) => {
        const p = profiles.find((x) => x.id === r.user_id);
        return {
          user_id: r.user_id,
          email: p?.email ?? null,
          full_name: p?.full_name ?? null,
          role: r.role,
        };
      });
      if (alive) { setRows(out); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const columns = useMemo<AdminTableColumn<StaffRow>[]>(() => [
    {
      key: "person",
      header: "Person",
      value: (r) => `${r.full_name ?? ""} ${r.email ?? ""}`.trim(),
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-amber-300 uppercase">
            {(r.full_name || r.email || "?").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="text-slate-100 truncate">{r.full_name || "(no name)"}</div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1"><Mail size={10} /> {r.email || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      value: (r) => r.role,
      cell: (r) => r.role === "admin"
        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30"><Crown size={9} /> Admin</span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30"><ShieldCheck size={9} /> Moderator</span>,
    },
    { key: "id", header: "User ID", value: (r) => r.user_id, cell: (r) => <code className="text-[10px] text-slate-500">{r.user_id.slice(0, 8)}…</code> },
  ], []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Users size={18} className="text-amber-400" />
        <h2 className="text-xl font-semibold text-slate-100">Team & Roles</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">Internal staff with admin or moderator access. Use Users → Create User to add new staff.</p>

      <AdminTable
        id="settings-team"
        rows={rows}
        loading={loading}
        columns={columns}
        rowKey={(r) => r.user_id}
        searchFields={["email", "full_name", "user_id"]}
        searchPlaceholder="Search by name, email, or ID…"
        filters={[
          {
            key: "role", label: "Role",
            options: [
              { value: "_all", label: "All" },
              { value: "admin", label: "Admin" },
              { value: "moderator", label: "Moderator" },
            ],
            match: (r, v) => r.role === v,
          },
        ]}
        drawer={{
          title: (r) => r.full_name || r.email || r.user_id,
          render: (r) => (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Email</div>
                <div className="text-slate-100">{r.email || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Full name</div>
                <div className="text-slate-100">{r.full_name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">User ID</div>
                <code className="text-[11px] text-slate-300 break-all">{r.user_id}</code>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Role</div>
                <div>{r.role}</div>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                Role management UI will land in Phase-2 settings. For now, edit via Audit / direct DB.
              </p>
            </div>
          ),
        }}
      />
    </div>
  );
};

export default AdminSettingsTeam;
