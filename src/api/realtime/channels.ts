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
  /** Any change on any support ticket — used to keep moderator badges/counts
   *  accurate across every status (open, in_progress, resolved, closed). */
  ticketsAny: {
    name: "tickets:any",
    table: "support_tickets",
    event: "*",
    filter: undefined as unknown as string,
  },
  /** Any change on any payment receipt — used by the receipts table so newly
   *  arrived, verified, rejected, and under-review receipts all stream in. */
  paymentsAny: {
    name: "payments:any",
    table: "payment_receipts",
    event: "*",
    filter: undefined as unknown as string,
  },
  /** Any change on any CMS page — used by the editor live preview so draft,
   *  scheduled, and published transitions all re-render instantly. */
  cmsPagesAny: {
    name: "cms_pages:any",
    table: "cms_pages",
    event: "*",
    filter: undefined as unknown as string,
  },
  /** Any change on any CMS section — used by the editor live preview so
   *  inline edits stream into the preview panel as the user types/saves. */
  cmsSectionsAny: {
    name: "cms_sections:any",
    table: "cms_sections",
    event: "*",
    filter: undefined as unknown as string,
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
