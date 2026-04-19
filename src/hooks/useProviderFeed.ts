import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

export interface ProviderInstruction {
  id: string;
  title: string;
  body: string;
  body_ar: string | null;
  priority: string;
  created_at: string;
  organization_id: string;
  org_name?: string;
}

export interface ProviderMedUpdate {
  id: string;
  med_name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
  action: string;
  created_at: string;
  organization_id: string;
  org_name?: string;
}

export const useProviderFeed = () => {
  const [instructions, setInstructions] = useState<ProviderInstruction[]>([]);
  const [medUpdates, setMedUpdates] = useState<ProviderMedUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const load = useCallback(async () => {
    const [{ data: ins }, { data: meds }] = await Promise.all([
      supabase.from("provider_instructions").select("*").eq("patient_device_id", deviceId).order("created_at", { ascending: false }).limit(50),
      supabase.from("provider_medication_updates").select("*").eq("patient_device_id", deviceId).order("created_at", { ascending: false }).limit(50),
    ]);

    const orgIds = Array.from(new Set([
      ...((ins || []).map((i: any) => i.organization_id)),
      ...((meds || []).map((m: any) => m.organization_id)),
    ].filter(Boolean)));

    let orgMap: Record<string, string> = {};
    if (orgIds.length) {
      const { data: orgs } = await supabase.from("organizations").select("id,name").in("id", orgIds);
      orgMap = Object.fromEntries((orgs || []).map((o: any) => [o.id, o.name]));
    }

    setInstructions(((ins as any[]) || []).map(i => ({ ...i, org_name: orgMap[i.organization_id] })));
    setMedUpdates(((meds as any[]) || []).map(m => ({ ...m, org_name: orgMap[m.organization_id] })));
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`pf:${deviceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "provider_instructions", filter: `patient_device_id=eq.${deviceId}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "provider_medication_updates", filter: `patient_device_id=eq.${deviceId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, load]);

  return { instructions, medUpdates, loading, reload: load };
};
