# APPLY PROTOTYPE 6 UI SAFELY — WathiqCare

You are a senior frontend UI/UX implementation agent working inside the existing WathiqCare codebase.

## Objective
Apply the UI/UX improvements from Prototype 6 safely to the current WathiqCare platform.
This is a UI-only implementation task.

## Design source
Use the extracted design handoff from:
designs/PhysicianWorkflow_Prototype_6_Extracted/DESIGN_HANDOFF/

If Prototype 6 also contains Patient Journey handoff files, inspect them, but do not implement patient journey unless explicitly instructed. First focus on the physician workflow.

## Main allowed implementation area
Apply UI-only improvements only inside:
apps/web/src/components/informed-consents/enterprise-workflow/

Allowed files:
- apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx
- apps/web/src/components/informed-consents/enterprise-workflow/EnterpriseSupportSettingsPanel.tsx

## Forbidden files and folders
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
- apps/web/src/components/informed-consents/_legacy-rejected
- apps/web/src/components/informed-consents/final-ui

## Do not change behavior
Do not change:
- API calls, Auth logic, PDF logic, Anesthesia metadata, Secure signing, Patient notification, Audit/evidence, Route structure

## Preserve existing workflow
Patient Search → Encounter Selection → Consent / Procedure Selection → Anesthesia Decision → Generate Draft PDF → Review Draft PDF → Request Anesthesia Review if required → Send Patient Notification → Status / Evidence readiness

## Preserve key fields
patientId, patientMrn, patientCaseId, encounterId, encounterNumber, encounterCaseNumber, encounterAdmissionDate, encounterDepartment, encounterPhysician, encounterPhysicianLicense, encounterPhysicianSpecialty, encounterDiagnosis, encounterProcedure, encounterSyncStatus, encounterSource, templateId, templateVersionId, language, imcLibraryItemId, imcLibraryTitleEn, imcLibraryPublicPath, imcLibrarySource, imcLibraryStatus, imcLibraryTemplateType, anesthesiaDecision, anesthesiaReviewRequired, anesthesiaTypeLabel

## UI quality target
Upgrade the physician workflow UI to 10/10 enterprise healthcare quality:
- Premium hospital-grade layout
- Clear clinical workflow hierarchy
- Strong workflow stepper
- Patient/encounter/consent/anesthesia context always visible
- Excellent anesthesia decision cards
- Clear draft PDF review area
- Evidence and audit readiness indicators
- Strong readiness/validation panel
- Clear disabled-state reasons
- Clear loading/error/success states
- Desktop-first and tablet-ready
- Arabic RTL and English LTR safe layout
- No clutter
- No fake actions
- No unsupported AI workflows
- No marketing style

## Brand colors
- Royal Blue: #002B5C
- Luxury Gold: #C9A13B
- Dark Gray: #2F2F2F
- White: #FFFFFF
- Light Blue: #4B9CD3
- Soft clinical background: #F4F7FB

## Required implementation checks
After changes:
1. Run: npm run build
2. Check changed files: git status --short
Acceptable changes must be limited to:
apps/web/src/components/informed-consents/enterprise-workflow/

Do not stage or commit designs/ unless explicitly requested.

## Final response required
After implementation, summarize:
- Files changed
- UI improvements made
- Confirmation that backend/API/PDF/package/proxy/env/prisma were not changed
- Build result
