/**
 * Realtime channel registry.
 *
 * Single source of truth for every Supabase realtime subscription used across
 * the admin portal, the patient web app, and (later) the native mobile shells.
 * Adding a new channel here ensures all clients use the same name and event
 * filter — no drift between platforms.
 *
 * Keep entries `as const` so the literal types are preserved for consumers.
 */

export const REALTIME_CHANNELS = {
  paymentsPending: {
    name: "payments:pending",
    table: "payment_receipts",
    event: "*",
    filter: "status=eq.pending",
  },
  ticketsOpen: {
    name: "tickets:open",
    table: "support_tickets",
    event: "*",
    filter: "status=eq.open",
  },
  providerApplicationsPending: {
    name: "provider_applications:pending",
    table: "provider_applications",
    event: "*",
    filter: "status=eq.pending",
  },
  patientClaimsPending: {
    name: "patient_claims:pending",
    table: "patient_claims",
    event: "*",
    filter: "status=eq.pending_admin",
  },
  cmsPagesPublished: {
    name: "cms_pages:published",
    table: "cms_pages",
    event: "UPDATE",
    filter: "status=eq.published",
  },
} as const;

export type RealtimeChannelKey = keyof typeof REALTIME_CHANNELS;
export type RealtimeChannelDef = (typeof REALTIME_CHANNELS)[RealtimeChannelKey];

export const listRealtimeChannels = (): RealtimeChannelDef[] =>
  Object.values(REALTIME_CHANNELS);
