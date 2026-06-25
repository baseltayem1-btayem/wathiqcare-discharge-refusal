# Prototype V2 Architecture

## Scope
This document describes the architecture of the 24-hour acceleration prototype for:

1. **Approved Forms V2**
2. **Doctor Workspace V2**
3. **Procedure Mapping Engine**
4. **Content Mapping Service (Phase 43)**
5. **Consent Journey (Phase 44)**

The prototypes are intentionally isolated from production WathiqNote workflows so they can be validated without risk.

## Constraints Respected
- No production deployment.
- No changes to existing `/modules/informed-consents/*` workflows.
- No changes to OTP/SMS/PDF services.
- No merge to `main`.
- Static data only — no database migrations.

## High-Level Layout

```
apps/web/src/app/prototype/                    # Next.js App Router routes
├── layout.tsx                                 # Shared PrototypeShell wrapper
├── page.tsx                                   # Prototype hub
├── approved-forms-v2/page.tsx                 # Approved Forms V2 route
├── consent-journey/page.tsx                   # Consent Journey route (Phase 44)
├── content-mapping-service/page.tsx           # Content Mapping Service route (Phase 43)
├── doctor-workspace-v2/page.tsx               # Doctor Workspace V2 route
└── procedure-mapping-engine/page.tsx          # Procedure Mapping Engine route

apps/web/src/components/prototype/             # Prototype-only React components
├── PrototypeShell.tsx
├── ApprovedFormsV2/ApprovedFormsLibrary.tsx
├── DoctorWorkspaceV2/DoctorWorkspaceShell.tsx
└── ProcedureMappingEngine/MappingMatrix.tsx

apps/web/src/lib/prototype/                    # Static data, services, and shared types
├── types.ts
├── form-taxonomy.ts
├── procedure-mapping-matrix.ts
├── mock-patients.ts
└── content-mapping-service.ts                 # Phase 43 service

docs/prototype-v2/                       # Deliverable documentation
├── ARCHITECTURE.md
├── FORM_TAXONOMY.md
├── PROCEDURE_MAPPING_MATRIX.md
├── DEMO_WALKTHROUGH.md
└── screenshots/                         # Captured screenshots
```

## Route Isolation
All prototype routes live under `/prototype/*`. They are not linked from the main navigation (`ConditionalNav` returns `null` for these routes because they are outside the legal-queue prefix set). Users access them directly by URL.

## Component Architecture

### Shared Shell (`PrototypeShell.tsx`)
- Sticky header with Prototype Lab branding and an Exit Prototype link.
- Tab navigation across the three surfaces.
- Uses existing Tailwind tokens and Lucide icons.

### Approved Forms V2 (`ApprovedFormsLibrary.tsx`)
- Renders stats cards, taxonomy filters, and a two-column layout:
  - Left: filterable table of `ConsentTemplateV2` records.
  - Right: detail panel with bilingual summary, requirements, and risk/status badges.
- Data source: `apps/web/src/lib/prototype/form-taxonomy.ts`.

### Procedure Mapping Engine (`MappingMatrix.tsx`)
- Renders stats cards, category/specialty filters, and a matrix table.
- Each row maps a procedure to its consent category, anesthesia implication, risk level, and recommended templates.
- Clicking a row opens a detail drawer with mandatory disclosures, alternatives, refusal consequences, and education assets.
- Data source: `apps/web/src/lib/prototype/procedure-mapping-matrix.ts`.

### Doctor Workspace V2 (`DoctorWorkspaceShell.tsx`)
- Renders KPI cards, a `WorkflowProgress` stepper, and four step panels:
  1. **Patient** — select an encounter from `mock-patients.ts`.
  2. **Recommend** — the Procedure Mapping Engine resolves recommended templates, risk, and disclosures.
  3. **Review** — preview the consent package and education assets.
  4. **Simulate Send** — simulated patient send with explicit disclaimer that no OTP/SMS/PDF is produced.

### Content Mapping Service (`content-mapping-service.ts` + `content-mapping-service/page.tsx`)
- **Service layer** (`apps/web/src/lib/prototype/content-mapping-service.ts`):
  - Reads the real IMC approved forms library (`imcApprovedConsentLibrary.generated.ts`).
  - Exports `resolveContentByProcedureName(procedureName)` and `resolveContentByProcedureId(procedureId)`.
  - Returns consent form and optional education material with language, version, specialty, and public path.
- **Prototype surface** (`/prototype/content-mapping-service`):
  - Searchable procedure list backed by the service.
  - Visual flow: Procedure → Education Material → Consent Form.
  - Pre-loaded examples for "Both" and "Consent Only" cases.
  - Service contract panel showing input/output JSON shapes.

