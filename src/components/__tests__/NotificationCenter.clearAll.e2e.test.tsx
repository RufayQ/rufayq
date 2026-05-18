/**
 * E2E test — NotificationCenter "Clear all" action.
 *
 * Verifies that pressing the Clear-all trash button:
 *   - Calls supabase delete() scoped to the device id.
 *   - Empties the alert list and zeros the unread badge in the header tabs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

// Force the confirm() prompt to always accept.
beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  localStorage.setItem("rufayq_device_id_v1", "dev-test-123");
});

// In-memory notification store backing the supabase mock.
let store: any[] = [];
const deleteCall = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      channel: () => channel,
      removeChannel: () => {},
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: store, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
        delete: () => ({
          eq: (col: string, val: string) => {
            deleteCall(col, val);
            store = [];
            return Promise.resolve({ error: null });
          },
        }),
      }),
    },
  };
});

vi.mock("@/hooks/useChatInbox", () => ({
  useChatInbox: () => ({
    threads: [],
    unreadByThread: {},
    totalUnread: 0,
    participants: {},
    markAllThreadsRead: vi.fn(),
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ showEn: true, showAr: false, lang: "en", setLang: () => {} }),
}));

vi.mock("@/hooks/useNotificationPrefs", () => ({
  useNotificationPrefs: () => ({
    prefs: { chats: true, appointments: true, meds: true, care: true, billing: true },
    toggle: vi.fn(),
  }),
}));

import NotificationCenter from "@/components/NotificationCenter";

beforeEach(() => {
  store = [
    {
      id: "n1", kind: "medication", title: "Take your pill", title_ar: null,
      body: null, body_ar: null, link: null, is_read: false,
      created_at: new Date().toISOString(), organization_id: null,
    },
    {
      id: "n2", kind: "appointment", title: "Visit tomorrow", title_ar: null,
      body: null, body_ar: null, link: null, is_read: false,
      created_at: new Date().toISOString(), organization_id: null,
    },
  ];
  deleteCall.mockClear();
});

describe("NotificationCenter — Clear all", () => {
  it("clears every notification and resets the unread badge", async () => {
    render(<NotificationCenter open onOpenChange={() => {}} />);

    // Wait for the initial fetch to populate the list.
    await waitFor(() => expect(screen.getByText("Take your pill")).toBeInTheDocument());

    // Two unread alerts → the "All" tab pill shows a "2" badge.
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);

    // Press the trash "Clear all" button.
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(deleteCall).toHaveBeenCalledWith("patient_device_id", expect.any(String));
    });

    // Notifications cleared from the UI.
    await waitFor(() => {
      expect(screen.queryByText("Take your pill")).not.toBeInTheDocument();
    });

    // Unread badges gone.
    expect(screen.queryByText("2")).toBeNull();
  });
});
