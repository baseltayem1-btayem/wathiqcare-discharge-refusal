# SAFE UI REDESIGN TASK — WathiqCare Physician Workflow

You are a senior frontend UI/UX implementation agent working inside the existing WathiqCare codebase.

## Objective

Safely upgrade the current WathiqCare Informed Consents Physician Workflow UI to a 10/10 enterprise healthcare design, based on the existing DESIGN_HANDOFF package, without breaking the current system.

This is a UI/UX implementation task only.

## Current production workflow to preserve

Preserve the existing workflow exactly:

1. Physician Dashboard / Home
2. Patient Search
3. Encounter Selection
4. Consent / Procedure Selection
5. Anesthesia Decision
6. Physician Dynamic Disclosure
7. Patient Education Preview
8. Patient Preview Simulation
9. Completeness Validation
10. Draft PDF Review
11. Send Secure Link / Patient Notification
12. Status Tracking
13. Return to Dashboard / Updated State

## Design source of truth

Use the following design handoff documents as the source of truth:

- DESIGN_HANDOFF/00_DEVELOPER_HANDOFF.md
- DESIGN_HANDOFF/01_PROTOTYPE_MAP.md
- DESIGN_HANDOFF/02_SCREEN_SPECIFICATIONS.md
- DESIGN_HANDOFF/03_COMPONENT_LIBRARY.md
- DESIGN_HANDOFF/04_DESIGN_TOKENS.md
- DESIGN_HANDOFF/05_API_UI_MAPPING.md
- DESIGN_HANDOFF/README.md

## Main active files allowed for UI work

You may modify only these files unless absolutely necessary:

- apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx
- apps/web/src/components/informed-consents/enterprise-workflow/EnterpriseSupportSettingsPanel.tsx

If reusable UI-only components are needed, create them only inside:

- apps/web/src/components/informed-consents/enterprise-workflow/

## Strictly forbidden files and folders

Do not modify:

- apps/web/app/api
- apps/web/src/lib/server
- apps/web/proxy.ts
- apps/web/package.json
- package.json
- package-lock.json
- prisma/schema.prisma
- .env files
- .next
- node_modules
- build logs
- Vercel output
- apps/web/src/components/informed-consents/_legacy-rejected
- apps/web/src/components/informed-consents/final-ui

## Do not change system behavior

Do not change:

- API calls
- API payloads
- authentication
- middleware
- Prisma schema
- PDF generation logic
- anesthesia metadata logic
- generate-draft logic
- secure signing logic
- patient notification logic
- audit/evidence logic
- route structure

## Existing data and behavior that must remain intact

Preserve all current state names, handlers, and API-backed behavior, including:

- Patient Search
- Select Patient
- Load Encounters
- Select Encounter
- Sync Encounter if available
- Select Consent / Procedure
- Select Anesthesia Type
- Generate Draft PDF
- Open / Review Draft PDF
- Request Anesthesia Review
- Send Secure Signing Link / Patient Notification
- View Timeline / Audit Trail
- View Evidence Package Readiness

Preserve these key fields:

- patientId
- patientMrn
- patientCaseId
- encounterId
- encounterNumber
- encounterCaseNumber
- encounterAdmissionDate
- encounterDepartment
- encounterPhysician
- encounterPhysicianLicense
- encounterPhysicianSpecialty
- encounterDiagnosis
- encounterProcedure
- encounterSyncStatus
- encounterSource
- templateId
- templateVersionId
- language
- imcLibraryItemId
- imcLibraryTitleEn
- imcLibraryPublicPath
- imcLibrarySource
- imcLibraryStatus
- imcLibraryTemplateType
- anesthesiaDecision
- anesthesiaReviewRequired
- anesthesiaTypeLabel

## UI redesign requirements

Upgrade the UI to enterprise healthcare quality:

- Premium hospital-grade layout
- Clear clinical workflow hierarchy
- Strong workflow stepper
- Clear patient and encounter context
- Clear consent/template context
- Excellent anesthesia decision design
- Always-visible readiness/validation panel
- Draft PDF review readiness
- Evidence and audit readiness indicators
- Strong primary action area
- Clear disabled-state explanations
- Clear error/loading/success states
- Desktop-first and tablet-ready
- Arabic RTL and English LTR safe layout
- No clutter
- No fake buttons
- No unsupported AI actions
- No marketing-style layout

## Branding and visual tokens

Use WathiqCare / Tayem & Co colors:

- Royal Blue: #002B5C
- Luxury Gold: #C9A13B
- Dark Gray: #2F2F2F
- White: #FFFFFF
- Light Blue: #4B9CD3
- Soft clinical background: #F4F7FB

## Component improvements expected

Improve or create UI-only components for:

- App shell / page layout
- Workflow stepper
- Patient summary card
- Encounter summary card
- Consent summary card
- Anesthesia option card
- Readiness checklist item
- Validation badge
- Status badge
- PDF review card
- Evidence indicator
- Audit trail indicator
- Alert banner
- Primary / secondary / disabled / loading buttons

## Quality rules

1. Every disabled action must explain why it is disabled.
2. Every missing requirement must be visible.
3. Patient, encounter, consent, and anesthesia context must remain visible.
4. The physician must feel they are completing a structured clinical checklist.
5. The UI must not feel like writing a long legal document.
6. PDF and evidence readiness must be visible before sending.
7. Arabic and English layouts must be equal quality.
8. Do not hide validation issues.
9. Do not invent fake workflow logic.
10. Do not break production routes.

## Implementation approach

1. Read the DESIGN_HANDOFF files first.
2. Inspect the current active enterprise workflow component.
3. Apply UI-only improvements incrementally.
4. Do not mass-format unrelated files.
5. Do not delete active files.
6. Do not touch backend/API/PDF logic.
7. After changes, run:

npm run build

8. If build fails, fix only UI-related errors caused by your changes.
9. Provide a final summary listing:
   - Files changed
   - UI improvements made
   - Confirmation that backend/API/PDF logic was not changed
   - Build result

## Final acceptance criteria

The design implementation is acceptable only if:

- `npm run build` passes.
- `git status --short` shows changes only in allowed UI files.
- The physician workflow still supports the existing API-backed journey.
- No backend or API files were modified.
- No package or environment files were modified.
