# WathiqCare Physician Workflow - API to UI Mapping

## API-Backed Actions and Required UI Representations

### 1. Search Patient

**API Endpoint**:
```
GET /api/modules/informed-consents/patients/search
```

**Request Parameters**:
```javascript
{
  query: string  // MRN, name, or case ID
}
```

**UI Components Required**:
- Search input field
- Search button
- Loading spinner during API call
- Empty state: "No patients found"
- Error state: "Search failed. Please try again."
- Patient result cards displaying all returned patient data

**UI Data Binding**:
| API Field | UI Display Location | Format |
|-----------|---------------------|--------|
| `id` | Hidden (internal use) | - |
| `mrn` | Patient card: MRN label | MRN-2024-001234 |
| `name` | Patient card: primary name | Large, bold text |
| `nameAr` | Patient card: secondary name | Smaller, below EN name |
| `dateOfBirth` | Patient card: DOB | 15 Mar 1975 |
| `gender` | Patient card: gender icon + label | Male/Female |
| `caseId` | Patient card: case reference | CASE-2024-5678 |
| `contact` | Patient card: contact info | +966 50 123 4567 |

**UI States**:
- Initial: Search input empty, button disabled
- Loading: Spinner shown, "Searching patients..."
- Success with results: Patient cards displayed
- Success with no results: Empty state illustration
- Error: Red alert banner with retry button

---

### 2. Load Patient Encounters

**API Endpoint**:
```
GET /api/modules/informed-consents/patients/{patientId}/encounters
```

**UI Components Required**:
- Encounter card grid (2 columns)
- Loading skeleton cards
- Empty state: "No encounters found for this patient"
- Error state with retry

**UI Data Binding**:
| API Field | UI Display Location | Format |
|-----------|---------------------|--------|
| `id` | Hidden | - |
| `encounterNumber` | Encounter card: header | ENC-2024-456789 |
| `caseNumber` | Encounter card: subheader | CASE-2024-5678 |
| `admissionDate` | Encounter card: date field | 28 May 2024 |
| `department` | Encounter card: department badge | General Surgery |
| `attendingPhysician` | Encounter card: physician name | Dr. Khalid Al-Qahtani, MD |
| `physicianLicense` | Encounter card: license number | SCFHS-12345 |
| `physicianSpecialty` | Encounter card: specialty | General Surgery - FACS |
| `diagnosis` | Encounter card: diagnosis section | Full text |
| `plannedProcedure` | Encounter card: procedure section | Full text |
| `syncStatus` | Sync status badge | synced/pending/manual/failed |
| `source` | Source badge | TrakCare/Manual |

**Badge Color Mapping**:
- `syncStatus: "synced"` → Green badge
- `syncStatus: "pending"` → Amber badge
- `syncStatus: "manual"` → Gray badge
- `syncStatus: "failed"` → Red badge
- `source: "TrakCare"` → Blue badge
- `source: "Manual"` → Gray badge

---

### 3. Sync Encounter from TrakCare

**API Endpoint**:
```
POST /api/modules/informed-consents/patients/{patientId}/encounters/{encounterId}/sync-trakcare
```

**UI Components Required**:
- "Sync from TrakCare" button (only shown if sync available)
- Loading state: spinner replaces button icon
- Success state: green checkmark animation
- Error state: red X, error message, retry button

**UI Button States**:
- Default: "Sync from TrakCare" with RefreshCw icon
- Loading: Spinner animation, text "Syncing...", disabled
- Success: Green background, "Synced ✓", briefly then return to default
- Error: Red border, error icon, "Sync Failed - Retry"

**Encounter Card Update After Sync**:
- `syncStatus` changes from "pending" → "synced"
- Badge updates from amber → green
- All encounter fields refresh with latest TrakCare data

---

### 4. Load IMC Consent Library

**API Endpoint**:
```
GET /api/modules/informed-consents/imc-library
```

**UI Components Required**:
- Consent library cards
- Search/filter controls
- Status badges (active/inactive)
- IMC approved badge
- Mapping status indicator

