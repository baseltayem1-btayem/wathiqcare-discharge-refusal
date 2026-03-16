# Frontend ↔ Backend-Nest Integration Guide

## Architecture Overview

```
Browser
  └─ Next.js (port 3000)
       ├─ /api/nest/[...path]   ← unified proxy → backend-nest :4000/api/*
       ├─ /api/auth/*            ← legacy auth proxy (preserved)
       └─ /api/discharge/*       ← legacy discharge proxy (preserved)

Backend-Nest (port 4000, prefix /api)
  └─ All responses: { success: true, data: T } | { success: false, error: { code, message } }
```

---

## Environment Variables

| Variable | Default (dev) | Purpose |
|---|---|---|
| `BACKEND_NEST_API_BASE_URL` | `http://127.0.0.1:4000` | Backend-nest base URL (server-side) |
| `NEXT_PUBLIC_API_PROXY_PREFIX` | `/api/nest` | Client-side proxy prefix |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | `20000` | HTTP client timeout (ms) |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL` | unset | Set to `"true"` to pre-fill login fields in dev |

---

## Layer Map

```
frontend/
  app/api/nest/[...path]/route.ts   ← Next.js proxy route (all HTTP methods)
  src/
    lib/
      server/backend.ts             ← resolves BACKEND_NEST_API_BASE_URL
      config/runtime.ts             ← reads NEXT_PUBLIC_* env vars
      api/
        http-client.ts              ← typed fetch, envelope unwrap, auth header, timeout
        token-store.ts              ← localStorage token CRUD
        types.ts                    ← shared TypeScript types (mirrors backend-nest DTOs)
        modules/
          auth.ts                   ← /auth/*
          cases.ts                  ← /cases/*
          discharge.ts              ← /cases/:id/discharge-*
          refusal.ts                ← /cases/:id/refusal-events, acknowledgments
          workflow.ts               ← /cases/:id/transition, available-transitions
          tasks.ts                  ← /tasks/*
          documents.ts              ← /cases/:id/documents, /documents/:id
          legal.ts                  ← /cases/:id/legal-notes, /cases/:id/audit
          audit.ts                  ← /audit/logs
          reports.ts                ← /reports/*
          reference.ts              ← /facilities, /departments, /patients, /encounters
          users.ts                  ← /users, /auth/me
        index.ts                    ← barrel export
      session/
        AuthSessionProvider.tsx     ← React context: user, status, login, logout, hasPermission
      hooks/
        query-keys.ts               ← all React Query keys (namespaced)
        use-auth.ts                 ← useLoginMutation, useLogoutMutation, useAuthSession
        use-cases.ts                ← useCasesQuery, useCaseQuery, useCaseTimelineQuery, useCreateCaseMutation
        use-discharge.ts            ← useDischargeDecisionQuery, useDischargePlanQuery, mutations
        use-refusal.ts              ← useRefusalEventsQuery, useCreateRefusalEventMutation
        use-workflow.ts             ← useAvailableTransitionsQuery, useExecuteTransitionMutation
        use-tasks.ts                ← useTasksQuery, useCompleteTaskMutation, useReassignTaskMutation
        use-documents.ts            ← useCaseDocumentsQuery, useGenerateCaseDocumentMutation
        use-legal.ts                ← useLegalNotesQuery, useCaseAuditQuery, useCreateLegalNoteMutation
        use-audit.ts                ← useAuditLogsQuery
        use-reports.ts              ← useReportsDashboardQuery, useCasesSummaryQuery, useTasksOverdueQuery
        use-reference.ts            ← useFacilitiesQuery, useDepartmentsQuery, usePatientsQuery, useEncountersQuery
        use-users.ts                ← useCurrentUserQuery, useUsersQuery
    providers/
      AppProviders.tsx              ← QueryClientProvider > AuthSessionProvider > GlobalApiErrorBanner
    components/
      hospital/
        StatusBadge.tsx             ← colored badge for case/task status
        WorkflowTimeline.tsx        ← ordered event list
        TaskList.tsx                ← interactive task list (complete, reassign)
        DocumentList.tsx            ← document list (download, delete)
        AuditEventList.tsx          ← audit log list
      GlobalApiErrorBanner.tsx      ← auto-dismissing error banner
```

---

## Pages Wired

| Page | File | Data Source |
|---|---|---|
| Login | `app/login/page.tsx` | `useLoginMutation` → `authApi.login` |
| Dashboard | `app/dashboard/page.tsx` | `useReportsDashboardQuery`, `useCasesQuery`, `useTasksOverdueQuery`, `useLegalEscalationsQuery` |
| Cases List | `app/cases/page.tsx` | `useCasesQuery` with filters + pagination |
| Create Case | `app/cases/new/page.tsx` | `useFacilitiesQuery`, `useDepartmentsQuery`, `usePatientsQuery`, `useEncountersQuery`, `useCreateCaseMutation` |
| Case Details | `app/cases/[id]/page.tsx` | All case hooks, tabbed: Overview / Discharge / Tasks / Documents / Legal / Timeline |

---

## Authentication Flow

1. `LoginPage` → `useLoginMutation` → `POST /api/nest/auth/login`
2. On success → `setStoredSessionTokens({ accessToken, refreshToken })` in localStorage
3. `AuthSessionProvider` queries `/api/nest/auth/me` on mount to hydrate user
4. `http-client.ts` reads token from `tokenStore.getAccessToken()` and adds `Authorization: Bearer …` header
5. 401 response → `AuthSessionProvider` clears tokens and sets `status = "unauthenticated"`
6. `AuthGuard` redirects to `/login` when `status === "unauthenticated"`

---

## Response Envelope

Backend-nest wraps all responses. `http-client.ts` handles this automatically:

```ts
// Backend sends:
{ "success": true, "data": { ... } }
// http-client returns only: { ... }

// On error backend sends:
{ "success": false, "error": { "code": "...", "message": "..." } }
// http-client throws: ApiClientError(message, status)
```

---

## Adding a New API Call

1. Add method to the appropriate module in `src/lib/api/modules/`
2. Add query key to `src/lib/hooks/query-keys.ts`
3. Create hook in `src/lib/hooks/use-<domain>.ts`
4. Use hook in component

---

## Development Hints

- Set `NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL=true` in `.env.local` to auto-fill login credentials.
- Backend-nest seed user: `admin@wathiqcare.local` / `Admin@12345`
- Backend Swagger: http://localhost:4000/api/docs
- React Query devtools: automatically included in dev builds via `AppProviders.tsx`
