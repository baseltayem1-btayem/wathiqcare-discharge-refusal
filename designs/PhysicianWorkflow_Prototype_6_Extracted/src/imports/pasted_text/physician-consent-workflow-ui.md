Redesign the WathiqCare Informed Consents Physician Workflow UI/UX in Figma while preserving the current production system behavior.

This is a DESIGN-ONLY task. Do not change backend logic, API contracts, workflow sequence, data structure, or feature behavior. The new design must be compatible with the current system and must not introduce buttons, actions, or screens that are not supported by the existing workflow.

Product:
WathiqCare – Enterprise Informed Consents Module

Main workflow:

1. Patient Search
2. Encounter Selection
3. Consent / Procedure Selection
4. Anesthesia Decision
5. Draft PDF Generation
6. Draft PDF Review
7. Patient Notification / Next Action
8. Audit / Evidence Readiness

Primary route to redesign:
`/modules/informed-consents/physician-workflow`

Main production component:
`PhysicianConsentWorkflow`

Main API endpoints that the design must respect:

1. Patient Search API
   Endpoint:
   `GET /api/modules/informed-consents/patients/search`

Purpose:
Search for patient by MRN, name, ID, or case reference.

UI requirements:

* Search input
* Search button
* Loading state
* Empty result state
* Error state
* Patient result cards
* Selected patient state

Required displayed fields:

* Patient name
* MRN
* Case ID / case reference if available
* Date of birth
* Gender
* Contact or identifier if available

Do not redesign this as a free-form unrelated search. It must remain patient search for the consent workflow.

2. Patient Encounters API
   Endpoint:
   `GET /api/modules/informed-consents/patients/[patientId]/encounters`

Purpose:
Load encounters for the selected patient.

UI requirements:

* Encounter list
* Encounter card
* Selected encounter state
* Loading state
* Error state
* Empty state

Required displayed fields:

* Encounter number
* Case number
* Admission date
* Department
* Attending physician
* Physician license if available
* Physician specialty if available
* Diagnosis
* Planned procedure
* Sync status
* Source, e.g. TrakCare/manual

Important:
The physician must clearly understand which encounter is selected before proceeding.

3. Encounter Sync API
   Endpoint:
   `POST /api/modules/informed-consents/patients/[patientId]/encounters/[encounterId]/sync-trakcare`

Purpose:
Sync selected encounter data from TrakCare if required.

UI requirements:

* Sync button only if supported
* Sync status badge
* Loading indicator during sync
* Success state
* Error state

Do not create a fake sync button unless it maps to this behavior.

4. IMC Consent Library API
   Endpoint:
   `GET /api/modules/informed-consents/imc-library`

Purpose:
Load IMC-approved consent templates/library items.

UI requirements:

* Consent/template list
* Search/filter if available
* IMC-approved badge
* Active/inactive status badge
* Template type
* Language
* Version
* Consent title
* Consent summary
* Selected consent state

Important:
Only ACTIVE IMC-approved consent should be presented as ready for draft generation.

5. IMC Library Resolve API
   Endpoint:
   `GET /api/modules/informed-consents/imc-library/resolve`

Purpose:
Resolve the correct consent package/template based on procedure/selection.

UI requirements:

* Matching/resolution status
* Linked template indicator
* Missing mapping warning
* “Runtime template mapping required” warning state

Do not hide missing mapping errors. These are safety-critical.

6. Generate Draft PDF API
   Endpoint:
   `POST /api/modules/informed-consents/generate-draft`

Purpose:
Generate a draft consent document and draft PDF.

Payload fields that must remain represented in the workflow:

* patientId
* patientMrn
* patientCaseId
* encounterId
* encounterNumber
* encounterCaseNumber
* encounterAdmissionDate
* encounterDepartment
* encounterPhysician
* encounterPhysicianLicense
* encounterPhysicianSpecialty
* encounterDiagnosis
* encounterProcedure
* encounterSyncStatus
* encounterSource
* templateId
* templateVersionId
* language
* imcLibraryItemId
* imcLibraryTitleEn
* imcLibraryPublicPath
* imcLibrarySource
* imcLibraryStatus
* imcLibraryTemplateType
* anesthesiaDecision
* anesthesiaReviewRequired
* anesthesiaTypeLabel

