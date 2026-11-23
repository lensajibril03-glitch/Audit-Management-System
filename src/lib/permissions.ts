import { AppRole, ROLES } from "@/lib/roles";

export type Permission =
  | "dashboard.view"
  | "reports.view"
  | "reports.create"
  | "reports.edit"
  | "reports.export"
  | "recommendations.assign"
  | "followup.view.all"
  | "followup.view.assigned"
  | "followup.submit"
  | "followup.export"
  | "justification.submit"
  | "recommendations.close"
  | "recommendations.reopen"
  | "department.view"
  | "archive.view"
  | "archive.manage"
  | "archive.export"
  | "admin.users.manage"
  | "admin.roles.manage"
  | "admin.reference.manage"
  | "notifications.manage";

const rolePermissions: Record<AppRole, Permission[]> = {
  [ROLES.AUDIT]: [
    "dashboard.view",
    "reports.view",
    "reports.export",
    "followup.view.assigned",
    "followup.submit",
    "justification.submit",
    "archive.view",
  ],
  [ROLES.AUDIT_ANALYST]: [
    "dashboard.view",
    "reports.view",
    "reports.create",
    "reports.edit",
    "reports.export",
    "recommendations.assign",
    "followup.view.all",
    "followup.export",
    "recommendations.close",
    "archive.view",
    "archive.manage",
    "archive.export",
  ],
  [ROLES.AUDIT_SUPERVISOR]: [
    "dashboard.view",
    "reports.view",
    "reports.export",
    "followup.view.all",
    "followup.export",
    "recommendations.reopen",
    "archive.view",
    "archive.manage",
    "archive.export",
  ],
  [ROLES.DEPARTMENT_HEAD]: [
    "dashboard.view",
    "reports.view",
    "reports.export",
    "department.view",
    "archive.view",
    "archive.export",
  ],
  [ROLES.SYSTEM_ADMIN]: [
    "admin.users.manage",
    "admin.roles.manage",
    "admin.reference.manage",
    "notifications.manage",
  ],
};

export function buildPermissionSet(roles: string[]): Set<Permission> {
  const all = new Set<Permission>();
  for (const role of roles) {
    const mapped = rolePermissions[role as AppRole] || [];
    mapped.forEach((p) => all.add(p));
  }
  return all;
}

export function hasPermission(roles: string[], permission: Permission): boolean {
  return buildPermissionSet(roles).has(permission);
}
