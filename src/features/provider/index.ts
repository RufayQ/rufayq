/**
 * features/provider — public API barrel for the enterprise/provider portal.
 */
export { default as ProviderDashboard } from "@/pages/ProviderDashboard";
export { default as ProviderLogin } from "@/pages/ProviderLogin";
export { default as PatientSearch } from "@/components/provider/PatientSearch";
export { default as ProviderFeedCard } from "@/components/ProviderFeedCard";
export { useProviderFeed } from "@/hooks/useProviderFeed";
