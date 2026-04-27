/**
 * features/patient — public API barrel for patient-facing screens & hooks.
 */
export { default as HomeScreen } from "@/screens/HomeScreen";
export { default as HomeScreenEmpty } from "@/screens/HomeScreenEmpty";
export { default as JourneyScreen } from "@/screens/JourneyScreen";
export { default as ChatScreen } from "@/screens/ChatScreen";
export { default as MedicationsScreen } from "@/screens/MedicationsScreen";
export { default as RecordsScreen } from "@/screens/RecordsScreen";
export { default as CareHubScreen } from "@/screens/CareHubScreen";
export { default as ProfileScreen } from "@/screens/ProfileScreen";
export { default as SettingsScreen } from "@/screens/SettingsScreen";
export { default as SupportScreen } from "@/screens/SupportScreen";
export { default as PricingScreen } from "@/screens/PricingScreen";
export { default as OnboardingScreen } from "@/screens/OnboardingScreen";
export { default as LoginScreen } from "@/screens/LoginScreen";
export { default as ScannerWizard } from "@/screens/ScannerWizard";

// Patient hooks
export { usePatientNotifications } from "@/hooks/usePatientNotifications";
export { useGuestCategories } from "@/hooks/useGuestCategories";
export { useGuestCredits } from "@/hooks/useGuestCredits";
export { useGuestMode } from "@/hooks/useGuestMode";
export { useTourSystem } from "@/hooks/useTourSystem";
export { useFreshStart } from "@/hooks/useFreshStart";
