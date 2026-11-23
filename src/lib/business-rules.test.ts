import { describe, expect, it } from "vitest";
import { canCloseRecommendation, canReopenRecord } from "@/lib/business-rules";

describe("business rules", () => {
  it("rejects close when justification is missing", () => {
    const result = canCloseRecommendation({
      roles: ["Audit Analyst"],
      justificationCount: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("justification");
  });

  it("allows close for analyst with justification", () => {
    const result = canCloseRecommendation({
      roles: ["Audit Analyst"],
      justificationCount: 1,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects reopen without supervisor permission", () => {
    const result = canReopenRecord({
      roles: ["Audit"],
      reason: "Need correction",
    });

    expect(result.ok).toBe(false);
  });

  it("requires reopen reason", () => {
    const result = canReopenRecord({
      roles: ["Audit Supervisor"],
      reason: "",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("required");
  });
});
