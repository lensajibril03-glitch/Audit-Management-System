import { hasPermission } from "@/lib/permissions";

type CloseCheckInput = {
  roles: string[];
  justificationCount: number;
};

export function canCloseRecommendation(input: CloseCheckInput): { ok: boolean; reason?: string } {
  if (!hasPermission(input.roles, "recommendations.close")) {
    return { ok: false, reason: "User does not have permission to close recommendations." };
  }

  if (input.justificationCount < 1) {
    return { ok: false, reason: "Cannot close recommendation without at least one justification." };
  }

  return { ok: true };
}

type ReopenCheckInput = {
  roles: string[];
  reason?: string;
};

export function canReopenRecord(input: ReopenCheckInput): { ok: boolean; reason?: string } {
  if (!hasPermission(input.roles, "recommendations.reopen")) {
    return { ok: false, reason: "User does not have permission to reopen records." };
  }

  if (!input.reason || input.reason.trim().length < 3) {
    return { ok: false, reason: "Reopen reason is required." };
  }

  return { ok: true };
}
