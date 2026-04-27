import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Lightweight badge counters for the admin sidebar. Polls every 60s. */
export interface AdminBadges {
  open_tickets: number;
  pending_receipts: number;
  pending_apps: number;
  pending_claims: number;
}

const ZERO: AdminBadges = { open_tickets: 0, pending_receipts: 0, pending_apps: 0, pending_claims: 0 };

export const useAdminBadges = (enabled: boolean): AdminBadges => {
  const [badges, setBadges] = useState<AdminBadges>(ZERO);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      const safeCount = async (table: string, build: (q: any) => any) => {
        try {
          const { count } = await build((supabase as any).from(table).select("id", { count: "exact", head: true }));
          return count ?? 0;
        } catch { return 0; }
      };
      const [tickets, receipts, apps, claims] = await Promise.all([
        safeCount("support_tickets",      (q) => q.in("status", ["open", "in_progress"])),
        safeCount("payment_receipts",     (q) => q.eq("status", "pending")),
        safeCount("provider_applications", (q) => q.eq("status", "pending")),
        safeCount("patient_claims",       (q) => q.in("status", ["pending_admin", "pending_patient"])),
      ]);
      if (alive) setBadges({ open_tickets: tickets, pending_receipts: receipts, pending_apps: apps, pending_claims: claims });
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [enabled]);

  return badges;
};
