import { describe, expect, it } from "vitest";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";

describe("permissions", () => {
  it("grants baseline audit permissions", () => {
    expect(hasPermission(["Audit"], "followup.submit")).toBe(true);
    expect(hasPermission(["Audit"], "reports.create")).toBe(false);
  });

  it("combines permissions across multiple roles", () => {
    const set = buildPermissionSet(["System Admin", "Audit Analyst"]);
    expect(set.has("admin.users.manage")).toBe(true);
    expect(set.has("reports.create")).toBe(true);
    expect(set.has("recommendations.reopen")).toBe(false);
  });

  it("keeps department head scoped abilities", () => {
    expect(hasPermission(["Department Head"], "department.view")).toBe(true);
    expect(hasPermission(["Department Head"], "recommendations.close")).toBe(false);
  });
});