UI requirements:

* Generate Draft PDF button
* Disabled state until all required conditions are complete
* Loading state while generating
* Success state after draft creation
* Error state with clear message
* Draft PDF link / Open PDF button
* Document ID display only if appropriate for internal user
* Draft status indicator

Required preconditions:

* Patient selected
* Encounter selected
* Active IMC approved procedure consent selected
* Runtime template mapping available
* Anesthesia decision completed where applicable

7. Draft PDF Route
   Endpoint:
   `GET /api/modules/informed-consents/documents/[id]/pdf?lang=bilingual`

Purpose:
Open or preview the generated draft PDF.

UI requirements:

* Open Draft PDF button
* Review PDF card
* PDF generated status
* Last generated timestamp if available
* Clear message if PDF not generated yet

Do not change the PDF flow. The design must preserve that the draft PDF appears after successful draft generation.

8. Anesthesia Workflow API
   Endpoint:
   `POST /api/modules/informed-consents/documents/[id]/anesthesia-workflow`

Supported actions:

* REQUEST_ANESTHESIA_REVIEW
* START_ANESTHESIA_REVIEW
* APPROVE_ANESTHESIA_REVIEW

Purpose:
Manage anesthesia review workflow after draft document creation.

UI requirements:

* Request Anesthesia Review button
* Start Review state
* Approve Review state
* Review required badge
* Review pending badge
* Approved badge
* Error state if no document exists yet
* Disabled state if draft PDF/document has not been generated
* Clear helper text explaining why the button is disabled

Important:
Do not show anesthesia workflow actions before a consent document exists.

9. Collaboration API
   Endpoint:
   `/api/modules/informed-consents/collaboration`

Purpose:
Supports review/collaboration tasks including anesthesia review.

Design requirements:

* If collaboration panel is shown, include task card style
* ANESTHESIA_REVIEW task type
* Responsible role / reviewer
* Priority
* Message/comment
* Status badge
* Created/updated time

Do not add collaboration actions that are not mapped to existing task behavior.

10. Document Timeline API
    Endpoint:
    `GET /api/modules/informed-consents/documents/[id]/timeline`

Purpose:
Show document history and workflow events.

UI requirements:

* Timeline / audit trail preview
* Event type
* Actor
* Timestamp
* Status change
* PDF generated event
* Anesthesia review event if available

11. Evidence Package API
    Endpoint:
    `GET /api/modules/informed-consents/documents/[id]/evidence-package`

Purpose:
Show evidence readiness for legal/audit purposes.

UI requirements:

* Evidence readiness status
* Audit trail ready badge
* PDF ready badge
* Signature readiness badge
* Anesthesia metadata included indicator
* Legal archive readiness indicator

12. Secure Signing API
    Endpoint:
    `POST /api/modules/informed-consents/documents/[id]/secure-signing`

Purpose:
Create/send secure signing link to patient.

UI requirements:

* Send Patient Notification / Send Secure Link button
* Disabled until draft is generated and required reviews are satisfied
* Delivery status
* Link created state
* Not sent state
* Error state
* Clear “one notification with required consents” concept

Do not design multiple unrelated notification flows. The intended model is one unified patient notification.

Core buttons to redesign and preserve:

1. Search Patient
   Purpose:
   Runs patient search.
   States:

* Default
* Loading
* Disabled when query is empty
* Error

2. Select Patient
   Purpose:
   Selects one patient from results.
   States:

* Default
* Selected
* Disabled if patient data incomplete

3. Load / Select Encounter
   Purpose:
   Loads and selects encounter.
   States:

* Loading encounters
* Selected encounter
* No encounters
* Sync required
* Error

4. Sync Encounter
   Purpose:
   Sync encounter from TrakCare when applicable.
   States:

* Default
* Loading
* Success
* Error

5. Select Consent / Procedure
   Purpose:
   Selects IMC-approved consent package/template.
   States:

* Active
* Selected
* Missing mapping
* Inactive/not allowed

6. Select Anesthesia Type
   Purpose:
   Records physician anesthesia decision.
   Options:

* No anesthesia
* Local anesthesia
* Regional anesthesia
* General anesthesia
* Sedation / monitored anesthesia care if available

States:

* Selected
* Not selected
* Review required
* No review required

