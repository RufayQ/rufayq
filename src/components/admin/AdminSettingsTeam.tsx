import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, ShieldCheck, Crown, AlertTriangle, X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminTable, { type AdminTableColumn } from "@/components/admin/shell/AdminTable";

interface StaffRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "moderator";
  isSelf?: boolean;
}

const AdminSettingsTeam = () => {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "demote"; row: StaffRow }
    | { kind: "promote"; row: StaffRow }
    | { kind: "revoke"; row: StaffRow }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  // Add-member dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "moderator">("moderator");
  const [addPassword, setAddPassword] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  // Reset typed-confirmation field whenever the modal opens/closes.
  useEffect(() => { setTyped(""); }, [confirm]);

  const resetAddForm = () => {
    setAddEmail(""); setAddName(""); setAddRole("moderator"); setAddPassword("");
  };

  // Generate a temporary password if admin doesn't supply one.
  const genPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let s = "";
    for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const submitAdd = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setAddBusy(true);
    const password = addPassword.trim() || genPassword();
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email,
          password,
          full_name: addName.trim() || null,
          role: addRole,
          provider_type: "internal",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const existed = (data as any)?.already_existed;
      toast.success(
        existed
          ? `${email} already had an account — granted ${addRole} role`
          : `${addRole === "admin" ? "Admin" : "Moderator"} created · password: ${password}`,
        { duration: existed ? 4000 : 12000 }
      );
      setAddOpen(false);
      resetAddForm();
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add member");
    } finally {
      setAddBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);
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
        isSelf: r.user_id === user?.id,
      };
    });
    setRows(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const adminCount = useMemo(() => rows.filter((r) => r.role === "admin").length, [rows]);

  const audit = async (action: string, target: string, details: any) => {
    try {
      await (supabase as any).rpc("log_audit_event", {
        _action: action,
        _target_type: "user_role",
        _target_id: target,
        _details: details,
      });
    } catch { /* non-fatal */ }
  };

  const performChange = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { row, kind } = confirm;
      if (kind === "promote") {
        const { error } = await (supabase as any).from("user_roles").insert({ user_id: row.user_id, role: "admin" });
        if (error) throw error;
        await audit("role_promoted_to_admin", row.user_id, { email: row.email });
        toast.success(`${row.email || "User"} promoted to Admin`);
      } else if (kind === "demote") {
        const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", row.user_id).eq("role", "admin");
        if (error) throw error;
        // Ensure they keep moderator if not present
        await (supabase as any).from("user_roles").upsert({ user_id: row.user_id, role: "moderator" }, { onConflict: "user_id,role" });
        await audit("role_demoted_to_moderator", row.user_id, { email: row.email });
        toast.success(`${row.email || "User"} demoted to Moderator`);
      } else if (kind === "revoke") {
        const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", row.user_id).in("role", ["admin", "moderator"]);
        if (error) throw error;
        await audit("staff_access_revoked", row.user_id, { email: row.email, prior_role: row.role });
        toast.success(`Access revoked for ${row.email || "user"}`);
      }
      setConfirm(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

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
            <div className="text-slate-100 truncate flex items-center gap-1.5">
              {r.full_name || "(no name)"}
              {r.isSelf && <span className="text-[9px] uppercase tracking-wide bg-slate-700 text-slate-300 px-1 py-0.5 rounded">You</span>}
            </div>
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
      <p className="text-xs text-slate-500 mb-4">
        Internal staff with admin or moderator access. {adminCount === 1 && (
          <span className="text-amber-300">Only 1 admin remaining — demotion and revocation are blocked.</span>
        )}
      </p>

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
          render: (r) => {
            const lastAdmin = r.role === "admin" && adminCount <= 1;
            return (
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
                  <div className="text-slate-100 capitalize">{r.role}</div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Manage access</div>
                  {lastAdmin && (
                    <div className="flex items-start gap-2 text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-md px-2.5 py-2">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>This is the last admin account. You must promote another moderator to admin before demoting or revoking this one.</span>
                    </div>
                  )}
                  {r.isSelf && (
                    <div className="flex items-start gap-2 text-[11px] bg-slate-800/60 border border-slate-700 text-slate-300 rounded-md px-2.5 py-2">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>You can't change your own role or revoke your own access.</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {r.role === "moderator" && !r.isSelf && (
                      <button
                        onClick={() => setConfirm({ kind: "promote", row: r })}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition"
                      >
                        Promote to Admin
                      </button>
                    )}
                    {r.role === "admin" && !r.isSelf && !lastAdmin && (
                      <button
                        onClick={() => setConfirm({ kind: "demote", row: r })}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition"
                      >
                        Demote to Moderator
                      </button>
                    )}
                    {!r.isSelf && !lastAdmin && (
                      <button
                        onClick={() => setConfirm({ kind: "revoke", row: r })}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition"
                      >
                        Revoke access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        }}
      />

      {confirm && (() => {
        const fromRole = confirm.row.role;
        const toRole =
          confirm.kind === "promote" ? "admin" :
          confirm.kind === "demote" ? "moderator" :
          "(no access)";
        const requireType = confirm.kind === "revoke";
        const expected = (confirm.row.email || confirm.row.user_id.slice(0, 8)).trim();
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onClick={() => !busy && setConfirm(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <AlertTriangle size={16} className={confirm.kind === "revoke" ? "text-rose-400" : "text-amber-400"} />
                  {confirm.kind === "promote" && "Promote to Admin?"}
                  {confirm.kind === "demote" && "Demote to Moderator?"}
                  {confirm.kind === "revoke" && "Revoke staff access?"}
                </h3>
                <button onClick={() => !busy && setConfirm(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
              </div>

              <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 mb-3">
                <div className="text-xs text-slate-400 mb-2">{confirm.row.full_name || "(no name)"} · <span className="text-slate-500">{confirm.row.email || confirm.row.user_id.slice(0, 8) + "…"}</span></div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase tracking-wide font-semibold">{fromRole}</span>
                  <span className="text-slate-500">→</span>
                  <span className={`px-2 py-0.5 rounded-md uppercase tracking-wide font-semibold ${
                    confirm.kind === "promote" ? "bg-amber-500/20 text-amber-300" :
                    confirm.kind === "demote" ? "bg-sky-500/20 text-sky-300" :
                    "bg-rose-500/20 text-rose-300"
                  }`}>{toRole}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-3">
                {confirm.kind === "promote" && "This grants full admin powers including the ability to manage other staff and roles."}
                {confirm.kind === "demote" && "Their admin powers will be removed. They will keep moderator access."}
                {confirm.kind === "revoke" && "All staff access will be removed. They will lose the admin portal entirely."}
              </p>

              {requireType && (
                <div className="mb-4">
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Type <code className="text-rose-300">{expected}</code> to confirm
                  </label>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirm(null)} disabled={busy} className="px-3 py-1.5 text-xs rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition">Cancel</button>
                <button
                  onClick={performChange}
                  disabled={busy || (requireType && typed.trim() !== expected)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md text-slate-950 transition ${
                    confirm.kind === "revoke" ? "bg-rose-400 hover:bg-rose-300" : "bg-amber-400 hover:bg-amber-300"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {busy ? "Working…" : confirm.kind === "promote" ? "Promote" : confirm.kind === "demote" ? "Demote" : "Revoke"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminSettingsTeam;
