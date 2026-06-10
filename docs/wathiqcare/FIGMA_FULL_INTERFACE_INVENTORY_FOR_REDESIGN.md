# WathiqCare – ملف كامل للواجهات والنوافذ والصفحات لتعديل التصميم في Figma

## الهدف
إعداد ملف مرجعي كامل لمصمم Figma لتعديل جميع الواجهات الأساسية والفرعية في Doctor Workspace، مع ضمان أن التصميم القادم يغطي كل الحالات العملية، وليس مجرد صفحات عرض ثابتة.

---

# Design System

## Identity
- Product: WathiqCare
- Workspace: Doctor Workspace
- Module: Informed Consents
- Target: Enterprise clinical-legal workflow

## Colors
- Deep Navy: #002B5C
- Healthcare Blue: #1976D2
- Light Healthcare Blue: #4B9CD3
- Gold: #C9A13B
- Slate: #2F2F2F
- White: #FFFFFF
- Soft Background: #F4FAFC
- Border: #D9EAF3
- Success: #16A34A
- Warning: #F59E0B
- Danger: #DC2626

## Fonts
- English: Inter
- Arabic: IBM Plex Sans Arabic

## Layout
- Left sidebar fixed
- Top header fixed
- Main content max-width aligned
- Cards responsive
- All fields must fit inside screen
- No overflow text
- No clipped buttons
- Arabic RTL support
- English LTR support

---

# Global Components Required in Figma

## Sidebar
States:
- Default
- Active item
- Hover
- Collapsed
- RTL Arabic
- User profile block

Items:
1. Create Consent
2. Pending Consents
3. Consent Records
4. Approved Forms
5. Anesthesia Queue
6. Patient Education
7. Compliance Review
8. Audit Trail
9. Settings & Support

## Header
Components:
- Page title
- Page subtitle
- Patient search
- Language toggle
- Notification icon
- User avatar
- User dropdown

States:
- Empty search
- Search typing
- Search results dropdown
- No results
- Loading
- Arabic mode

## Cards
Variants:
- Navigation card
- Metric card
- Action card
- Status card
- Warning card
- Completed card
- Disabled card

## Forms
Components:
- Text input
- Search input
- Select dropdown
- Date picker
- Radio group
- Checkbox
- Textarea
- Attachment upload
- Phone input
- Email input
- Required field
- Error field
- Disabled field

## Modals / Drawers
Required:
- Patient search modal
- Encounter selection drawer
- Template preview modal
- PDF preview modal
- Send link confirmation
- Reminder confirmation
- Legal support request
- Technical ticket
- Export evidence package
- Missing items drawer
- Signature evidence drawer

---

# Page 1 – Create Consent

## Main Screen
Sections:
1. Hero banner
2. Consent Creation Steps
3. Right-side workflow cards
4. Continue / Save Draft actions

## Required Sub-Screens
### 1. Patient & Encounter
Fields:
- Patient search
- MRN
- Patient name
- National ID / Iqama
- DOB
- Mobile
- Email
- Encounter selection
- Department
- Treating physician

States:
- No patient selected
- Patient found
- Multiple matches
- Encounter not found
- Validation error

### 2. Consent Category
Fields:
- Category cards
- Specialty filter
- Search category

States:
- Category selected
- Category disabled
- No templates available

### 3. Template Selection
Fields:
- Template list
- Template version
- Language
- Approval status
- Preview button
- Select button

States:
- Preview open
- Template selected
- Template retired
- Template not approved

### 4. Procedure Details
Fields:
- Procedure name
- Diagnosis
- Laterality
- Body site
- Procedure notes
- Risks summary
- Alternatives summary

States:
- Missing required fields
- Saved
- Draft

### 5. Anesthesia Decision
Fields:
- Anesthesia applicable
- Anesthesia type
- Anesthesiologist required
- Send for anesthesia review
- Review status

States:
- Not applicable
- Pending anesthesia
- Completed anesthesia
- Blocked until review

### 6. Patient Education
Fields:
- Education package
- Language
- Attach material
- Send education
- Patient acknowledgement status

States:
- Required education missing
- Sent
- Viewed
- Acknowledged

### 7. Physician Review
Sections:
- Patient details
- Procedure details
- Template details
- Anesthesia details
- Education status
- Compliance checklist
- Physician confirmation

### 8. Send to Patient
Fields:
- Mobile number
- Email
- Send SMS
- Send email
- Generate secure link
- Expiry period

States:
- Link generated
- SMS sent
- Email sent
- Failed send
- Resend allowed
- Resend locked

---

# Page 2 – Pending Consents

