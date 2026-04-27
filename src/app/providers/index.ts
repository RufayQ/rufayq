/**
 * app/providers — barrel pointing at the existing AppShell which already
 * composes QueryClient + Tooltip + Toaster + Language + Currency providers.
 * Kept here so future Phase-3 work can lift the providers out of AppShell
 * without touching callers.
 */
export { default as AppProviders } from "@/AppShell";
