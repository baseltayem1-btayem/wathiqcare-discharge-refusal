# WathiqCare Physician Workflow - Prototype Map

## Complete 13-Screen Workflow Navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PHYSICIAN WORKFLOW MAP                           │
└─────────────────────────────────────────────────────────────────────┘

START: Home/Physician Dashboard (Screen 1)
   │
   ├─→ [Start New Consent] Button
   │
   ↓
Patient Search (Screen 2)
   │
   ├─ Entry: Click "Start New Consent" from dashboard
   ├─ Primary Action: Search Patient
   ├─ API: GET /api/modules/informed-consents/patients/search
   ├─ Data: searchQuery
   ├─ States: Loading, Empty, Error, Results
   ├─ Exit: Select Patient → Continue
   │
   ↓
Encounter Selection (Screen 3)
   │
   ├─ Entry: Patient selected from Screen 2
   ├─ Primary Action: Select Encounter
   ├─ Secondary Action: Sync Encounter (if TrakCare available)
   ├─ API: GET /api/.../patients/{id}/encounters
   ├─ API: POST /api/.../encounters/{id}/sync-trakcare
   ├─ Data Required: patientId, patientMrn
   ├─ States: Loading, Empty, Sync Pending, Selected
   ├─ Disabled Until: Patient selected
   ├─ Exit: Select Encounter → Continue
   │
   ↓
Consent/Procedure Selection (Screen 4)
   │
   ├─ Entry: Encounter selected from Screen 3
   ├─ Primary Action: Select Consent Template
   ├─ API: GET /api/.../imc-library
   ├─ API: GET /api/.../imc-library/resolve
   ├─ Data Required: encounterId, encounterProcedure
   ├─ States: Loading, Missing Mapping, Selected
   ├─ Validation: Must be Active IMC-approved template
   ├─ Disabled Until: Encounter selected
   ├─ Exit: Select Consent → Continue
   │
   ↓
Anesthesia Decision (Screen 5)
   │
   ├─ Entry: Consent selected from Screen 4
   ├─ Primary Action: Select Anesthesia Type
   ├─ Options: None | Local | Regional | General | Sedation/MAC
   ├─ Data Required: templateId, procedureType
   ├─ States: Not Selected, Selected, Review Required
   ├─ Validation: Review requirement based on type
   ├─ Disabled Until: Consent selected
   ├─ Exit: Select Type → Continue
   │
   ↓
Dynamic Physician Disclosure (Screen 6)
   │
   ├─ Entry: Anesthesia type selected from Screen 5
   ├─ Primary Action: Author Disclosure Fields
   ├─ Fields: 10+ bilingual authoring fields
   ├─ Data Required: All previous context
   ├─ States: Incomplete, In Progress, Complete
   ├─ Validation: Critical fields must have both EN + AR
   ├─ Right Panel: Always-visible validation checklist
   ├─ Indicators: Patient View, PDF, Evidence, Audit
   ├─ Disabled Until: Anesthesia decision complete
   ├─ Exit: All critical fields complete → Continue
   │
   ↓
Patient Education Preview (Screen 7)
   │
   ├─ Entry: Disclosure fields complete from Screen 6
   ├─ Primary Action: Preview Patient Education
   ├─ Toggle: Patient View / Physician View
   ├─ Language: EN / AR toggle
   ├─ Content: Procedure overview, benefits, risks, FAQ
   ├─ States: Preview mode
   ├─ Validation: Education materials ready
   ├─ Exit: Confirm Preview → Continue
   │
   ↓
Patient Preview Simulation (Screen 8)
   │
   ├─ Entry: Education preview confirmed from Screen 7
   ├─ Layout: Split-screen (Physician Controls | Patient View)
   ├─ Left Panel: Authoring controls, edit options
   ├─ Right Panel: Exact patient-facing consent view
   ├─ Indicators: Shows what appears in PDF, Evidence, Audit
   ├─ States: Preview mode, Edit mode
   ├─ Validation: Patient preview must be confirmed
   ├─ Exit: Confirm Patient View → Continue
   │
   ↓
