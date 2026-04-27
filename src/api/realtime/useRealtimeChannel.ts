/**
 * useRealtimeChannel — subscribe a component to a registered REALTIME_CHANNELS
 * entry and receive a callback whenever the filtered postgres event fires.
 *
 * Used by both admin and patient screens so naming + filters are guaranteed
 * to match what the registry declares.
 *
 * @example
 *   useRealtimeChannel("paymentsPending", () => refresh());
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  REALTIME_CHANNELS,
  type RealtimeChannelKey,
} from "@/api/realtime/channels";

export type RealtimePayload<T = Record<string, unknown>> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new: T;
  old: T;
};

type Handler<T = Record<string, unknown>> = (payload: RealtimePayload<T>) => void;

/**
 * Subscribe to a channel from the registry. Pass `enabled = false` to pause
 * (e.g. while a route is unauthenticated) without unmounting the component.
 */
export function useRealtimeChannel<T = Record<string, unknown>>(
  key: RealtimeChannelKey,
  handler: Handler<T>,
  enabled: boolean = true,
) {
  // Keep latest handler in a ref so we don't resubscribe on every render.
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const def = REALTIME_CHANNELS[key];
    const filterCfg: Record<string, unknown> = {
      event: def.event === "*" ? "*" : def.event,
      schema: "public",
      table: def.table,
    };
    if (def.filter) filterCfg.filter = def.filter;
    const channel = supabase
      .channel(`rt:${def.name}`)
      .on(
        "postgres_changes" as never,
        filterCfg as never,
        (payload: unknown) => handlerRef.current(payload as RealtimePayload<T>),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key, enabled]);
}
