/**
 * Reads appointments scheduled by a provider for the current device.
 *
 * The patient app never writes to `provider_appointments` — that's a
 * provider-portal table. We only read through the existing
 * "Patient reads own appointments" RLS policy which matches on the
 * `x-device-id` request header (already injected by our supabase client).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface ProviderAppointmentRow {
  id: string;
  organization_id: string;
  patient_device_id: string;
  author_id: string | null;
  title: string;
  location: string | null;
  scheduled_at: string;
  notes: string | null;
  status: string;
  appointment_type: "physician" | "lab" | "radiology" | null;
  visit_type: "in-person" | "telemedicine" | "clinic" | null;
  created_at: string;
}

export interface UseProviderAppointmentsResult {
  appointments: ProviderAppointmentRow[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProviderAppointments(deviceId?: string): UseProviderAppointmentsResult {
  const [appointments, setAppointments] = useState<ProviderAppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const id = deviceId || getDeviceId();
    if (!id) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from("provider_appointments")
        .select("*")
        .eq("patient_device_id", id)
        .order("scheduled_at", { ascending: true });
      if (err) throw err;
      setAppointments((data as ProviderAppointmentRow[]) || []);
      setError(null);
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { appointments, loading, error, refresh };
}