Draft PDF Generation & Review (Screen 10)
   │
   ├─ Entry: Patient preview confirmed from Screen 8
   ├─ Primary Action: Generate Draft PDF
   ├─ API: POST /api/.../generate-draft
   ├─ Payload: All collected data (50+ fields)
   ├─ States: Not Generated, Generating, Generated, Error
   ├─ Secondary Action: Open/Review PDF
   ├─ API: GET /api/.../documents/{id}/pdf?lang=bilingual
   ├─ Validation: All readiness items complete
   ├─ Right Panel: Evidence + Audit readiness indicators
   ├─ Conditional: Request Anesthesia Review (if required)
   ├─ API: POST /api/.../anesthesia-workflow
   ├─ Exit: PDF Ready + Reviews Complete → Continue
   │
   ↓
Send Secure Link/Patient Notification (Screen 11)
   │
   ├─ Entry: Draft PDF generated and reviewed from Screen 10
   ├─ Primary Action: Send Secure Signing Link
   ├─ API: POST /api/.../documents/{id}/secure-signing
   ├─ Data: Patient phone, email, language, OTP method
   ├─ States: Not Ready, Ready, Sending, Sent, Failed
   ├─ Validation: All critical items must be complete
   ├─ Disabled Until: PDF ready + Reviews satisfied
   ├─ Send Button: Shows reason if disabled
   ├─ Exit: Link Sent → View Status
   │
   ↓
Status Tracking (Screen 12)
   │
   ├─ Entry: Secure link sent from Screen 11
   ├─ Primary View: Consent lifecycle timeline
   ├─ API: GET /api/.../documents/{id}/timeline
   ├─ Timeline Events:
   │   ├─ Draft Created
   │   ├─ Anesthesia Review (if applicable)
   │   ├─ Sent to Patient
   │   ├─ Link Opened
   │   ├─ OTP Verified
   │   ├─ Education Viewed
   │   ├─ Patient Decision Recorded
   │   ├─ Digitally Signed
   │   ├─ PDF Generated
   │   └─ Evidence Package Completed
   ├─ Actions: Resend Link, Revoke Link, View Audit
   ├─ States: Real-time status updates
   ├─ Exit: Return to Dashboard
   │
   ↓
Return Home - Updated Dashboard (Screen 13)
   │
   ├─ Entry: Return from Status Tracking
   ├─ Updates: Active consent count incremented
   ├─ Recent Activity: Shows newly sent consent
   ├─ Status Widgets: Updated with new consent
   ├─ Exit: Dashboard ready for next workflow
   │
   └─→ [Start New Consent] → Back to Screen 2

