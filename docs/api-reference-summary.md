# API Reference Summary

## Base
- Prefix: `/api`
- OpenAPI docs: `/api/docs`
- Authentication: bearer JWT for protected endpoints

## Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Admin and Identity
- `GET /api/admin/tenants`
- `GET /api/admin/tenants/:id`
- `PATCH /api/admin/tenants/:id/settings`
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `POST /api/users/:id/roles`
- `GET /api/roles`
- `GET /api/permissions`

## Facilities, Patients, Representatives, Encounters
- `GET /api/facilities`
- `GET /api/departments`
- `GET /api/patients`
- `POST /api/patients`
- `GET /api/patients/:id`
- `PATCH /api/patients/:id`
- `GET /api/patients/:id/representatives`
- `POST /api/patients/:id/representatives`
- `GET /api/representatives`
- `GET /api/encounters`
- `POST /api/encounters`
- `GET /api/encounters/:id`

## Case Management
- `GET /api/refusal-reason-categories`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id`
- `POST /api/cases/:id/assign`
- `POST /api/cases/:id/close`
- `GET /api/cases/:id/timeline`
- `POST /api/cases/:id/refusal-events`
- `GET /api/cases/:id/refusal-events`
- `POST /api/cases/:id/acknowledgment/send`
- `GET /api/cases/:id/acknowledgment-requests`
- `POST /api/acknowledgments/:id/respond`

## Discharge
- `POST /api/cases/:id/discharge-decision`
- `GET /api/cases/:id/discharge-decision`
- `PATCH /api/cases/:id/discharge-decision`
- `POST /api/cases/:id/discharge-plan`
- `POST /api/cases/:id/discharge-plan/items`
- `PATCH /api/cases/:id/discharge-plan/items/:itemId`

## Workflow and Tasks
- `GET /api/workflows`
- `GET /api/workflows/:id`
- `GET /api/cases/:id/available-transitions`
- `POST /api/cases/:id/transition`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/reassign`
- `POST /api/tasks/:id/comments`

## Documents and Communication
- `GET /api/cases/:id/documents`
- `POST /api/cases/:id/documents/upload`
- `POST /api/cases/:id/documents/generate`
- `GET /api/documents/:id/download`
- `DELETE /api/documents/:id`
- `GET /api/notifications`
- `POST /api/notifications/test`
- `POST /api/otp/request`
- `POST /api/otp/verify`

## Legal, Audit, Reporting
- `GET /api/cases/:id/legal-notes`
- `POST /api/cases/:id/legal-notes`
- `GET /api/cases/:id/audit`
- `POST /api/cases/:id/legal-hold`
- `PATCH /api/cases/:id/legal-hold/:holdId/release`
- `GET /api/audit/logs`
- `GET /api/reports/dashboard`
- `GET /api/reports/cases-summary`
- `GET /api/reports/tasks-overdue`
- `GET /api/reports/legal-escalations`
- `POST /api/reports/export`

## Notes
- Endpoint-level permissions are enforced with `@Permissions(...)` + `PermissionsGuard`.
- Most domain services enforce tenant-scoped access on top of endpoint authorization.
