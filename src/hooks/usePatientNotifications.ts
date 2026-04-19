import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";
import { toast } from "sonner";

export interface PatientNotification {
  id: string;
  kind: string;
  title: string;
  title_ar: string | null;
  body: string | null;
  body_ar: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  organization_id: string | null;
}

export const usePatientNotifications = () => {
  const [items, setItems] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("patient_notifications")
      .select("*")
      .eq("patient_device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as PatientNotification[]) || []);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`pn:${deviceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_notifications", filter: `patient_device_id=eq.${deviceId}` },
        (payload) => {
          const n = payload.new as PatientNotification;
          setItems(prev => [n, ...prev]);
          toast.success(n.title, { description: n.title_ar || n.body || undefined, duration: 5000 });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, load]);

  const markRead = async (id: string) => {
    await supabase.from("patient_notifications").update({ is_read: true }).eq("id", id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from("patient_notifications").update({ is_read: true }).eq("patient_device_id", deviceId).eq("is_read", false);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return { items, loading, unreadCount: items.filter(n => !n.is_read).length, markRead, markAllRead, reload: load };
};