**UI Data Binding**:
| API Field | UI Display Location | Format |
|-----------|---------------------|--------|
| `id` | Hidden | - |
| `imcLibraryItemId` | Hidden | - |
| `titleEn` | Consent card: primary title | Large, bold |
| `titleAr` | Consent card: secondary title | Below EN |
| `templateId` | Hidden | - |
| `templateVersionId` | Version badge | v2.4.1 |
| `templateType` | Type badge | Surgical Procedure |
| `language` | Language indicator | EN/AR/Bilingual |
| `status` | Status chip | Active/Inactive |
| `imcApproved` | IMC Approved badge (gold) | Show if true |
| `publicPath` | Hidden (for PDF generation) | - |
| `source` | Internal use | - |
| `version` | Version display | v2.4.1 |
| `summary` | Card description | Preview text |
| `mappingAvailable` | Mapping status badge | Green check or red warning |

**Critical UI Rules**:
- If `status: "inactive"` → Card grayed out, not clickable
- If `imcApproved: false` → Do NOT show card (not production-ready)
- If `mappingAvailable: false` → Show red critical warning: "Runtime template mapping required"
- Only `status: "active"` AND `imcApproved: true` consents should be selectable

---

### 5. Resolve IMC Library Mapping

**API Endpoint**:
```
GET /api/modules/informed-consents/imc-library/resolve
```

**Request Parameters**:
```javascript
{
  procedureCode: string,  // From selected encounter
  department: string      // Optional
}
```

**UI Behavior**:
- Called automatically after procedure selection
- Shows matching/resolution status
- Displays linked template indicator
- Critical warning if no mapping found

**UI States**:
- Resolving: "Checking template mapping..."
- Matched: Green badge "Template Mapped ✓"
- Missing: Red critical alert "Runtime template mapping required"

**Error Handling**:
- Missing mapping is a **critical blocker**
- User cannot proceed to draft generation
- Must be visible in validation panel

---

### 6. Generate Draft PDF

**API Endpoint**:
```
POST /api/modules/informed-consents/generate-draft
```

**Request Payload** (50+ fields):
```javascript
{
  // Patient Data
  patientId: string,
  patientMrn: string,
  patientCaseId: string,
  
  // Encounter Data
  encounterId: string,
  encounterNumber: string,
  encounterCaseNumber: string,
  encounterAdmissionDate: string,
  encounterDepartment: string,
  encounterPhysician: string,
  encounterPhysicianLicense: string,
  encounterPhysicianSpecialty: string,
  encounterDiagnosis: string,
  encounterProcedure: string,
  encounterSyncStatus: string,
  encounterSource: string,
  
  // Template Data
  templateId: string,
  templateVersionId: string,
  language: string,
  imcLibraryItemId: string,
  imcLibraryTitleEn: string,
  imcLibraryPublicPath: string,
  imcLibrarySource: string,
  imcLibraryStatus: string,
  imcLibraryTemplateType: string,
  
  // Anesthesia Data
  anesthesiaDecision: string,
  anesthesiaReviewRequired: boolean,
  anesthesiaTypeLabel: string,
  
  // Disclosure Fields (10+ bilingual fields)
  procedureDescriptionEn: string,
  procedureDescriptionAr: string,
  reasonForProcedureEn: string,
  reasonForProcedureAr: string,
  patientSpecificRisksEn: string,
  patientSpecificRisksAr: string,
  expectedOutcomesEn: string,
  expectedOutcomesAr: string,
  alternativesDiscussedEn: string,
  alternativesDiscussedAr: string,
  refusalRisksEn: string,
  refusalRisksAr: string,
  specialWarningsEn: string,
  specialWarningsAr: string,
  preparationInstructionsEn: string,
  preparationInstructionsAr: string,
  postProcedureInstructionsEn: string,
  postProcedureInstructionsAr: string,
  followUpNotesEn: string,
  followUpNotesAr: string
}
```

**UI Components Required**:
- "Generate Draft PDF" button
- Button disabled until ALL required fields complete
- Loading state during generation
- Success state: "PDF Generated ✓"
- Error state: specific error message + retry

**UI State Flow**:
1. **Disabled State**:
   - Button grayed out
   - Tooltip: "Complete all required fields"
   - Validation panel shows missing items

2. **Ready State**:
   - Button blue, enabled
   - Tooltip: "All requirements met"

3. **Loading State**:
   - Spinner icon
   - Text: "Generating PDF..."
   - Button disabled
   - Progress indicator if available

4. **Success State**:
   - Green badge: "PDF Generated ✓"
   - Timestamp shown
   - Document ID displayed
   - "Open Draft PDF" button enabled

5. **Error State**:
   - Red alert banner
   - Error message from API
   - "Retry" button
   - Details logged for support

