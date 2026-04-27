/**
 * usePatientClaims — live list of claim requests for the current device.
 *
 * Used by the patient web app (and reused by the future mobile shells) to
 * surface incoming hospital/insurer access requests in real time. Subscribes
 * to every `patient_claims` row that matches the device, regardless of status,
 * so approvals, rejections, and admin moves all appear instantly.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

export interface PatientClaim {
  id: string;
  organization_id: string;
  org_name?: string | null;
  search_type: string;
  search_value: string;
  status: string;
  reason: string | null;
  created_at: string;
  admin_decision_at: string | null;
}

export const usePatientClaims = () => {
  const deviceId = getDeviceId();
  const [claims, setClaims] = useState<PatientClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_claims")
      .select("id, organization_id, search_type, search_value, status, reason, created_at, admin_decision_at, organizations:organization_id(name)")
      .eq("matched_device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) {
      setClaims((data ?? []).map((c: { organizations?: { name?: string | null } | null } & Record<string, unknown>) => ({
        ...(c as unknown as PatientClaim),
        org_name: c.organizations?.name ?? null,
      })));
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
    if (!deviceId) return;
    const channel = supabase
      .channel(`pc-list:${deviceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_claims", filter: `matched_device_id=eq.${deviceId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, load]);

  return { claims, loading, reload: load };
};
