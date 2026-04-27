/**
 * Public API barrel — the only entry point mobile apps and external consumers
 * should import from. Internals (supabase client, edge functions, RLS shape)
 * are deliberately not re-exported.
 */

// Contracts
export * from "./contracts/subscriptions";

// Clients
export { subscriptionsClient, type ApiResult } from "./clients/subscriptions.client";

// Realtime
export * from "./realtime/channels";