END
```

## Screen Navigation Summary

| Screen # | Screen Name | Entry Point | Exit Point | Blocking Requirements |
|----------|-------------|-------------|------------|---------------------|
| 1 | Physician Dashboard | App load | Start New Consent | None |
| 2 | Patient Search | Dashboard action | Patient selected | None |
| 3 | Encounter Selection | Patient selected | Encounter selected | Patient must be selected |
| 4 | Consent Selection | Encounter selected | Consent selected | Encounter must be selected |
| 5 | Anesthesia Decision | Consent selected | Type selected | Consent must be selected |
| 6 | Dynamic Disclosure | Type selected | Fields complete | Anesthesia type must be selected |
| 7 | Patient Education | Disclosure complete | Education confirmed | Critical disclosure fields complete |
| 8 | Patient Preview | Education confirmed | Preview confirmed | Education materials ready |
| 9 | Validation Panel | Always visible | N/A (sidebar) | N/A |
| 10 | Draft PDF Review | Preview confirmed | PDF ready | All validations pass |
| 11 | Send Secure Link | PDF ready | Link sent | PDF + Reviews complete |
| 12 | Status Tracking | Link sent | Return to dashboard | Link must be sent |
| 13 | Dashboard Updated | From tracking | Next workflow | None |

## Critical Validation Requirements by Screen

### Screen 2: Patient Search
- ✓ Search query not empty
- ✓ Patient data complete (MRN, name, DOB)

### Screen 3: Encounter Selection
- ✓ Patient selected
- ✓ Encounter has required fields
- ✓ Sync status acceptable (synced/manual)

### Screen 4: Consent Selection
- ✓ Encounter selected
- ✓ Template is Active
- ✓ Template is IMC-approved
- ✓ Runtime template mapping available

### Screen 5: Anesthesia Decision
- ✓ Consent template selected
- ✓ Anesthesia type selected
- ✓ Review requirement determined

### Screen 6: Dynamic Disclosure
- ✓ Procedure description (EN) ← CRITICAL
- ✓ Procedure description (AR) ← CRITICAL
- ✓ Patient-specific risks (EN) ← CRITICAL
- ✓ Patient-specific risks (AR) ← CRITICAL
- ✓ Alternatives discussed (EN) ← CRITICAL
- ✓ Alternatives discussed (AR) ← CRITICAL

### Screen 10: Draft PDF Review
- ✓ All critical disclosure fields complete
- ✓ Anesthesia review satisfied (if required)
- ✓ Draft PDF generated successfully

### Screen 11: Send Secure Link
- ✓ PDF generated
- ✓ Patient contact confirmed
- ✓ All critical validations pass
- ✓ Anesthesia review approved (if required)

## Always-Visible Elements

### Workflow Stepper (All Screens 2-12)
- Shows current step
- Shows completed steps
- Shows pending steps
- Allows navigation to completed steps

### Validation Panel (Screens 6-11)
- Always visible on right side (30% width)
- Shows critical/warning/ready states
- Updates in real-time
- Blocks "Send" action until all critical items complete

### Patient Context Bar (Screens 3-12)
- Patient name + MRN
- Current encounter
- Selected procedure
- Anesthesia type (after Screen 5)

## API-Backed Actions Map

| Screen | Action | HTTP Method | Endpoint | Required Fields |
|--------|--------|-------------|----------|----------------|
| 2 | Search Patient | GET | /api/.../patients/search | searchQuery |
| 3 | Load Encounters | GET | /api/.../patients/{id}/encounters | patientId |
| 3 | Sync Encounter | POST | /api/.../encounters/{id}/sync-trakcare | encounterId |
| 4 | Load IMC Library | GET | /api/.../imc-library | - |
| 4 | Resolve Mapping | GET | /api/.../imc-library/resolve | procedureCode |
| 10 | Generate Draft | POST | /api/.../generate-draft | ALL 50+ fields |
| 10 | Open PDF | GET | /api/.../documents/{id}/pdf | documentId, lang |
| 10 | Request Review | POST | /api/.../anesthesia-workflow | documentId, action |
| 11 | Send Link | POST | /api/.../secure-signing | documentId, phone, email |
| 12 | View Timeline | GET | /api/.../documents/{id}/timeline | documentId |
| 12 | View Evidence | GET | /api/.../documents/{id}/evidence-package | documentId |

## State Management Requirements

Each screen must maintain:
- **Loading state**: Show spinner during API calls
- **Error state**: Show error message with retry option
- **Empty state**: Show meaningful empty message
- **Success state**: Show success confirmation
- **Disabled state**: Show reason why action is disabled

## Responsive Breakpoints

- **Desktop**: 1440px (primary design target)
- **Tablet**: 1024px (validation panel becomes collapsible)
- **Mobile**: 390px (status tracking view only, no authoring)

## RTL/LTR Considerations

All screens must support:
- **English (LTR)**: Left-to-right layout
- **Arabic (RTL)**: Right-to-left layout, mirrored navigation
- **Bilingual fields**: Side-by-side EN/AR input fields
- **Language toggle**: Persistent across workflow

---

**Document Version**: 1.0  
**Last Updated**: 8 June 2026  
**Purpose**: Physician workflow navigation and state requirements
