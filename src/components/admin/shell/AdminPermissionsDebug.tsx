/**
 * AdminPermissionsDebug — small debug panel that lists every Action and
 * whether the current admin's roles allow it. Helps verify why specific
 * action buttons are hidden.
 *
 * Mounted from the admin topbar; opens a popover.
 */
import { useState } from "react";
import { ShieldQuestion, X, Check } from "lucide-react";
import { usePermissions } from "@/features/auth";

const ACTIONS = [
  "subscription.view","subscription.modify","subscription.cancel",
  "payment.view","payment.verify","payment.reject",
  "user.view","user.create","user.assign_role","user.revoke_role",
  "cms.view","cms.edit","cms.publish",
  "audit.view",
  "rcm.view","rcm.modify",
  "ticket.view","ticket.moderate",
  "claim.view","claim.decide",
] as const;

const AdminPermissionsDebug = () => {
  const [open, setOpen] = useState(false);
  const { ready, roles, can } = usePermissions();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Show my permissions (debug)"
        aria-label="Show permissions"
        className="w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700 text-slate-400 hover:text-amber-300 flex items-center justify-center transition"
      >
        <ShieldQuestion size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-end p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">My permissions</h3>
                <p className="text-[11px] text-slate-500">
                  Roles: {ready ? (roles.length ? roles.join(", ") : "—") : "loading…"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                <X size={13} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <ul className="space-y-0.5 text-[11px]">
                {ACTIONS.map((a) => {
                  const allowed = ready && can(a as any);
                  return (
                    <li key={a} className={`flex items-center justify-between px-2 py-1 rounded ${allowed ? "bg-emerald-500/5" : "bg-rose-500/5"}`}>
                      <span className="font-mono text-slate-300">{a}</span>
                      {allowed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400"><Check size={11} /> allow</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400"><X size={11} /> deny</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-800">
              UI hides actions you can't perform. Server-side RLS is the source of truth.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPermissionsDebug;
