/**
 * Public API barrel — the only entry point mobile apps and external consumers
 * should import from. Internals (supabase client, edge functions, RLS shape)
 * are deliberately not re-exported.
 */

// Contracts
export * from "./contracts/subscriptions";
export * from "./contracts/payments";
export * from "./contracts/cms";
export * from "./contracts/tickets";
export * from "./contracts/reviews";
export * from "./contracts/rcm";
export * from "./contracts/auth";

// Clients
export { subscriptionsClient, type ApiResult } from "./clients/subscriptions.client";
export {
  paymentsClient,
  type SubscriptionRow,
  type AddonRow,
} from "./clients/payments.client";
export { cmsClient } from "./clients/cms.client";
export { ticketsClient } from "./clients/tickets.client";
export { reviewsClient } from "./clients/reviews.client";
export { rcmClient } from "./clients/rcm.client";
export { authClient } from "./clients/auth.client";

// Realtime
export * from "./realtime/channels";
export { useRealtimeChannel, type RealtimePayload } from "./realtime/useRealtimeChannel";
