# WathiqCare Physician Workflow - 10/10 UI/UX Handoff

**Project**: WathiqCare Informed Consents Platform  
**Module**: Physician Workflow Redesign  
**Version**: 1.0  
**Date**: 8 June 2026  
**Target Quality**: Enterprise-grade 10/10 hospital platform  

---

## Executive Summary

This document provides complete design specifications, component library, and implementation guidelines for upgrading the WathiqCare Physician Workflow to 10/10 enterprise-grade quality comparable to Epic, Mayo Clinic, and Cleveland Clinic systems.

**Design Philosophy**: Transform the current consent workflow from "filling out legal documents" to "completing a structured clinical checklist" while maintaining full API compatibility and production system behavior.

---

## Table of Contents

1. [Prototype Map](#prototype-map) - Complete workflow navigation
2. [Screen Inventory](#screen-inventory) - All 13 screens detailed
3. [Component Library](#component-library) - 16+ reusable components
4. [Design Tokens](#design-tokens) - Colors, typography, spacing
5. [API-Action Mapping](#api-action-mapping) - Backend integration points
6. [Validation Rules](#validation-rules) - Readiness requirements
7. [Accessibility](#accessibility) - WCAG 2.1 compliance
8. [RTL/LTR Guidelines](#rtl-ltr-guidelines) - Bilingual support
9. [Implementation Notes](#implementation-notes) - Engineering guidance
10. [No-Break Constraints](#no-break-constraints) - What NOT to change

---

## Prototype Map

**Complete 13-Screen Workflow**:

```
START → Dashboard → Patient Search → Encounter Selection → 
Consent Selection → Anesthesia Decision → Dynamic Disclosure → 
Patient Education → Patient Preview → Draft PDF Review → 
Send Secure Link → Status Tracking → Dashboard (Updated) → END
```

**Critical Path**:
- **Minimum Required Screens**: 7 (Patient → Encounter → Consent → Anesthesia → Disclosure → PDF → Send)
- **Enhanced Experience**: 13 screens (includes previews, education, validation, tracking)
- **Navigation**: Linear progression with back-navigation allowed, stepper shows progress

📄 **See**: `01_PROTOTYPE_MAP.md` for complete navigation flows, entry/exit points, API dependencies

---

## Screen Inventory

### 1. Home / Physician Dashboard
**Purpose**: Physician workspace showing active consents, pending items, and quick actions

**Key Elements**:
- Pending consents widget (count + preview)
- Draft consents widget
- Sent consents awaiting signature
- Completed consents today
- Critical alerts banner (red for critical issues)
- "Start New Consent" primary action
- Recent activity timeline

**Layout**: 1440px × 900px, 3-column widget grid, full-width alerts, timeline

**Critical Requirements**:
- Real-time consent counts
- Clickable alerts navigate to specific issues
- Recent activity shows last 10 actions max

---

### 2. Patient Search
**Purpose**: Search and select patient to start consent workflow

**Key Elements**:
- Search input (MRN/Name/Case ID)
- Search button (disabled if query empty)
- PHI protection warning banner (amber)
- Patient result cards with demographics
- Selected patient state (blue border, badge)
- Loading/Empty/Error states

**API**: `GET /api/.../patients/search`

**Validation**: Must select patient before continuing

**Critical Requirements**:
- Show all patient data: MRN, name (EN+AR), DOB, gender, case ID, contact
- Selected state must be visually obvious
- PHI warning always visible

---

### 3. Encounter Selection
**Purpose**: Select hospital encounter for the consent

**Key Elements**:
- Patient summary bar (sticky, shows selected patient)
- Encounter cards (2-column grid)
- Encounter metadata: number, case, admission, department, physician, diagnosis, procedure
- Sync status badge (synced/pending/manual/failed)
- TrakCare source badge
- "Sync from TrakCare" button (conditional)
- Selected state

**API**: 
- `GET /api/.../patients/{id}/encounters`
- `POST /api/.../encounters/{id}/sync-trakcare`

**Critical Requirements**:
- Patient context visible at all times
- Sync button only shown if TrakCare sync available
- Selected encounter persists throughout workflow

---

### 4. Consent / Procedure Selection
**Purpose**: Select IMC-approved consent template

**Key Elements**:
- IMC library consent cards
- IMC Approved badge (gold, mandatory)
- Active/Inactive status
- Template mapping status (critical)
- Version, language, type indicators
- Missing mapping warning (red, blocks progress)
- Search/filter controls

**API**:
- `GET /api/.../imc-library`
- `GET /api/.../imc-library/resolve`

**Critical Requirements**:
- ONLY show Active + IMC-approved templates
- Missing mapping = CRITICAL blocker
- Template context persists

---

### 5. Anesthesia Decision
**Purpose**: Select anesthesia type and determine review requirement

**Key Elements**:
- 5 anesthesia option cards (3+2 grid):
  - No Anesthesia (gray, no review)
  - Local Anesthesia (blue, optional review)
  - Regional Anesthesia (amber, review required)
  - General Anesthesia (red, high-priority review)
  - Sedation/MAC (amber, review required)
- Each card shows: icon, title (EN+AR), description, review badge
- Selected state: blue border, background tint
- Review requirement panel (if applicable)

**Critical Requirements**:
- Clinically clear descriptions
- Review requirement visually obvious
- Selected type updates validation panel
- Review status tracked throughout workflow

---

### 6. Dynamic Physician Disclosure
**Purpose**: Structured clinical authoring of consent disclosures

**Key Elements**:
- 10 disclosure sections (bilingual EN/AR pairs):
  1. Procedure Description (CRITICAL)
  2. Reason for Procedure (CRITICAL)
  3. Patient-Specific Risks (CRITICAL)
  4. Expected Outcomes
  5. Alternatives Discussed (CRITICAL)
  6. Refusal Risks (CRITICAL)
  7. Special Warnings
  8. Preparation Instructions
  9. Post-Procedure Instructions
  10. Follow-up Notes

- Each field shows indicators:
  - 👁 Appears in patient view
  - 📄 Appears in PDF
  - 📦 Included in evidence package
  - 🕒 Tracked in audit trail

- Character count per field
- Real-time validation
- Right-side validation panel (always visible)

**Critical Requirements**:
- EN + AR fields both required for critical sections
- Character limits enforced
- Validation updates in real-time
- Cannot proceed if critical fields missing

**Layout**: 70% main content, 30% validation sidebar

---

### 7. Patient Education Preview
**Purpose**: Preview education materials patient will see

**Key Elements**:
- Procedure overview card
- Benefits section
- Risks section (expandable)
- Alternatives section
- No-treatment option warning
- Before/After procedure guides
- FAQ accordion
- "Ask Your Doctor" CTA
- Language toggle (EN/AR)
- Preview mode toggle

**Critical Requirements**:
- Exact patient-facing content preview
- Language toggle functional
- Content matches template + physician disclosure

---

### 8. Patient Preview Simulation
**Purpose**: Split-screen showing physician controls + patient view

**Layout**:
- **Left Panel (40%)**: Physician authoring controls
  - Edit disclosure button
  - Edit education button
  - Language toggle
  - Preview mode selector
  - Indicators for what appears where

- **Right Panel (60%)**: Patient-facing preview
  - Exact consent document layout
  - All disclosure sections
  - Education materials
  - Signature placeholder
  - PDF/Evidence indicators

**Critical Requirements**:
- 1:1 preview of patient experience
- Clearly marked what enters PDF vs. evidence vs. audit
- Edit controls functional

---

### 9. Completeness Validation Panel (Always-Visible Sidebar)
**Purpose**: Real-time validation checklist, always visible from Disclosure onwards

**Layout**: Right sidebar, 30% width, sticky position

**Elements**:
- Header: "Readiness Checklist"
- Progress: "8 / 15 complete"
- Overall status badge (Critical/Warning/Ready)
- Checklist items:
  - ✓ Green check: Complete
  - ✗ Red X: Critical missing
  - ⚠ Yellow warning: Warning
- Clickable items: jump to field
- "Jump to First Critical" button

**Validation Items** (15 total):
1. Patient identity confirmed ← CRITICAL
2. Encounter selected ← CRITICAL
3. Consent selected ← CRITICAL
4. Template mapping available ← CRITICAL
5. Procedure description (EN) ← CRITICAL
6. Procedure description (AR) ← CRITICAL
7. Anesthesia type selected ← CRITICAL
8. Anesthesia risks disclosed ← CRITICAL
9. Fasting instructions ← WARNING
10. Patient-specific risks (EN) ← CRITICAL
11. Patient-specific risks (AR) ← CRITICAL
12. Alternatives discussed (EN) ← CRITICAL
13. Alternatives discussed (AR) ← CRITICAL
14. PDF readiness verified ← WARNING
15. Contact details confirmed ← CRITICAL

**Critical Rule**: Send button DISABLED until all CRITICAL items complete

---

### 10. Draft PDF Review
**Purpose**: Generate and review draft consent PDF

**Key Elements**:
- "Generate Draft PDF" button (disabled until validations pass)
- PDF Generated badge + timestamp
- Document ID display
- "Open Draft PDF" button (primary, large)
- Summary cards:
  - Patient summary
  - Encounter summary
  - Consent summary (with IMC badge)
  - Anesthesia summary (with review status)
- Evidence readiness panel (right sidebar)
- "Request Anesthesia Review" button (if applicable)
- Next action: "Send to Patient" (may be disabled)

**API**: 
- `POST /api/.../generate-draft` (50+ fields payload)
- `GET /api/.../documents/{id}/pdf`
- `POST /api/.../anesthesia-workflow`

**Critical Requirements**:
- All 50+ API fields must be collected from prior screens
- PDF generation may take 3-10 seconds (show progress)
- Anesthesia review blocks Send if required
- Evidence panel shows all readiness items

---

### 11. Send Secure Link / Patient Notification
**Purpose**: Send secure signing link to patient

**Key Elements**:
- Patient contact confirmation:
  - Phone number (editable)
  - Email (editable)
- OTP method selector (SMS/Email radio)
- Language dropdown (EN/AR/Bilingual)
- Expiration date picker (default 7 days)
- Resend limits display
- Confirmation checkboxes:
  - "Contact details correct"
  - "Document complete and accurate"
- "Send Secure Link" button (PRIMARY, LARGE)
- Disabled state tooltip (if blocked)

**API**: `POST /api/.../documents/{id}/secure-signing`

**Critical Requirements**:
- Button disabled until ALL validations pass
- Disabled tooltip shows specific blocking issues
- Confirmation dialog before send
- Success → navigate to Status Tracking
- Error → show error, allow retry

---

### 12. Status Tracking
**Purpose**: Real-time consent lifecycle tracking

**Key Elements**:
- Patient + Procedure summary header
- Vertical timeline with 11 possible events:
  1. Draft Created ✓
  2. Anesthesia Review Requested (if applicable) ✓
  3. Anesthesia Review Approved (if applicable) ✓
  4. Sent to Patient ✓
  5. Link Opened ✓ (device info)
  6. OTP Verified ✓
  7. Education Viewed ✓ (duration)
  8. Patient Decision Recorded ✓
  9. Digitally Signed ✓ (method)
  10. PDF Generated ⟳ (in progress)
  11. Evidence Package Completed ○ (pending)

- Node states: Completed (green), In Progress (blue), Pending (gray), Failed (red)
- Timestamps per event
- Actor names
- Metadata expansion
- Action buttons:
  - Resend Link (if limit not reached)
  - Revoke Link (danger)
  - View Audit Trail
  - Download Evidence Package (when ready)

**API**: `GET /api/.../documents/{id}/timeline`

**Critical Requirements**:
- Real-time updates (polling or websocket)
- All events timestamped
- Clear visual progression
- Actions contextual to current state

---

### 13. Return Home - Updated Dashboard
**Purpose**: Dashboard after consent sent

**Updates**:
- Sent Awaiting Signature count increased
- New consent card visible in widget
- Recent Activity: "Sent consent to [Patient] - [Time]"
- Stats updated
- Workflow complete state

**Critical**: Dashboard reflects latest consent status immediately

---

📄 **See**: `02_SCREEN_SPECIFICATIONS.md` for detailed layouts, dimensions, states for all screens

---

## Component Library

**16 Core Reusable Components**:

1. **App Shell** - Main layout wrapper
2. **Workflow Stepper** - 8-step progress indicator
3. **Patient Card** - Search result display
4. **Encounter Card** - Encounter selection
5. **Consent Card** - IMC library display
6. **Anesthesia Option Card** - Type selection
7. **Disclosure Field Card** - Bilingual authoring
8. **Validation Badge** - Critical/Warning/Ready
9. **IMC Approved Badge** - Gold template badge
10. **Sync Status Badge** - TrakCare sync state
11. **Readiness Checklist Item** - Validation item
12. **Primary Button** - Main actions
13. **Secondary Button** - Back/Cancel
14. **Alert Banner** - Warnings/Errors/Info
15. **Status Timeline Item** - Lifecycle events
16. **Evidence Package Indicator** - Readiness display

📄 **See**: `03_COMPONENT_LIBRARY.md` for complete component specifications, props, states, dimensions

---

## Design Tokens

**Core Token Categories**:

### Colors
- **Brand**: Royal Blue #002B5C, Luxury Gold #C9A13B, Dark Gray #2F2F2F
- **Semantic**: Primary, Success, Warning, Error, Neutral
- **Status**: Synced, Pending, Failed, Draft, Sent, Signed, Completed
- **IMC**: Gold badge colors

### Typography
- **Family**: Inter (EN), Noto Sans Arabic (AR)
- **Sizes**: 10px - 32px scale
- **Weights**: Normal (400), Medium (500), Semibold (600), Bold (700)
- **Line Heights**: 1.25 - 1.75

### Spacing
- **Scale**: 8px grid (4px - 80px)
- **Card Padding**: 24px
- **Section Gap**: 32px
- **Field Gap**: 12px

### Radius
- **sm**: 4px (badges)
- **md**: 8px (buttons, inputs)
- **lg**: 12px (cards)
- **full**: 9999px (pills, avatars)

### Shadows
- **sm**: 0 1px 2px rgba(0,0,0,0.05)
- **base**: 0 1px 3px rgba(0,0,0,0.1)
- **lg**: 0 4px 6px rgba(0,0,0,0.1)
- **focus**: 0 0 0 2px rgba(0,43,92,0.2)

📄 **See**: `04_DESIGN_TOKENS.md` for complete token system, CSS variables, Tailwind config

---

## API-Action Mapping

**13 API-Backed Actions**:

| Action | Method | Endpoint | UI Trigger |
|--------|--------|----------|------------|
| Search Patient | GET | /patients/search | Search button |
| Load Encounters | GET | /patients/{id}/encounters | Patient selected |
| Sync Encounter | POST | /encounters/{id}/sync-trakcare | Sync button |
| Load IMC Library | GET | /imc-library | Consent screen load |
| Resolve Mapping | GET | /imc-library/resolve | Procedure selected |
| Generate Draft | POST | /generate-draft | Generate PDF button |
| Open PDF | GET | /documents/{id}/pdf | Open PDF button |
| Request Review | POST | /anesthesia-workflow | Request Review button |
| Send Link | POST | /documents/{id}/secure-signing | Send Link button |
| View Timeline | GET | /documents/{id}/timeline | Status screen load |
| View Evidence | GET | /documents/{id}/evidence-package | Evidence panel load |

**Critical Data Flow**:
- 50+ fields collected across workflow
- All fields passed to Generate Draft API
- Validation enforced client-side before API call
- Error handling for all API calls

📄 **See**: `05_API_UI_MAPPING.md` for complete API specifications, payload structures, error handling

---

## Validation Rules

### Critical Items (Block Progress)
**Must be complete to enable "Send to Patient"**:

1. ✓ Patient identity confirmed
2. ✓ Encounter selected
3. ✓ Active IMC-approved consent selected
4. ✓ Runtime template mapping available
5. ✓ Anesthesia type selected
6. ✓ Procedure description (EN)
7. ✓ Procedure description (AR)
8. ✓ Patient-specific risks (EN)
9. ✓ Patient-specific risks (AR)
10. ✓ Alternatives discussed (EN)
11. ✓ Alternatives discussed (AR)
12. ✓ Draft PDF generated
13. ✓ Contact details confirmed
14. ✓ Anesthesia review approved (if type requires review)

### Warning Items (Allow Progress but Show Warning)
1. ⚠ Fasting instructions provided
2. ⚠ Preparation instructions provided
3. ⚠ Post-procedure instructions provided
4. ⚠ PDF readiness verified

### Validation Panel Behavior
- **Always visible**: From Disclosure screen onwards
- **Real-time updates**: As fields are filled
- **Clickable items**: Jump to specific field
- **Color-coded**: Green (complete), Red (critical), Yellow (warning)
- **Overall status**: "Critical Items Pending" / "All Ready"

---

## Accessibility (WCAG 2.1 AA Compliance)

### Color Contrast
- **Text on background**: Minimum 4.5:1
- **Large text**: Minimum 3:1
- **Status colors**: Tested for colorblind users

### Keyboard Navigation
- **Tab order**: Logical, follows visual flow
- **Focus visible**: 2px ring on all interactive elements
- **Skip links**: "Skip to main content"
- **Shortcuts**: Arrow keys for stepper navigation

### Screen Reader Support
- **ARIA labels**: All interactive elements
- **ARIA live regions**: For status updates
- **Form labels**: Explicit associations
- **Error messages**: Announced immediately

### Touch Targets
- **Minimum size**: 44px × 44px
- **Spacing**: 8px between targets
- **Mobile**: Larger tap areas (52px)

### Visual
- **Font size**: Minimum 13px body text
- **Line height**: 1.5 for readability
- **Spacing**: Clear visual separation
- **Icons + Text**: Never icon-only for critical actions

---

## RTL/LTR Guidelines

### Arabic RTL Layout
**Mirror the entire layout horizontally**:

- Sidebar: Right side (instead of left)
- Stepper: Right-to-left progression
- Text alignment: Right-aligned
- Icons: Directional icons flipped (arrows, chevrons)
- Validation panel: Left side (instead of right)
- Form labels: Right-aligned

### Bilingual Field Pairs
- **EN field**: Always shown first (top)
- **AR field**: Always shown second (below)
- **Both required**: For critical disclosure fields
- **Direction**: EN field LTR, AR field RTL

### Language Toggle
- **Position**: Top-right header
- **Options**: EN | AR
- **Switches**: Entire interface language
- **Persists**: Across workflow

### Font Selection
- **English**: Inter
- **Arabic**: Noto Sans Arabic or similar
- **Fallbacks**: System fonts

### Testing Requirements
- **All screens**: Test in both EN and AR
- **Edge cases**: Long Arabic text, number display
- **Right-to-left**: Verify all layouts mirror correctly

---

## Implementation Notes

### Technology Stack
- **Framework**: React 18+ (TypeScript recommended)
- **Styling**: Tailwind CSS v4 or CSS-in-JS with design tokens
- **State Management**: Context API or Redux for workflow state
- **API Client**: Axios or Fetch with error handling
- **Routing**: React Router for screen navigation

### Component Structure
```
src/
  components/
    workflow/
      AppShell.tsx
      WorkflowStepper.tsx
      ValidationPanel.tsx
    cards/
      PatientCard.tsx
      EncounterCard.tsx
      ConsentCard.tsx
      AnesthesiaCard.tsx
    forms/
      DisclosureField.tsx
      BilingualField.tsx
    buttons/
      PrimaryButton.tsx
      SecondaryButton.tsx
    badges/
      ValidationBadge.tsx
      IMCApprovedBadge.tsx
      SyncStatusBadge.tsx
  screens/
    Dashboard.tsx
    PatientSearch.tsx
    EncounterSelection.tsx
    ConsentSelection.tsx
    AnesthesiaDecision.tsx
    DynamicDisclosure.tsx
    PatientEducation.tsx
    PatientPreview.tsx
    DraftPDFReview.tsx
    SendSecureLink.tsx
    StatusTracking.tsx
  types/
    Patient.ts
    Encounter.ts
    Consent.ts
    Validation.ts
  hooks/
    useWorkflowState.ts
    useValidation.ts
    useAPI.ts
```

### State Management Pattern
```typescript
interface WorkflowState {
  currentStep: Step;
  patient: Patient | null;
  encounter: Encounter | null;
  consent: IMCLibraryItem | null;
  anesthesia: AnesthesiaDecision | null;
  disclosures: DisclosureFields;
  validation: ValidationChecklist;
  draftDocument: DraftDocument | null;
}
```

### API Integration Pattern
```typescript
// Centralized API client
const api = {
  searchPatients: (query: string) => 
    GET('/api/.../patients/search', { query }),
  
  loadEncounters: (patientId: string) => 
    GET(`/api/.../patients/${patientId}/encounters`),
  
  generateDraft: (payload: DraftPayload) => 
    POST('/api/.../generate-draft', payload),
  
  // ... all 13 actions
};

// Error handling wrapper
const handleAPICall = async (apiCall: Promise<any>) => {
  try {
    const response = await apiCall;
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: parseError(error) };
  }
};
```

### Validation Implementation
```typescript
const validateCriticalItems = (state: WorkflowState): ValidationResult => {
  const items = [
    { id: 'patient', complete: !!state.patient },
    { id: 'encounter', complete: !!state.encounter },
    { id: 'consent', complete: !!state.consent },
    { id: 'mapping', complete: state.consent?.mappingAvailable },
    { id: 'anesthesia', complete: !!state.anesthesia },
    { id: 'proc-desc-en', complete: !!state.disclosures.procedureDescriptionEn },
    { id: 'proc-desc-ar', complete: !!state.disclosures.procedureDescriptionAr },
    // ... all critical items
  ];
  
  const allCriticalComplete = items.filter(i => i.severity === 'critical')
    .every(i => i.complete);
  
  return { items, allCriticalComplete };
};
```

### Performance Considerations
- **Lazy load**: Screens only when needed
- **Memoization**: React.memo for cards/lists
- **Debounce**: Character count, validation checks
- **Pagination**: Large encounter/consent lists
- **Optimistic UI**: Immediate feedback before API response

### Testing Requirements
- **Unit tests**: All components, 80%+ coverage
- **Integration tests**: API interactions
- **E2E tests**: Complete workflow paths
- **Accessibility tests**: aXe, Lighthouse
- **RTL tests**: Arabic layout verification
- **Visual regression**: Screenshot comparisons

---

## No-Break Constraints

**CRITICAL: These MUST NOT be changed during implementation**:

### Workflow Sequence
✗ Do NOT change the 8-step workflow order
✗ Do NOT skip required steps
✗ Do NOT add new steps without API support
✓ You MAY add sub-steps within existing steps

### API Contracts
✗ Do NOT change API endpoint paths
✗ Do NOT change required API fields
✗ Do NOT invent new API actions
✓ You MAY add optional UI-only fields for better UX

### Validation Logic
✗ Do NOT remove critical validation items
✗ Do NOT allow Send without critical items complete
✗ Do NOT bypass anesthesia review requirement
✓ You MAY add additional warning-level validations

### Data Integrity
✗ Do NOT allow IMC-unapproved consents
✗ Do NOT allow inactive templates
✗ Do NOT proceed without template mapping
✗ Do NOT generate PDF without all required fields
✓ You MAY add data confirmation dialogs

### Security & Compliance
✗ Do NOT remove PHI protection warnings
✗ Do NOT skip physician confirmation before send
✗ Do NOT bypass audit trail logging
✗ Do NOT allow unsigned/unverified document send
✓ You MAY add additional security confirmations

### Bilingual Requirements
✗ Do NOT make Arabic optional for critical fields
✗ Do NOT remove RTL layout support
✗ Do NOT default to English-only
✓ You MAY add transliteration helpers

### Supported Actions Only
✗ Do NOT add "AI auto-fill" buttons (not supported by API)
✗ Do NOT add "Legal approval workflow" (not in current system)
✗ Do NOT add "Clinical decision rules" (not backend-supported)
✗ Do NOT add "Billing/admin settings" (different module)
✓ You MAY add UI-only helpers (templates, copy-paste, formatting)

---

## 10/10 UX Upgrade Rules

**To achieve 10/10 enterprise quality**:

### 1. Clear Clinical Hierarchy
- ✓ Patient context always visible
- ✓ Current step always obvious
- ✓ Next action always clear
- ✓ Progress always shown

### 2. No Cognitive Overload
- ✓ One primary action per screen
- ✓ Maximum 3 secondary actions
- ✓ No more than 7 items per list/menu
- ✓ Clear visual grouping

### 3. Explicit Action States
- ✓ Every button shows disabled/enabled/loading/success/error
- ✓ Disabled buttons explain WHY disabled
- ✓ Loading states show progress
- ✓ Success states confirm completion

### 4. Visible Requirements
- ✓ All missing requirements shown in validation panel
- ✓ Critical items highlighted in red
- ✓ Warning items highlighted in yellow
- ✓ Clickable items jump to field

### 5. Context Preservation
- ✓ Patient info persistent across screens
- ✓ Encounter info persistent
- ✓ Consent template persistent
- ✓ Anesthesia decision persistent
- ✓ Validation state persistent

### 6. Evidence Transparency
- ✓ Always show what appears in patient view
- ✓ Always show what appears in PDF
- ✓ Always show what enters evidence package
- ✓ Always show what enters audit trail

### 7. Bilingual Excellence
- ✓ Arabic RTL layout equals English LTR quality
- ✓ No broken layouts in Arabic
- ✓ Font selection appropriate for each language
- ✓ All critical text translated

### 8. Error Prevention
- ✓ Validation before API calls
- ✓ Confirmation dialogs for critical actions
- ✓ Clear error messages
- ✓ Specific retry instructions

### 9. Structured Authoring
- ✓ Disclosure feels like filling structured form, not writing legal document
- ✓ Clear section headers
- ✓ Character limits shown
- ✓ Required fields marked
- ✓ Helper text provided

### 10. Implementation Feasibility
- ✓ All designs implementable with current backend
- ✓ No fake buttons or actions
- ✓ No invented workflows
- ✓ Practical for engineering team

---

## Quick Start Implementation Checklist

**Phase 1: Foundation** (Week 1-2)
- [ ] Set up design token system (colors, typography, spacing)
- [ ] Create base component library (buttons, badges, cards)
- [ ] Build app shell and layout
- [ ] Implement workflow stepper
- [ ] Create validation panel component

**Phase 2: Core Screens** (Week 3-4)
- [ ] Screen 1: Dashboard
- [ ] Screen 2: Patient Search
- [ ] Screen 3: Encounter Selection
- [ ] Screen 4: Consent Selection
- [ ] Screen 5: Anesthesia Decision

**Phase 3: Authoring** (Week 5-6)
- [ ] Screen 6: Dynamic Disclosure (bilingual fields)
- [ ] Screen 7: Patient Education Preview
- [ ] Screen 8: Patient Preview Simulation
- [ ] Validation panel integration

**Phase 4: Completion** (Week 7-8)
- [ ] Screen 10: Draft PDF Review
- [ ] Screen 11: Send Secure Link
- [ ] Screen 12: Status Tracking
- [ ] Screen 13: Dashboard Updated State

**Phase 5: Polish** (Week 9-10)
- [ ] Arabic RTL layout for all screens
- [ ] Accessibility audit and fixes
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] E2E testing

**Phase 6: Integration** (Week 11-12)
- [ ] Backend API integration
- [ ] Real data testing
- [ ] Physician user testing
- [ ] Bug fixes and refinements
- [ ] Production deployment

---

## Support & Contact

**Design Questions**: Refer to this handoff package  
**Technical Questions**: Check API documentation  
**Clarifications Needed**: Contact product team  

**Document Package Includes**:
- `00_DEVELOPER_HANDOFF.md` (this file)
- `01_PROTOTYPE_MAP.md`
- `02_SCREEN_SPECIFICATIONS.md`
- `03_COMPONENT_LIBRARY.md`
- `04_DESIGN_TOKENS.md`
- `05_API_UI_MAPPING.md`

---

**End of Developer Handoff**  
**Version**: 1.0  
**Last Updated**: 8 June 2026  
**Target**: 10/10 Enterprise-Grade Physician Workflow
