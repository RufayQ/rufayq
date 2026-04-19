// Injects x-device-id header on all Supabase REST/Storage/Functions requests
// so RLS policies that key on the device-id header continue to work.
// Imported once from main.tsx.
import { getDeviceId } from "@/hooks/useDeviceId";

const SUPA_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");

if (typeof window !== "undefined" && SUPA_URL) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith(SUPA_URL)) {
        const deviceId = getDeviceId();
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("x-device-id")) headers.set("x-device-id", deviceId);
        return originalFetch(input, { ...init, headers });
      }
    } catch {
      // fall through
    }
    return originalFetch(input, init);
  };
}
