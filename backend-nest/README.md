# WathiqCare Backend (NestJS)

Production-oriented modular monolith backend for discharge-refusal workflows.

## Local Run (Node)
1. Copy env values:
   - `cp .env.example .env`
2. Install dependencies:
   - `npm ci`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Apply migrations:
   - `npm run prisma:migrate`
5. Seed sample data:
   - `npm run prisma:seed`
6. Start service:
   - `npm run start:dev`

API base URL: `http://localhost:4000/api`
Swagger: `http://localhost:4000/api/docs`

The `.env.example` values target the Docker Compose dependencies published on host ports `5433`, `6380`, and `9002`.

## Local Run (Docker Compose)
From `backend-nest`:
- `docker compose up --build`

This starts:
- Nest API on port `4000`
- PostgreSQL on port `5433`
- Redis on port `6380`
- MinIO object storage on ports `9002` (API) and `9003` (console)

To apply migrations and seed against the running Docker services from the host:
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Tests
- `npm test`

## Build
- `npm run build`

## Prisma Files
- Schema: `prisma/schema.prisma`
- Migration baseline: `prisma/migrations/20260315_modular_monolith_init/migration.sql`
- Seed script: `prisma/seed.ts`
