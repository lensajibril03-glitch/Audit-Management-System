export const ROLES = {
  AUDIT: "Audit",
  AUDIT_ANALYST: "Audit Analyst",
  AUDIT_SUPERVISOR: "Audit Supervisor",
  DEPARTMENT_HEAD: "Department Head",
  SYSTEM_ADMIN: "System Admin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: AppRole[] = [
  ROLES.AUDIT,
  ROLES.AUDIT_ANALYST,
  ROLES.AUDIT_SUPERVISOR,
  ROLES.DEPARTMENT_HEAD,
  ROLES.SYSTEM_ADMIN,
];