**Required Preconditions (must be validated in UI)**:
- ✓ Patient selected
- ✓ Encounter selected
- ✓ Active IMC-approved consent selected
- ✓ Runtime template mapping available
- ✓ Anesthesia decision completed
- ✓ All CRITICAL disclosure fields filled (EN + AR)

---

### 7. Open / Review Draft PDF

**API Endpoint**:
```
GET /api/modules/informed-consents/documents/{documentId}/pdf?lang=bilingual
```

**Query Parameters**:
```javascript
{
  lang: 'bilingual' | 'en' | 'ar'
}
```

**UI Components Required**:
- "Open Draft PDF" button (primary, large)
- Opens in new tab/window
- Loading indicator while PDF loads
- Error handling if PDF unavailable

**UI States**:
- Disabled: If PDF not yet generated
- Enabled: After successful draft generation
- Loading: While PDF is being fetched
- Error: If PDF no longer available

**Button Placement**:
- Screen 10: Draft PDF Review, top of page
- Always accompanied by PDF metadata:
  - Generation timestamp
  - Document ID
  - File size (if available)

---

### 8. Anesthesia Workflow API

**API Endpoint**:
```
POST /api/modules/informed-consents/documents/{documentId}/anesthesia-workflow
```

**Supported Actions**:
```javascript
{
  action: 'REQUEST_ANESTHESIA_REVIEW' |
          'START_ANESTHESIA_REVIEW' |
          'APPROVE_ANESTHESIA_REVIEW'
}
```

**UI Components Required**:
- "Request Anesthesia Review" button
- Review status badge
- Reviewer information display
- Approval timestamp

**UI State Flow**:

1. **Not Required**:
   - No review buttons shown
   - Anesthesia summary shows "No review required"

2. **Review Required (not requested)**:
   - "Request Anesthesia Review" button enabled
   - Warning: "Anesthesia review must be requested before sending"

3. **Review Requested**:
   - Badge: "Review Requested" (amber)
   - Button changes to "View Review Status"
   - Cannot send to patient yet

4. **Review In Progress**:
   - Badge: "In Progress" (blue)
   - Reviewer name shown
   - Estimated completion time (if available)

5. **Review Approved**:
   - Badge: "Approved ✓" (green)
   - Approver name + timestamp shown
   - "Send to Patient" button enabled

**Critical UI Rule**:
- If `anesthesiaReviewRequired: true` AND review not approved
  → "Send to Patient" button DISABLED
  → Tooltip explains: "Awaiting anesthesia review approval"

---

### 9. Send Secure Signing Link

**API Endpoint**:
```
POST /api/modules/informed-consents/documents/{documentId}/secure-signing
```

**Request Payload**:
```javascript
{
  patientPhone: string,
  patientEmail: string,
  otpMethod: 'sms' | 'email',
  language: 'en' | 'ar' | 'bilingual',
  expirationDays: number,
  physicianConfirmed: boolean
}
```

**UI Components Required**:
- Patient contact confirmation fields
- OTP method selector (radio buttons)
- Language dropdown
- Expiration date picker
- Confirmation checkboxes
- "Send Secure Link" button (PRIMARY, LARGE)

**UI State Flow**:

1. **Not Ready**:
   - Button disabled
   - Tooltip: "Complete validation checklist"
   - List of blocking issues shown

2. **Ready to Send**:
   - Button enabled, blue
   - All checkboxes checked
   - Contact details confirmed

3. **Sending**:
   - Button shows spinner
   - Text: "Sending..."
   - All inputs disabled

4. **Sent Successfully**:
   - Green success banner
   - "Link sent to patient"
   - Sent timestamp shown
   - Navigate to Status Tracking

5. **Send Failed**:
   - Red error alert
   - Error message from API
   - "Retry" button
   - Contact details editable

**Validation Panel Integration**:
- All critical validation items must be complete
- Disabled state shows:
  - "3 critical items pending"
  - Clickable list to jump to issues

**Confirmation Dialog** (before send):
```
Are you sure you want to send this consent to the patient?

Patient: Ahmed Al-Mansouri
Phone: +966 50 123 4567
Email: ahmed@example.com
Language: Bilingual (EN + AR)
Expiration: 7 days

[Cancel] [Confirm and Send]
```

---

### 10. View Document Timeline

**API Endpoint**:
```
GET /api/modules/informed-consents/documents/{documentId}/timeline
```

