# Setup, Migration, and Run Guide

This guide explains how to move the app to another machine/environment and run it safely.

## 1. Prerequisites on the target machine

- Node.js 20+
- npm 10+
- Git (if pulling from repository)
- Open ports:
  - Frontend: 3000
  - Backend API: 4000

## 2. Copy application code

1. Copy the full project directory to the target machine.
2. Confirm the copied tree includes at least:
   - package.json (frontend/root)
   - backend/package.json (Nest API)
   - prisma/schema.prisma
   - prisma/migrations (if present)
   - prisma/seed.js

## 3. Install dependencies (both projects)

From project root:

1. npm install
2. npm --prefix backend install

## 4. Configure environment variables

Create these environment files on the target machine.

### 4.1 Root .env (Next.js app)

Required keys:

- DATABASE_URL
- AUTH_SECRET
- NEXT_PUBLIC_BACKEND_API_BASE_URL

Example for local-style target setup:

DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_BACKEND_API_BASE_URL="http://localhost:4000/api"

### 4.2 backend/.env (Nest API)

Required keys:

- DATABASE_URL
- AUTH_SECRET
- FRONTEND_ORIGIN
- PORT (optional, defaults to 4000)

Example:

DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-the-same-secret-used-in-root-env"
FRONTEND_ORIGIN="http://localhost:3000"
PORT=4000

Important:

- AUTH_SECRET should be identical in both root .env and backend/.env.
- NEXT_PUBLIC_BACKEND_API_BASE_URL should point to the backend API base path, including /api.

## 5. Move or initialize data

Choose one approach.

### Option A: Move existing data (recommended for migration)

If your current deployment uses SQLite, copy the SQLite database file to the target environment before starting services.

Then run:

1. npm run db:generate

### Option B: Fresh environment (empty database)

Initialize schema and seed demo/reference data:

1. npm run db:migrate -- --name init
2. npm run db:seed

## 6. Validate code before startup

From project root:

1. npm run lint
2. npm run test
3. npm run build
4. npm run build:backend

## 7. Start services

### Development-style run

From project root:

- npm run dev:all

Or in separate terminals:

- Terminal 1: npm run dev
- Terminal 2: npm run dev:backend

### Production-style run

1. Build both apps:
   - npm run build
   - npm run build:backend
2. Start backend:
   - npm --prefix backend run start:prod
3. Start frontend:
   - npm run start

## 8. Smoke test checklist

After startup, verify:

1. Frontend opens at http://localhost:3000
2. Backend responds at http://localhost:4000/api (a 404 on root route is acceptable)
3. Login works from /login
4. Dashboard loads after login
5. Reports list and Follow-up list load
6. Archive page loads
7. Admin pages load for admin account

## 9. Reverse proxy and cookie behavior (important)

The app uses an HTTP-only session cookie named audit_session. For reliable auth in non-local environments:

1. Prefer one public domain for frontend and backend.
2. Route /api to Nest backend and everything else to Next.js.
3. Keep FRONTEND_ORIGIN aligned with the frontend URL.
4. Use HTTPS in production.

If frontend and backend are on unrelated domains, browser cookie and middleware behavior can fail.

## 10. Demo login users (seeded environments)

- analyst@bgi-audit.local / Password123!
- audit.user@bgi-audit.local / Password123!
- supervisor@bgi-audit.local / Password123!
- dept.head@bgi-audit.local / Password123!
- admin@bgi-audit.local / Password123!

## 11. PostgreSQL migration note

Current schema is configured with SQLite provider in prisma/schema.prisma.

To run on PostgreSQL, update datasource provider and create/apply PostgreSQL migrations before cutover. Do not switch DATABASE_URL to PostgreSQL without a provider/migration update.