### Consent Journey (`consent-journey/page.tsx`)
- End-to-end prototype of the informed-consent workflow driven by the Approved Forms Library.
- Stepper with five stages:
  1. **Procedure Selection** — physician selects a procedure.
  2. **Content Mapping** — Content Mapping Service resolves consent form + optional education material.
  3. **Patient Education Material** — review and confirm education (skipped when not available).
  4. **Consent Form Preview** — review consent form metadata and confirm.
  5. **Ready for Signature** — simulated send to patient with explicit no-OTP/SMS/PDF disclaimer.
- Demonstrates both "Education + Consent" and "Consent Only" procedures.
- Shows procedure name, specialty, education material, consent form, version, and language at each relevant step.

## Data Flow

```
[Approved Forms V2]        ->  form-taxonomy.ts
[Procedure Mapping]        ->  procedure-mapping-matrix.ts
[Doctor Workspace]         ->  mock-patients.ts + procedure-mapping-matrix.ts + form-taxonomy.ts
[Content Mapping Service]  ->  imcApprovedConsentLibrary.generated.ts
[Consent Journey]          ->  content-mapping-service.ts
```

All data is static TypeScript. No API calls, no Prisma queries, no backend routers are involved in the prototype.

### Content Mapping Service Flow

```
Physician selects procedure
           │
           ▼
resolveContentByProcedureName("Abdominal Aortic Aneurysm")
           │
           ├──► Education Material (optional)
           │
           └──► Consent Form
```

### Consent Journey Flow

```
Procedure Selection
       │
       ▼
Content Mapping Service
       │
       ├──► Patient Education Material (if available) ──► Confirmed
       │
       └──► Consent Form Preview ──► Physician confirmed
                       │
                       ▼
              Ready for Signature
                       │
                       ▼
               Patient Signing Link
```

## Reuse Strategy
The prototypes reuse existing in-app UI primitives to maintain visual consistency:

- `PageHeader`, `SectionPanel`, `DataTable`, `StatCard`, `StatusBadge`, `WorkflowProgress` from `apps/web/src/components/ui/`.
- Tailwind CSS v4 tokens from `apps/web/src/styles/globals.css`.
- `lucide-react` icons.

No changes were made to these primitives.

## Future Production Integration Points
If the prototype is approved, the following integration points would be implemented:

1. **Data layer**: Replace static arrays with Prisma queries against existing models:
   - `ConsentCategory`, `ConsentTemplate`, `ConsentTemplateVersion`
   - `ConsentProcedureCatalog`, `ConsentProcedureRiskItem`, `ConsentProcedureAlternative`
   - `ProcedureEducationAsset`, `ConsentEmrMapping`
2. **API layer**: Add `apps/web/src/app/api/prototype/*` route handlers (or FastAPI routers) to serve mapping recommendations.
3. **Content Mapping Service**: Promote `apps/web/src/lib/prototype/content-mapping-service.ts` to `apps/web/src/lib/server/` and call it from the production consent issuance flow when a physician selects a procedure.
4. **Doctor Workspace**: Integrate with TrakCare/case service for live encounters and with the consent issuance service for real PDF/OTP/SMS.
5. **Authorization**: Apply existing module-access checks (`canAccessModule`) before exposing prototype routes.

## Risk and Limitations
- Static data means the prototype cannot demonstrate real-time EMR sync.
- Simulated send does not exercise the actual signing pipeline.
- No role-based access control is enforced in the prototype routes.
- The taxonomy and mapping matrix are curated subsets, not exhaustive catalogs.

## Success Criteria
- [x] `/prototype` hub loads and links to all surfaces.
- [x] `/prototype/approved-forms-v2` supports taxonomy filtering and template preview.
- [x] `/prototype/procedure-mapping-engine` renders the mapping matrix and detail drawer.
- [x] `/prototype/doctor-workspace-v2` supports patient selection and simulated smart issuance.
- [x] `/prototype/content-mapping-service` resolves consent form and education material from a procedure.
- [x] `/prototype/consent-journey` demonstrates procedure → education → consent preview → ready for signature.
- [x] Content Mapping Service uses the real `imcApprovedConsentLibrary.generated.ts` library.
- [x] Consent Journey demonstrates both "Education + Consent" and "Consent Only" cases.
- [x] Documentation and screenshots are saved under `docs/prototype-v2/`.
- [x] No edits to production workflows, OTP/SMS/PDF, or `main`.
