/**
 * useSubscription — reads the active user_subscriptions row for the current
 * device through the typed `subscriptionsClient` (see `@/api`).
 *
 * Self-contained so it can be removed without touching other modules.
 */
import { useEffect, useState, useCallback } from "react";
import { subscriptionsClient } from "@/api/clients/subscriptions.client";
import type { SubscriptionSummary } from "@/api/contracts/subscriptions";

export type Subscription = SubscriptionSummary;

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
    const [sub, pending] = await Promise.all([
      subscriptionsClient.getCurrent(),
      subscriptionsClient.hasPendingReceipt(),
    ]);
    setState({
      loading: false,
      subscription: sub.data ?? null,
      pendingReceipt: pending.data ?? false,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
}

