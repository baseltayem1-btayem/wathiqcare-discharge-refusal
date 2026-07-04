# 33 — Production Workspace Function Map

## Route

`/modules/informed-consents` → `FinalInformedConsentsModule` → `ProductionPhysicianWorkspace`

## Auth & RBAC

| Function | Location | Notes |
|----------|----------|-------|
| Page-level auth guard | `app/modules/informed-consents/page.tsx` | `requirePageAuthClaimsOrRedirect` + `canAccessModule("informed-consents", ...)` |
| Module operational access | `lib/server/auth.ts` | `requireModuleOperationalAccess` used by all API routes |

## Core workspace actions

| Action | UI trigger | API endpoint | Preserved logic |
|--------|------------|--------------|-----------------|
| Search patients | `PatientEncounterSelector` input | `GET /api/modules/informed-consents/patients/search` | Real patient lookup |
| Load encounters | Selecting a patient | `GET /api/modules/informed-consents/patients/{mrn}/encounters` | Real encounter list |
| Resolve procedure | "Resolve" button | `GET /api/modules/informed-consents/content-mapping/resolve` | CKE / content mapping + consent package assembly |
| Approve draft | "Save Draft" / readiness flow | Client state only | `approveDraft()` |
| Send to patient | "Send to Patient" button → modal confirm | `POST /api/modules/informed-consents/send` | Secure signing link + SMS/OTP pipeline |
| View timeline | Post-send state | `GET /api/modules/informed-consents/timeline` | Audit-chain events |

## Supporting pages

| Page | Source | State |
|------|--------|-------|
| Patients | `components/canva/pages/PatientsPage.tsx` | Real `patients[]` from hook; search filters real data |
| Encounters | `components/canva/pages/EncountersPage.tsx` | Real `encounters[]` from hook |
| Procedures | `components/canva/pages/ProceduresPage.tsx` | Empty state — catalog not enabled |
| Knowledge | `components/canva/pages/KnowledgePage.tsx` | Empty state — browse not enabled |
| Templates | `components/canva/pages/TemplatesPage.tsx` | Empty state — management not enabled |
| Analytics | `components/canva/pages/AnalyticsPage.tsx` | Empty metrics — usage integration not enabled |
| Audit | `components/canva/pages/AuditPage.tsx` | Real `timeline[]` from hook |
| Settings | `components/canva/pages/SettingsPage.tsx` | Read-only `physician` context |

## Data flow

```
PhysicianContext (auth)
    ↓
useProductionWorkspace
    ↓
searchPatients / getPatientEncounters / resolveContentMapping / sendSecureSigningLink / fetchTimeline
    ↓
CanvaWorkspaceShell + CanvaWorkspacePage + pages
```

## Unchanged backend services

- `sendModuleSecureSigningLink` (OTP + signature)
- `content-mapping-service` / `resolveCkeConsentMapping`
- Consent library / audit writing (`writeConsentAudit`)
- Audit-chain timeline queries (`prisma.auditChainEvent`)
- PDF / evidence pipeline referenced in `SendConfirmationModal`
