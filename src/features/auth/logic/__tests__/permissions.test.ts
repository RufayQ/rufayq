import { describe, it, expect } from "vitest";
import { can, canAny } from "../permissions";

describe("permissions matrix", () => {
  it("admin can do everything checked", () => {
    expect(can("admin", "subscription.modify")).toBe(true);
    expect(can("admin", "payment.verify")).toBe(true);
    expect(can("admin", "user.assign_role")).toBe(true);
    expect(can("admin", "cms.publish")).toBe(true);
    expect(can("admin", "audit.view")).toBe(true);
  });

  it("moderator is read-mostly", () => {
    expect(can("moderator", "subscription.view")).toBe(true);
    expect(can("moderator", "subscription.modify")).toBe(false);
    expect(can("moderator", "payment.verify")).toBe(false);
    expect(can("moderator", "cms.edit")).toBe(true);
    expect(can("moderator", "cms.publish")).toBe(false);
    expect(can("moderator", "user.assign_role")).toBe(false);
  });

  it("provider roles only see RCM", () => {
    expect(can("provider_admin", "rcm.modify")).toBe(true);
    expect(can("provider_admin", "subscription.view")).toBe(false);
    expect(can("provider_staff", "rcm.view")).toBe(true);
    expect(can("provider_staff", "rcm.modify")).toBe(false);
  });

  it("plain user has no admin actions", () => {
    expect(can("user", "subscription.view")).toBe(false);
    expect(can("user", "audit.view")).toBe(false);
  });

  it("nullish role denies everything", () => {
    expect(can(null, "subscription.view")).toBe(false);
    expect(can(undefined, "audit.view")).toBe(false);
  });

  it("canAny is true if any role has the action", () => {
    expect(canAny(["user", "moderator"], "cms.edit")).toBe(true);
    expect(canAny(["user", "provider_staff"], "cms.publish")).toBe(false);
    expect(canAny(null, "cms.edit")).toBe(false);
    expect(canAny([], "cms.edit")).toBe(false);
  });
});
