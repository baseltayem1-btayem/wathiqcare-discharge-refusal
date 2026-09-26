# 31 — Canva Design Implementation

**Status:** Executed  
**Scope:** Production route `/modules/informed-consents`  
**Component path:** `apps/web/src/components/informed-consents/production-workspace/`  

## Summary

The approved Canva physician workspace design was implemented as the visual layer for the production informed-consents module. The implementation replaces only the presentation shell and page components; all auth, RBAC, consent resolution, OTP/PDF delivery, audit, and evidence logic remain unchanged and continue to use the production API surface.

## Visual layer delivered

| File | Purpose |
|------|---------|
| `ProductionPhysicianWorkspace.tsx` | Orchestrates real workspace state and renders the Canva shell |
| `components/canva/CanvaWorkspaceShell.tsx` | Sidebar navigation, logo, and physician profile |
| `components/canva/CanvaWorkspaceNav.tsx` | Page navigation items |
| `components/canva/CanvaTopBar.tsx` | Patient / encounter / procedure context bar with language toggle |
| `components/canva/CanvaWorkspacePage.tsx` | Main dashboard: Clinical Knowledge Package, Readiness Checklist, Decision Support, Timeline, Metrics, Audit |
| `components/canva/CanvaSidebarProfile.tsx` | Physician profile card using real IMC General Surgery physicians |
| `components/canva/pages/*.tsx` | Placeholder-safe pages for Patients, Encounters, Procedures, Knowledge, Templates, Analytics, Audit, Settings |

## What was preserved

- `useProductionWorkspace` hook and all API calls in `lib/api.ts`
- Patient search and encounter selection flow
- Clinical knowledge package resolution via `/api/modules/informed-consents/content-mapping/resolve`
- Secure signing dispatch via `/api/modules/informed-consents/send`
- Audit timeline retrieval via `/api/modules/informed-consents/timeline`
- Auth guards on the route page (`requirePageAuthClaimsOrRedirect`, `canAccessModule`)
- Send confirmation modal and OTP/signature pipeline references

## What was removed

- Mock data mapping helpers (`mapAssemblyToMock`, `toMockPatient`, `toMockEncounter`, `toMockProcedure`, `toMockTimelineEvents`) are no longer used by the visual layer
- Legacy `ClinicalWorkspaceShell`, `ContextBar`, `ActionRail`, `ReadinessSidebar`, `ClinicalKnowledgePackageCard`, `DraftPreviewPanel`, `ClinicalTimelinePanel`

## Notes

- Layout, spacing, colors, typography, icons, and card order in the Canva components were kept as authored; no redesign or simplification was introduced.
- The `PatientEncounterSelector` and `SendConfirmationModal` were updated only at the type level to accept production types directly; their rendered UI is unchanged.
