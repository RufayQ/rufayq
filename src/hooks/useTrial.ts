import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "rufayq_device_id";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export interface TrialStatus {
  loading: boolean;
  hasTrial: boolean;
  isActive: boolean;
  daysLeft: number;
  trialEndsAt: string | null;
}

export function useTrial() {
  const [status, setStatus] = useState<TrialStatus>({
    loading: true, hasTrial: false, isActive: false, daysLeft: 0, trialEndsAt: null,
  });

  const refresh = useCallback(async () => {
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("user_trials")
      .select("trial_ends_at")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!data) {
      setStatus({ loading: false, hasTrial: false, isActive: false, daysLeft: 0, trialEndsAt: null });
      return;
    }
    const endsAt = new Date(data.trial_ends_at);
    const ms = endsAt.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    setStatus({
      loading: false, hasTrial: true, isActive: ms > 0, daysLeft: days,
      trialEndsAt: data.trial_ends_at,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startTrial = useCallback(async () => {
    const deviceId = getDeviceId();
    const { error } = await supabase
      .from("user_trials")
      .insert({ device_id: deviceId, plan: "trial" });
    if (!error) await refresh();
    return !error;
  }, [refresh]);

  return { ...status, startTrial, refresh };
}
