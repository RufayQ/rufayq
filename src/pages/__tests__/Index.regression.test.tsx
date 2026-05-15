/**
 * Regression tests for src/pages/Index.tsx — patient-shell entry/exit URL
 * hygiene and explicit logout. Locks in the fix for pull-to-refresh bouncing
 * back to Login and the unsafe-returnTo loophole.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------- shared mocks ----------
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const getSessionMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      signOut: (...a: unknown[]) => signOutMock(...a),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

// Hooks — keep them inert so Index can mount in jsdom.
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/useFreshStart", () => ({
  useFreshStart: () => ({ isFresh: false, tourPending: false, markTourDone: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/hooks/useGuestMode", () => ({ useGuestMode: () => false }));
vi.mock("@/hooks/useTourSystem", () => ({
  useTourSystem: () => ({ activeTour: null, allowSkip: true, finishActive: vi.fn() }),
}));
vi.mock("@/hooks/usePatientBootstrap", () => ({ usePatientBootstrap: () => {} }));

// Native + push + biometric — never run in tests.
vi.mock("@/lib/native/deepLinks", () => ({ onDeepLink: () => Promise.resolve(() => {}) }));
vi.mock("@/lib/native/push", () => ({ registerPush: () => Promise.resolve() }));
vi.mock("@/lib/native/biometric", () => ({ biometric: { clear: vi.fn().mockResolvedValue(undefined) } }));

// Role validation — default to patient_ok unless a test overrides.
const validateLoginRoleMock = vi.fn().mockResolvedValue({ kind: "patient_ok" });
vi.mock("@/lib/roleValidation", () => ({
  validateLoginRole: (...a: unknown[]) => validateLoginRoleMock(...a),
}));

// Lightweight screen stubs that surface what we need to assert on.
vi.mock("@/components/StatusBar", () => ({ default: () => <div data-testid="status-bar" /> }));
vi.mock("@/components/BottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("@/components/TrialLockBanner", () => ({ default: () => null }));
vi.mock("@/components/TourGuide", () => ({ default: () => null }));
vi.mock("@/components/TourRunner", () => ({ default: () => null }));
vi.mock("@/screens/HomeScreen", () => ({
  default: ({ onProfile }: { onProfile: () => void }) => (
    <div data-testid="home-screen">
      <button onClick={onProfile}>open-profile</button>
    </div>
  ),
}));
vi.mock("@/screens/JourneyScreen", () => ({ default: () => <div data-testid="journey-screen" /> }));
vi.mock("@/screens/RecordsScreen", () => ({ default: () => <div data-testid="records-screen" /> }));
vi.mock("@/screens/ChatScreen", () => ({ default: () => <div data-testid="chat-screen" /> }));
vi.mock("@/features/carehub", () => ({ CareHubScreen: () => <div data-testid="carehub-screen" /> }));
vi.mock("@/screens/MedicationsScreen", () => ({ default: () => <div data-testid="meds-screen" /> }));
vi.mock("@/screens/PricingScreen", () => ({ default: () => <div data-testid="pricing-screen" /> }));
vi.mock("@/screens/ProfileScreen", () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="profile-screen">
      <button onClick={onLogout}>logout</button>
    </div>
  ),
}));
vi.mock("@/screens/OnboardingScreen", () => ({ default: () => <div data-testid="onboarding-screen" /> }));
vi.mock("@/screens/LoginScreen", () => ({
  default: ({ onLogin }: { onLogin: () => void }) => (
    <div data-testid="login-screen">
      <button onClick={onLogin}>do-login</button>
    </div>
  ),
}));
vi.mock("@/screens/ScannerWizard", () => ({ default: () => null }));
vi.mock("@/screens/SettingsScreen", () => ({ default: () => <div data-testid="settings-screen" /> }));
vi.mock("@/screens/SupportScreen", () => ({ default: () => <div data-testid="support-screen" /> }));
vi.mock("@/features/emr", () => ({ EmrScreen: () => <div data-testid="emr-screen" /> }));
vi.mock("@/screens/RoleSelectorScreen", () => ({
  default: () => <div data-testid="role-screen" />,
  getStoredRole: () => "patient",
  clearStoredRole: vi.fn(),
  ROLE_PREF_KEY: "rufayq_role",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Import AFTER mocks.
import Index from "@/pages/Index";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Index />
    </MemoryRouter>,
  );

const fakeSession = (uid = "u1") => ({
  data: { session: { user: { id: uid } } },
  error: null,
});
const noSession = () => ({ data: { session: null }, error: null });

beforeEach(() => {
  navigateMock.mockClear();
  signOutMock.mockClear();
  getSessionMock.mockReset();
  validateLoginRoleMock.mockClear();
  validateLoginRoleMock.mockResolvedValue({ kind: "patient_ok" });
  localStorage.clear();
  localStorage.setItem("rufayq_onboarded", "true");
  localStorage.setItem("rufayq_role", JSON.stringify({ v: 1, role: "patient" }));
});

describe("Index — patient-shell entry hygiene", () => {
  it("valid session + /app?signin=1 enters main app and cleans the URL", async () => {
    getSessionMock.mockResolvedValue(fakeSession());
    renderAt("/app?signin=1");

    await waitFor(() => expect(screen.getByTestId("home-screen")).toBeInTheDocument());
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app", { replace: true }),
    );
  });

  it("guest flag + /app?signin=1 enters main app and cleans the URL", async () => {
    localStorage.setItem("rufayq_guest_ok", "1");
    getSessionMock.mockResolvedValue(noSession());
    renderAt("/app?signin=1");

    await waitFor(() => expect(screen.getByTestId("home-screen")).toBeInTheDocument());
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app", { replace: true }),
    );
  });

  it("honors a safe returnTo=/app/wallet", async () => {
    getSessionMock.mockResolvedValue(fakeSession());
    renderAt("/app?signin=1&returnTo=%2Fapp%2Fwallet");

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app/wallet", { replace: true }),
    );
    expect(navigateMock).not.toHaveBeenCalledWith("/app", { replace: true });
  });

  it("ignores unsafe returnTo=//evil.com and falls back to /app", async () => {
    getSessionMock.mockResolvedValue(fakeSession());
    renderAt("/app?signin=1&returnTo=%2F%2Fevil.com");

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app", { replace: true }),
    );
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringContaining("evil.com"),
      expect.anything(),
    );
  });

  it("ignores unsafe returnTo=/application (prefix-match guard)", async () => {
    getSessionMock.mockResolvedValue(fakeSession());
    renderAt("/app?signin=1&returnTo=%2Fapplication");

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app", { replace: true }),
    );
    expect(navigateMock).not.toHaveBeenCalledWith("/application", expect.anything());
  });
});

describe("Index — explicit logout", () => {
  it("calls supabase.auth.signOut() and clears the guest flag", async () => {
    localStorage.setItem("rufayq_guest_ok", "1");
    getSessionMock.mockResolvedValue(fakeSession());
    renderAt("/app");

    await waitFor(() => expect(screen.getByTestId("home-screen")).toBeInTheDocument());
    fireEvent.click(screen.getByText("open-profile"));
    await waitFor(() => expect(screen.getByTestId("profile-screen")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("logout"));
    });

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(localStorage.getItem("rufayq_guest_ok")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument());
  });
});
