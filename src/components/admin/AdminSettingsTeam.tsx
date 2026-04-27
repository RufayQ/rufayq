import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Mail, ShieldCheck, Crown, X, AlertTriangle, Copy, ChevronDown } from "lucide-react";
import AdminTable, { type AdminTableColumn } from "@/components/admin/shell/AdminTable";

type Role = "admin" | "moderator";

interface StaffRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  rufayq_id: string | null;
  role: Role;
}

const AdminSettingsTeam = () => {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<StaffRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMe(user?.id ?? null);

    const { data: roles, error: rolesErr } = await (supabase as any)
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "moderator"]);
    if (rolesErr) toast.error(rolesErr.message);

    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    let profiles: any[] = [];
    if (ids.length) {
      const r = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name_en, full_name_ar, rufayq_id")
        .in("id", ids);
      profiles = r.data ?? [];
    }
    const out: StaffRow[] = (roles ?? []).map((r: any) => {
      const p = profiles.find((x) => x.id === r.user_id);
      return {
        user_id: r.user_id,
        email: p?.email ?? null,
        full_name: p?.full_name_en ?? p?.full_name_ar ?? null,
        rufayq_id: p?.rufayq_id ?? null,
        role: r.role,
      };
    });
    // De-dupe by user_id, prefer admin if both rows exist
    const map = new Map<string, StaffRow>();
    for (const row of out) {
      const cur = map.get(row.user_id);
      if (!cur || row.role === "admin") map.set(row.user_id, row);
    }
    setRows(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const audit = async (action: string, target: string, details: any) => {
    try { await (supabase as any).rpc("log_audit_event", { _action: action, _target_type: "user_role", _target_id: target, _details: details }); } catch { /* noop */ }
  };

  const changeRole = async (row: StaffRow, next: Role) => {
    if (row.role === next) { setEditing(null); return; }
    setBusy(true);
    // Wipe all existing privileged roles for this user, then grant the new one.
    const del = await (supabase as any).from("user_roles").delete().eq("user_id", row.user_id).in("role", ["admin", "moderator"]);
    if (del.error) { toast.error(del.error.message); setBusy(false); return; }
    const ins = await (supabase as any).from("user_roles").insert({ user_id: row.user_id, role: next });
    if (ins.error) { toast.error(ins.error.message); setBusy(false); return; }
    await audit("staff_role_changed", row.user_id, { from: row.role, to: next, email: row.email });
    toast.success(`Updated ${row.email || row.user_id.slice(0,8)} → ${next}`);
    setEditing(null);
    setBusy(false);
    load();
  };

  const revokeRole = async (row: StaffRow) => {
    setBusy(true);
    const del = await (supabase as any).from("user_roles").delete().eq("user_id", row.user_id).in("role", ["admin", "moderator"]);
    if (del.error) { toast.error(del.error.message); setBusy(false); return; }
    await audit("staff_role_revoked", row.user_id, { from: row.role, email: row.email });
    toast.success(`Revoked staff access for ${row.email || row.user_id.slice(0,8)}`);
    setRevokeTarget(null);
    setBusy(false);
    load();
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt).then(() => toast.success("Copied"));
  };

  const columns = useMemo<AdminTableColumn<StaffRow>[]>(() => [
    {
      key: "person",
      header: "Person",
      value: (r) => `${r.full_name ?? ""} ${r.email ?? ""}`.trim(),
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-amber-300 uppercase ring-1 ring-slate-700">
            {(r.full_name || r.email || "?").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="text-slate-100 truncate flex items-center gap-2">
              {r.full_name || "(no name)"}
              {me === r.user_id && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">You</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1"><Mail size={10} /> {r.email || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "rufayq_id",
      header: "RufayQ ID",
      value: (r) => r.rufayq_id || "",
      cell: (r) => r.rufayq_id
        ? <code className="text-[10px] text-slate-400">{r.rufayq_id}</code>
        : <span className="text-slate-600 text-[11px]">—</span>,
    },
    {
      key: "role",
      header: "Role",
      value: (r) => r.role,
      cell: (r) => r.role === "admin"
        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30"><Crown size={9} /> Admin</span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30"><ShieldCheck size={9} /> Moderator</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditing(r)}
            disabled={me === r.user_id}
            title={me === r.user_id ? "You can't edit your own role" : "Change role"}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Change
          </button>
          <button
            onClick={() => setRevokeTarget(r)}
            disabled={me === r.user_id}
            title={me === r.user_id ? "You can't revoke your own access" : "Revoke staff access"}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Revoke
          </button>
        </div>
      ),
    },
  ], [me]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Users size={18} className="text-amber-400" />
        <h2 className="text-xl font-semibold text-slate-100">Team & Roles</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Internal staff with admin or moderator access. To add new staff, use{" "}
        <span className="text-slate-300">Users → Create User</span>, then promote them here.
      </p>

      <AdminTable<StaffRow>
        id="settings-team"
        rows={rows}
        loading={loading}
        columns={columns}
        rowKey={(r) => r.user_id}
        searchFields={["email", "full_name", "user_id", "rufayq_id"]}
        searchPlaceholder="Search by name, email, RufayQ ID…"
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
        emptyHint="No staff yet. Promote a user from the Users module after creating them."
        drawer={{
          title: (r) => r.full_name || r.email || r.user_id,
          render: (r) => (
            <div className="space-y-4">
              <Field label="Email">
                <span className="text-slate-100">{r.email || "—"}</span>
                {r.email && (
                  <button onClick={() => copy(r.email!)} className="ml-2 text-slate-500 hover:text-amber-300"><Copy size={11} /></button>
                )}
              </Field>
              <Field label="Full name"><span className="text-slate-100">{r.full_name || "—"}</span></Field>
              <Field label="RufayQ ID">
                {r.rufayq_id ? <code className="text-[11px] text-slate-300">{r.rufayq_id}</code> : <span className="text-slate-500">—</span>}
              </Field>
              <Field label="User ID">
                <code className="text-[11px] text-slate-300 break-all">{r.user_id}</code>
                <button onClick={() => copy(r.user_id)} className="ml-2 text-slate-500 hover:text-amber-300"><Copy size={11} /></button>
              </Field>
              <Field label="Role">
                {r.role === "admin"
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30"><Crown size={9} /> Admin</span>
                  : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30"><ShieldCheck size={9} /> Moderator</span>}
              </Field>
              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => setEditing(r)}
                  disabled={me === r.user_id}
                  className="flex-1 text-xs px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 hover:border-amber-500/40 disabled:opacity-30 transition"
                >
                  Change role
                </button>
                <button
                  onClick={() => setRevokeTarget(r)}
                  disabled={me === r.user_id}
                  className="flex-1 text-xs px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 disabled:opacity-30 transition"
                >
                  Revoke access
                </button>
              </div>
            </div>
          ),
        }}
      />

      {/* Change role modal */}
      {editing && (
        <Modal onClose={() => !busy && setEditing(null)} title={`Change role · ${editing.email || editing.user_id.slice(0,8)}`}>
          <p className="text-xs text-slate-400 mb-4">
            This grants or restricts access across the admin portal. Changes are logged in the audit log.
          </p>
          <div className="space-y-2">
            {(["admin", "moderator"] as Role[]).map((r) => {
              const active = editing.role === r;
              return (
                <button
                  key={r}
                  onClick={() => changeRole(editing, r)}
                  disabled={busy}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition flex items-start gap-3 ${
                    active
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-slate-800 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <span className="mt-0.5">
                    {r === "admin" ? <Crown size={14} className="text-amber-400" /> : <ShieldCheck size={14} className="text-sky-400" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-100 capitalize">{r}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {r === "admin"
                        ? "Full access to every module, including billing, RCM, CMS and user roles."
                        : "Read & support access. Cannot manage roles, billing, or RCM masters."}
                    </span>
                  </span>
                  {active && <span className="text-[10px] text-amber-300 self-center">CURRENT</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditing(null)} disabled={busy} className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Revoke confirmation */}
      {revokeTarget && (
        <Modal onClose={() => !busy && setRevokeTarget(null)} title="Revoke staff access">
          <div className="flex gap-3 mb-4">
            <AlertTriangle size={20} className="text-rose-400 flex-shrink-0" />
            <div className="text-xs text-slate-300">
              <p className="mb-2">
                You're about to remove all admin & moderator privileges from{" "}
                <span className="text-slate-100 font-medium">{revokeTarget.email || revokeTarget.user_id}</span>.
              </p>
              <p className="text-slate-500">
                Their user account will remain active but they will no longer be able to access the admin portal.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setRevokeTarget(null)} disabled={busy} className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
            <button
              onClick={() => revokeRole(revokeTarget)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md bg-rose-500 text-slate-950 font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Revoking…" : "Revoke access"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
    <div className="flex items-center">{children}</div>
  </div>
);

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
    <div
      className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-100"><X size={16} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export default AdminSettingsTeam;