7. Generate Draft PDF
   Purpose:
   Calls generate-draft API.
   States:

* Disabled until prerequisites complete
* Loading
* Success
* Error

8. Open / Review Draft PDF
   Purpose:
   Opens generated PDF.
   States:

* Disabled until PDF exists
* Available
* Error if PDF unavailable

9. Request Anesthesia Review
   Purpose:
   Calls anesthesia-workflow API with REQUEST_ANESTHESIA_REVIEW.
   States:

* Disabled before document creation
* Available when anesthesia review is required
* Pending
* Completed
* Error

10. Send Patient Notification / Secure Link
    Purpose:
    Starts patient notification/signing journey.
    States:

* Disabled until required readiness is complete
* Ready
* Sending
* Sent
* Failed

11. Back / Previous Step
    Purpose:
    Navigate previous workflow step.
    Must not reset completed data unless current system does so.

12. Continue / Next Step
    Purpose:
    Move to next step only when current step is valid.
    Disabled state must include a clear reason.

Readiness checklist to design:

* Patient selected
* Encounter selected
* Consent selected
* Runtime template mapped
* Anesthesia decision completed
* Anesthesia review required or not required
* Draft PDF generated
* PDF review available
* Ready for patient notification
* Evidence/audit ready

Important data states to visualize:

* Loading
* Empty
* Error
* Missing required field
* In review
* Review required
* Approved
* Ready
* Not ready
* Draft generated
* Link not sent
* Link sent
* Sync pending
* Sync completed

Anesthesia-specific design requirements:
The Anesthesia Decision screen must be visually strong and clinically clear.

Design cards for:

1. No Anesthesia

* No anesthesia review required
* Appropriate for cases where anesthesia is not applicable

2. Local Anesthesia

* May not require full anesthesia review depending on configuration
* Show short clinical description

3. Regional Anesthesia

* Requires anesthesia review
* Show review-required badge

4. General Anesthesia

* Requires anesthesia review
* Show high-importance review-required badge

5. Sedation / MAC if available

* Requires anesthesia review
* Show monitoring/review message

Selected anesthesia must be reflected in:

* Readiness panel
* Draft PDF review summary
* Anesthesia review requirement
* Patient notification readiness

Draft PDF Review screen requirements:
Show:

* Document generated
* Draft PDF button
* Patient summary
* Encounter summary
* Consent/template summary
* Anesthesia information summary
* Review required status
* Audit/evidence readiness
* Next recommended action

Do not design the PDF itself unless explicitly requested. Only design the screen around PDF review.

Visual design requirements:

* Enterprise healthcare SaaS quality
* Calm, professional, production-grade
* Deep navy primary header/sidebar
* Healthcare blue action color
* Gold accent for important status only
* White cards
* Soft gray/blue clinical background
* Clear typography
* Strong spacing
* No playful illustrations
* No excessive gradients
* No consumer app styling
* High readability
* Suitable for physicians during clinical work

Responsive requirements:
Design:

* Desktop 1440px
* Laptop 1280px
* Tablet 1024px

The layout must support Arabic and English text without breaking.

Accessibility requirements:

* Clear contrast
* Large clickable areas
* Clear disabled states
* Icon plus text, not icon-only for critical actions
* Error messages must be visible and understandable

Do not add:

* Unwired AI buttons
* Decorative buttons
* New clinical decision rules
* New approvals not supported by APIs
* New patient journey steps not in the current workflow
* New external product modules
* Billing, admin, or platform settings inside physician workflow

Expected Figma deliverables:

1. Main Physician Workflow Dashboard
2. Patient Search state
3. Patient selected + Encounter list state
4. Encounter selected state
5. Consent / Procedure selection state
6. Anesthesia Decision state
7. Draft PDF generated / Review state
8. Anesthesia review required state
9. Ready for patient notification state
10. Error / missing requirements state
11. Loading states
12. Tablet responsive version
13. Component variants:

* Button default/loading/disabled/success/error
* Status badge
* Stepper item
* Patient card
* Encounter card
* Consent card
* Anesthesia option card
* Readiness checklist item
* PDF review card

Success criteria:
The final design must look and feel like a premium enterprise hospital platform, while remaining fully compatible with the existing WathiqCare APIs, buttons, states, and workflow.
