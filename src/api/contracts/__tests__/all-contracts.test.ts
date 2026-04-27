import { describe, it, expect } from "vitest";
import {
  PaymentReceiptSchema, ReceiptUploadSchema, KNOWN_PAYMENT_STATUSES,
} from "@/api/contracts/payments";
import { CmsPageSchema, PublishRequestSchema } from "@/api/contracts/cms";
import { SupportTicketSchema, TicketStatusSchema } from "@/api/contracts/tickets";
import { AppReviewSchema } from "@/api/contracts/reviews";
import { AppRoleSchema, CurrentAuthSchema } from "@/api/contracts/auth";

describe("API contracts", () => {
  it("payment receipt round-trip", () => {
    expect(PaymentReceiptSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      device_id: "dev-1", subscription_id: null,
      requested_plan: "STARTER", billing_cycle: "monthly",
      amount: 49, currency: "SAR", payment_method: "bank_transfer",
      reference_no: null, receipt_file_path: null,
      payer_name: null, payer_phone: null, payment_reference: "RFQ-1",
      submission_channel: "web", bank_name: null, transfer_date: null,
      patient_message: null, internal_note: null,
      status: "pending", reviewer_notes: null, reviewed_at: null,
      created_at: "2026-04-27T00:00:00Z",
    }).success).toBe(true);
  });

  it("payment receipt rejects negative amounts on upload", () => {
    expect(ReceiptUploadSchema.safeParse({
      device_id: "d", requested_plan: "STARTER", billing_cycle: "monthly",
      amount: -1, currency: "SAR", payment_method: "bank_transfer",
      receipt_file_path: null, payer_name: null, payer_phone: null,
      bank_name: null, transfer_date: null, reference_no: null, patient_message: null,
    }).success).toBe(false);
  });

  it("known payment statuses include verified + rejected", () => {
    expect(KNOWN_PAYMENT_STATUSES).toContain("verified");
    expect(KNOWN_PAYMENT_STATUSES).toContain("rejected");
  });

  it("cms page accepts published status", () => {
    expect(CmsPageSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "home", title_en: "Home", title_ar: null,
      status: "published", scheduled_at: null,
      seo_title_en: null, seo_title_ar: null, seo_desc_en: null, seo_desc_ar: null,
      og_image_url: null, canonical_url: null,
      index_in_search: true, include_sitemap: true, is_system: true,
      updated_at: "2026-04-27T00:00:00Z",
    }).success).toBe(true);
  });

  it("publish request rejects unknown status", () => {
    expect(PublishRequestSchema.safeParse({ status: "yolo" }).success).toBe(false);
  });

  it("ticket status enum is closed-set", () => {
    expect(TicketStatusSchema.safeParse("open").success).toBe(true);
    expect(TicketStatusSchema.safeParse("burning").success).toBe(false);
  });

  it("support ticket round-trip", () => {
    expect(SupportTicketSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      ticket_number: "TKT-00001", title: "t", description: "d",
      category: "billing", priority: "normal", status: "open",
      user_email: null, user_name: null, device_id: null,
      resolution_notes: null,
      created_at: "2026-04-27T00:00:00Z",
      updated_at: "2026-04-27T00:00:00Z",
    }).success).toBe(true);
  });

  it("review rejects ratings outside 1..5", () => {
    const base = {
      id: "11111111-1111-1111-1111-111111111111",
      reviewer_name: null, reviewer_country: null, notes: null, advice: null,
      approved: false, device_id: null, created_at: "2026-04-27T00:00:00Z",
    };
    expect(AppReviewSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(AppReviewSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(AppReviewSchema.safeParse({ ...base, rating: 5 }).success).toBe(true);
  });

  it("auth contract round-trip", () => {
    expect(AppRoleSchema.safeParse("admin").success).toBe(true);
    expect(AppRoleSchema.safeParse("god").success).toBe(false);
    expect(CurrentAuthSchema.safeParse({ user: null, roles: [] }).success).toBe(true);
  });
});