**Response Structure**:
```javascript
[
  {
    eventType: string,
    timestamp: string,
    actor: string,
    status: string,
    metadata: object
  }
]
```

**UI Components Required**:
- Vertical timeline with nodes
- Event type labels
- Timestamps
- Actor names
- Status badges
- Metadata expansion (optional)

**Timeline Events**:
- Draft Created
- Anesthesia Review Requested (if applicable)
- Anesthesia Review Approved (if applicable)
- Sent to Patient
- Link Opened (device info in metadata)
- OTP Verified
- Education Materials Viewed (duration in metadata)
- Patient Decision Recorded
- Digitally Signed (signature method in metadata)
- PDF Generated
- Evidence Package Completed

**Timeline Node States**:
- Completed: Green filled circle, checkmark
- In Progress: Blue half-filled circle, spinner
- Pending: Gray empty circle
- Failed: Red filled circle, X

---

### 11. View Evidence Package Readiness

**API Endpoint**:
```
GET /api/modules/informed-consents/documents/{documentId}/evidence-package
```

**Response Structure**:
```javascript
{
  ready: boolean,
  items: {
    auditTrailReady: boolean,
    pdfReady: boolean,
    signatureReady: boolean,
    anesthesiaMetadataIncluded: boolean,
    legalArchiveReady: boolean
  }
}
```

**UI Components Required**:
- Evidence readiness panel (right sidebar)
- Checklist with status icons
- Overall readiness badge
- Download button (if ready)

**UI Display**:
```
Evidence Readiness
✓ Audit trail ready
✓ PDF ready
✓ Signature readiness confirmed
✓ Anesthesia metadata included
✓ Legal archive ready

[All Ready ✓]
[Download Evidence Package]
```

**Status Badge**:
- All true: Green "All Ready ✓"
- Any false: Red "Not Ready"
- Shows count: "3/5 ready"

---

## UI Field Validation Rules

### Critical Fields (Block Draft Generation)
- Patient identity confirmed
- Encounter selected
- Procedure selected
- Procedure description (EN)
- Procedure description (AR)
- Anesthesia type selected
- Patient-specific risks (EN)
- Patient-specific risks (AR)
- Alternatives discussed (EN)
- Alternatives discussed (AR)

### Warning Fields (Allow Draft but Show Warning)
- Fasting instructions
- Preparation instructions
- Post-procedure instructions
- Follow-up notes

### Ready Fields (Optional)
- Special warnings
- Expected outcomes
- Refusal risks

---

## Error Handling UI Requirements

### API Error States

**Network Error**:
```
UI Display:
┌─────────────────────────────────────┐
│ ⚠ Connection Error                  │
│ Unable to connect to server.        │
│ Please check your network.          │
│ [Retry]                             │
└─────────────────────────────────────┘
```

**Validation Error (400)**:
```
UI Display:
┌─────────────────────────────────────┐
│ ✗ Validation Failed                 │
│ • Procedure description (AR) required│
│ • Patient-specific risks missing    │
│ [Fix Issues]                        │
└─────────────────────────────────────┘
```

**Authorization Error (401/403)**:
```
UI Display:
┌─────────────────────────────────────┐
│ 🔒 Session Expired                  │
│ Please log in again to continue.    │
│ [Log In]                            │
└─────────────────────────────────────┘
```

**Server Error (500)**:
```
UI Display:
┌─────────────────────────────────────┐
│ ⚠ Server Error                      │
│ Something went wrong on our end.    │
│ Support has been notified.          │
│ Reference ID: ERR-2024-12345        │
│ [Retry] [Contact Support]           │
└─────────────────────────────────────┘
```

---

## Data Flow Summary

```
User Action → UI Component → API Call → Response → UI Update → Validation Check

Example: Generate Draft PDF
1. User clicks "Generate Draft PDF"
2. Button component enters loading state
3. POST /api/.../generate-draft with 50+ fields
4. API processes and returns {documentId, pdfUrl}
5. UI shows "PDF Generated ✓" badge
6. Document ID and timestamp displayed
7. "Open Draft PDF" button enabled
8. Validation panel updates: "PDF readiness verified ✓"
9. Next action: "Send to Patient" may become enabled (if all validations pass)
```

---

**Document Version**: 1.0  
**Last Updated**: 8 June 2026  
**Purpose**: Complete mapping of API endpoints to UI components and states
