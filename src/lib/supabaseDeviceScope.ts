import { supabase } from "@/integrations/supabase/client";

/** Attach the persisted guest device id to one-off backend requests that rely on device-scoped RLS. */
export const withDeviceHeader = <T>(builder: T, deviceId: string): T => {
  if (!deviceId) return builder;
  const maybe = builder as T & { setHeader?: (name: string, value: string) => T };
  return typeof maybe.setHeader === "function" ? maybe.setHeader("x-device-id", deviceId) : builder;
};

/** Storage bucket helper with the same device header used by attachment file policies. */
export const storageWithDeviceHeader = (bucket: string, deviceId: string) =>
  withDeviceHeader(supabase.storage.from(bucket), deviceId);