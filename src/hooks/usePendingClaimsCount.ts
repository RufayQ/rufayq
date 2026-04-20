import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

/**
 * Counts patient_claims in `pending_patient` status for the current device's
 * device_id (matched by the admin during the claim flow). Subscribes to realtime
 * updates so badges decrement instantly when the patient approves/rejects.
 */
export const usePendingClaimsCount = () => {
  const [count, setCount] = useState(0);
  const deviceId = getDeviceId();

  const load = useCallback(async () => {
    const { count: c } = await supabase
      .from("patient_claims")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_patient")
      .eq("matched_device_id", deviceId);
    setCount(c ?? 0);
  }, [deviceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`pc:${deviceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_claims", filter: `matched_device_id=eq.${deviceId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, load]);

  return { count, reload: load };
};
