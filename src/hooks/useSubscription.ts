/**
 * useSubscription — reads the active user_subscriptions row for the current
 * device. Self-contained so it can be removed without touching other modules.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface Subscription {
  id: string;
  /** Stored as TEXT in the DB. Spec values: FREE | STARTER | COMPANION | FAMILY.
   *  Older rows may still hold lowercase basic/pro/companion etc. — UI normalises. */
  plan: string;
  status: "active" | "pending_receipt" | "expired" | "cancelled" | "rejected";
  billing_cycle: "monthly" | "quarterly" | "yearly";
  current_period_end: string | null;
  amount: number | null;
  currency: string;
}

interface State {
  loading: boolean;
  subscription: Subscription | null;
  pendingReceipt: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<State>({
    loading: true,
    subscription: null,
    pendingReceipt: false,
  });

  const refresh = useCallback(async () => {
    const deviceId = getDeviceId();
    // Active subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("id, plan, status, billing_cycle, current_period_end, amount, currency")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Pending receipt awaiting admin verification
    const { count } = await supabase
      .from("payment_receipts")
      .select("id", { count: "exact", head: true })
      .eq("device_id", deviceId)
      .eq("status", "pending");

    setState({
      loading: false,
      subscription: (sub as Subscription) || null,
      pendingReceipt: (count ?? 0) > 0,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
}