## Main Screen
Cards:
1. Awaiting Patient Signature
2. Physician Review Pending
3. Send Reminder

## Required Table
Columns:
- Patient
- MRN
- Encounter
- Template
- Status
- Last action
- Expiry
- Assigned physician
- Actions

Actions:
- Open case
- Resend link
- Send reminder
- Cancel link
- View audit

States:
- Empty queue
- Loading
- Overdue
- Expired link
- Action success
- Action failure

---

# Page 3 – Consent Records

## Main Screen
Cards:
1. Signed Records
2. Evidence Package
3. Search Archive

## Required Search Filters
- MRN
- Patient name
- Encounter
- Template
- Physician
- Date range
- Status

## Required Table
Columns:
- Patient
- MRN
- Encounter
- Consent title
- Signed date
- Physician
- Status
- Evidence
- Actions

Actions:
- View PDF
- Download PDF
- Export evidence
- Open audit

---

# Page 4 – Approved Forms

## Main Screen
Cards:
1. General Surgery Forms
2. Anesthesia Forms
3. Template Governance

## Template Library View
Columns:
- Template name
- Category
- Specialty
- Version
- Language
- Approval status
- Approval date
- Actions

Actions:
- Preview
- Select
- View history

States:
- Approved
- Draft
- Retired
- Superseded

---

# Page 5 – Anesthesia Queue

## Main Screen
Cards:
1. Queued Reviews
2. Completed Reviews
3. Clinical Controls

## Queue Table
Columns:
- Patient
- MRN
- Encounter
- Procedure
- Surgeon
- Requested date
- Priority
- Status
- Actions

Actions:
- Open review
- Assign
- Complete review
- Return to physician
- Block / release

States:
- Pending
- Assigned
- Completed
- Returned
- Blocked

---

# Page 6 – Patient Education

## Main Screen
Cards:
1. Education Library
2. Patient Materials
3. Completion Status

## Library View
Columns:
- Material name
- Procedure
- Language
- Version
- Approval status
- Actions

Actions:
- Preview
- Attach
- Send
- Track acknowledgement

States:
- Attached
- Sent
- Viewed
- Acknowledged
- Missing acknowledgement

---

# Page 7 – Compliance Review

## Main Screen
Cards:
1. Readiness Score
2. Missing Items
3. Legal Controls

## Compliance Detail View
Sections:
- Required fields status
- Template approval status
- Anesthesia completion
- Education acknowledgement
- Patient contact verification
- Signature readiness
- Audit readiness

States:
- Ready
- Not ready
- Warning
- Blocking issue

---

# Page 8 – Audit Trail

## Main Screen
Cards:
1. Activity Timeline
2. Signature Evidence
3. Export Audit

## Timeline
Events:
- Case created
- Patient selected
- Encounter selected
- Template selected
- Procedure saved
- Anesthesia requested
- Anesthesia completed
- Education sent
- Link sent
- OTP verified
- Patient signed
- PDF generated
- Evidence exported

## Signature Evidence
Fields:
- Signer name
- Signer type
- Timestamp
- OTP status
- IP address
- Device
- Signature image
- Verification code

---

# Page 9 – Settings & Support

## Main Screen
Cards:
1. Legal Support
2. Technical Ticket
3. Workspace Settings

## Legal Support Form
Fields:
- Related case
- Legal issue type
- Question
- Priority
- Attachment
- Submit

## Technical Ticket Form
Fields:
- Issue type
- Description
- Screenshot
- Browser info
- Priority
- Submit

## Workspace Settings
Fields:
- Language
- Default specialty
- Default department
- Notification preference
- Save changes

---

# Mobile / Responsive Requirements
- Sidebar becomes drawer
- Header search collapses
- Cards become single column
- Tables become stacked cards
- Buttons full width where needed
- Arabic RTL fully supported
- No horizontal overflow

---

# Figma Deliverables
1. Full desktop frame for every main page
2. Full desktop frame for every sub-page
3. Modal and drawer components
4. Empty / loading / error states
5. Arabic RTL versions
6. Mobile responsive versions
7. Component library
8. Design tokens
9. Button states
10. Form validation states
11. Table states
12. Export-ready developer handoff

---

# Critical UX Corrections
- Reduce excessive empty space
- Align hero banners with content grid
- Make cards actionable, not decorative
- Add real data tables below cards
- Add clear primary action per page
- Add breadcrumbs or workflow progress where needed
- Add status badges
- Add missing field indicators
- Add audit evidence visibility
- Add confirmation before irreversible actions
- Ensure all text fits inside cards and fields
- Ensure Arabic labels are not clipped
- Use consistent spacing and radius
- Make patient search central to workflow

