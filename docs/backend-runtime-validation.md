# Backend Runtime Validation

Generated: 2026-03-16T00:52:45+00:00

## Scope

This report covers Stage 2 runtime validation for `backend-nest` only. The goal was to close operational readiness gaps without replacing the legacy FastAPI backend, without broadening module scope, and without refactoring for style.

## Runtime Environment Validated

- Compose file: `backend-nest/docker-compose.yml`
- API base URL: `http://localhost:4000/api`
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/docs-json`
- PostgreSQL host port: `5433`
- Redis host port: `6380`
- MinIO API host port: `9002`
- MinIO console host port: `9003`

## Executed Validation

| Area | Method | Result | Notes |
| --- | --- | --- | --- |
| Live stack startup | `docker compose up --build -d` from `backend-nest/` | Passed | API, PostgreSQL, Redis, MinIO, and MinIO init container reached stable state after runtime fixes. |
| Prisma migration | `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/wathiqcare_backend npm run prisma:migrate` | Passed | No pending migrations after initial apply. |
| Seed | `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/wathiqcare_backend npm run prisma:seed` | Passed | Seed completed successfully against the live database. |
| Liveness | `GET /api/health/live` | Passed | Returned HTTP 200 from live service. |
| Readiness | `GET /api/health/ready` | Passed | Returned HTTP 200 with dependency checks green for database, Redis, and object storage. |
| Live lifecycle smoke | Real HTTP flow against running API | Passed | Login, case creation, discharge decision, discharge plan, acknowledgment request, refusal event, workflow transition, task side effect, document metadata upload, legal note, and audit trail all succeeded. |
| Smoke side effects | Live workflow results | Passed | Smoke run produced `tasksCount: 1` and `auditEvents: 8`. |
| Unit and integration tests | `npm test -- --runInBand` | Passed | 5 suites passed, 9 tests passed. |
| Real e2e test | `npm run test:e2e -- --runInBand` | Passed | 1 suite passed, 2 tests passed using real Nest bootstrap plus schema-isolated PostgreSQL flow. |
| Frontend OpenAPI readiness | Live check against `/api/docs-json` | Passed for core Stage 2 scope | Core request DTOs now expose populated properties and required fields. `GET /api/refusal-reason-categories` is present in the live spec. |

## Runtime Bugs Found And Fixed

1. Docker Compose startup failed because fixed `container_name` values collided with existing containers. The fix removed hard-coded names and moved published host ports to safer defaults.
2. The API container failed at runtime because production start scripts pointed to `dist/main.js`, while the built Nest entrypoint was actually `dist/src/main.js`. The fix updated the package scripts and container startup path.
3. Nest bootstrap failed with `compression_1.default is not a function`. The fix enabled `esModuleInterop` and kept middleware imports consistent with the compiled runtime.
4. `POST /cases/:id/documents/upload` returned HTTP 500 during the live smoke test because Prisma `BigInt` values were not JSON-serializable. The fix normalizes `bigint` values recursively in the global response envelope interceptor.

## Readiness Hardening Added

- Environment validation at startup through `src/config/env.validation.ts`
- Structured startup success and startup failure logging in `src/main.ts`
- Shared bootstrap logic in `src/bootstrap.ts` so runtime and e2e use the same middleware, validation, filters, interceptors, and Swagger setup
- Live health endpoints:
  - `GET /api/health`
  - `GET /api/health/live`
  - `GET /api/health/ready`
- Dependency-aware readiness checks for PostgreSQL, Redis, and MinIO

## Frontend Integration Readiness

- Authentication flow is live and documented under `POST /api/auth/login`.
- Login returns `accessToken`, `refreshToken`, `expiresIn`, and the authenticated `user` object.
- Protected endpoints use Bearer authentication under the `/api` prefix.
- The OpenAPI document now includes concrete request shapes for the Stage 2 core lifecycle DTOs:
  - `LoginDto`
  - `CreateRefusalCaseDto`
  - `CreateDischargeDecisionDto`
  - `CreateDischargePlanDto`
  - `SendAcknowledgmentDto`
  - `CreateRefusalEventDto`
  - `ExecuteTransitionDto`
  - `UploadCaseDocumentDto`
  - `CreatePrivilegedNoteDto`
- A frontend-usable reference endpoint is now available at `GET /api/refusal-reason-categories` so refusal-event creation does not require direct database lookup.

## Known Remaining Gaps

- Swagger response bodies are still mostly documented through the shared response envelope rather than per-endpoint response DTO classes.
- Secondary and admin-facing DTOs are not all fully decorated for Swagger yet; only the core Stage 2 lifecycle inputs were completed in this pass.
- Document upload remains the current JSON metadata flow with optional base64 content, not a multipart binary upload contract.

## Conclusion

`backend-nest` is now runnable end-to-end via Docker Compose, passes live readiness checks, applies migrations and seed successfully, survives real API smoke testing, and has a real database-backed e2e path exercising the core refusal-case lifecycle. The remaining work is primarily documentation depth for non-core endpoints rather than operational readiness.