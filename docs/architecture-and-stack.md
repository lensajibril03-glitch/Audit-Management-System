# Architecture and Technology Stack

## Selected Stack

- Frontend framework: Next.js 16 (App Router) with TypeScript and Tailwind CSS.
- Backend/API framework: NestJS 12 REST API with modular controllers/services.
- Database: SQLite for local development with Prisma ORM, designed to switch to PostgreSQL in production with minimal schema change.
- Authentication: Email/password login using bcrypt password hashing and signed JWT session cookie (HTTP-only).
- Authorization: Role-based permission checks in backend route handlers plus scoped data filtering by ownership and department.
- File storage: Configurable local file-path metadata in database for now; production-ready abstraction can point to object storage.
- Notification approach: Configurable channel settings and notification log table, with background scheduler extension point.
- Hosting/deployment: Container or VM deployment for Next.js app + NestJS API + managed PostgreSQL + managed object storage + secrets manager.

## Architecture Layers

- Frontend UI: App-shell layout, responsive pages, forms, tables, dashboard cards.
- Backend API: NestJS modules under backend/src with auth + RBAC.
- Business logic: Access scope, permission checks, validation with Zod, closure guard rules.
- Database access: Prisma client and transaction blocks for multi-entity writes.
- Authentication/authorization: Session cookie + server-side permission matrix.
- Notification service: Notification settings + logs (event persistence now, delivery worker next phase).
- Document handling: Document metadata model and document module.
- Audit logging: Dedicated AuditLog records for sensitive state changes.

## Security Notes

- APIs enforce permissions server-side.
- Department scope is applied in backend query filters.
- Session token is HTTP-only cookie.
- Passwords are hashed with bcrypt.
- Sensitive write actions produce audit trail entries.
