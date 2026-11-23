# Role and Permission Matrix

## Baseline principle

Every user has the Audit role as baseline. Additional roles add permissions.

## Matrix

- Audit
  - View own assigned recommendations/follow-up.
  - Submit follow-up updates.
  - Submit justifications.
  - Cannot create reports, assign, close, or reopen by default.

- Audit Analyst
  - Create/edit reports.
  - Create/edit/assign recommendations.
  - View broad follow-up information.
  - Close recommendations only when justification exists.

- Audit Supervisor
  - Reopen previously closed recommendations/reports per workflow.
  - Reopen action must be audit-logged.

- Department Head
  - View recommendations in own department only.
  - Monitor open/overdue status in department scope.

- System Admin
  - Manage users, roles, and reference data.
  - No automatic report/follow-up content permissions unless separately assigned.

## Enforced by backend

Permission checks and data scoping are applied in server route handlers, not just in UI visibility.
