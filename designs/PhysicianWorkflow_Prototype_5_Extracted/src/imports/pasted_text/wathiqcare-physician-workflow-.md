Understood. Since this environment is Figma Make / React-Tailwind and not the native Figma canvas, stop claiming that native Figma frames cannot be created.

Proceed with the best possible deliverable for this environment:

Create a complete WathiqCare Physician Workflow 10/10 Design Handoff Pack that can be used by engineering to upgrade the current developed platform and by designers to recreate the prototype in Figma.

Do not create placeholder screens.
Do not ask whether to proceed.
Do not change backend logic.
Do not invent unsupported features.
Do not build unrelated routes.
Do not redesign the product into a marketing website.

Deliver the following inside the project as structured design documentation and, where useful, matching preview components:

1. Prototype Map
   Create a full prototype map for the physician workflow showing:

* Home / Physician Dashboard
* Patient Search
* Encounter Selection
* Consent / Procedure Selection
* Anesthesia Decision
* Dynamic Physician Disclosure
* Patient Education Preview
* Patient Preview Simulation
* Completeness Validation
* Draft PDF Review
* Send Secure Link / Patient Notification
* Status Tracking
* Return Home / Updated Dashboard State

For each screen, define:

* Entry point
* Exit point
* Primary action
* Secondary actions
* Disabled states
* Error states
* API-backed actions
* Data dependencies
* Readiness requirements

2. Screen-by-Screen UI Specification
   For each of the 13 screens, produce detailed design specs including:

* Frame size: Desktop 1440px
* Tablet size: 1024px
* Main layout structure
* Header content
* Left navigation / stepper behavior
* Main content sections
* Right-side readiness / validation panel
* Cards and tables
* Empty state
* Loading state
* Error state
* Success state
* Arabic RTL considerations
* English LTR considerations

3. Component Library Specification
   Create a reusable component library specification for:

* App shell
* Workflow stepper
* Physician dashboard card
* Patient search input
* Patient card
* Encounter card
* Consent card
* IMC-approved badge
* Template mapping badge
* Anesthesia option card
* Disclosure field card
* Arabic / English field pair
* Validation badge
* Critical / Warning / Ready badge
* Readiness checklist item
* Status timeline item
* PDF review card
* Evidence package indicator
* Audit trail indicator
* Secure link card
* PHI protection banner
* Alert banner
* Primary button
* Secondary button
* Disabled button
* Loading button

For each component, define:

* Purpose
* Props / data fields
* Visual states
* Interaction states
* Color usage
* Spacing
* Typography
* Accessibility rules
* Implementation notes for current WathiqCare platform

4. Design Tokens
   Create a design token page/specification with:

* Color tokens
* Typography tokens
* Spacing tokens
* Radius tokens
* Shadow tokens
* Border tokens
* Status color tokens
* Button tokens
* Card tokens
* Badge tokens
* RTL/LTR layout rules

Use WathiqCare colors:

* Royal Blue: #002B5C
* Luxury Gold: #C9A13B
* Dark Gray: #2F2F2F
* White: #FFFFFF
* Light Blue: #4B9CD3
* Soft clinical background: #F4F7FB or equivalent

5. API-to-UI Mapping
   Create a developer handoff section mapping each UI area to current system behavior.

Must include these API-backed actions:

* Search Patient
* Select Patient
* Load Encounters
* Select Encounter
* Sync Encounter if available
* Select Consent / Procedure
* Resolve IMC consent library mapping
* Select Anesthesia Type
* Generate Draft PDF
* Open / Review Draft PDF
* Request Anesthesia Review
* Send Secure Signing Link / Patient Notification
* View Timeline / Audit Trail
* View Evidence Package Readiness
* Return to Dashboard

Document the required fields visually represented in the workflow:

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

6. 10/10 UX Upgrade Rules
   Create explicit upgrade rules for engineering:

* Every disabled action must show why it is disabled.
* Every critical missing requirement must be visible in the readiness panel.
* Patient, encounter, consent, and anesthesia context must remain visible throughout the workflow.
* The physician must feel they are completing a structured clinical checklist, not writing a legal document.
* PDF readiness and evidence readiness must be visible before sending.
* Arabic and English layouts must be equal quality.
* No fake AI actions.
* No fake legal approvals.
* No unsupported clinical decisions.
* No hidden validation issues.

7. Visual Screen Mockup Descriptions
   For each screen, provide a precise visual description that a Figma designer can reproduce:

* Layout zones
* Card hierarchy
* Button placement
* Status badge placement
* Right-side panel behavior
* Empty/loading/error states
* Clinical alerts
* Arabic RTL adaptation

8. Developer Handoff Page
   Create a final handoff page titled:
   “WathiqCare Physician Workflow 10/10 UI/UX Handoff”

It must include:

* Prototype map
* Screen inventory
* Component inventory
* Token system
* API-action mapping
* Readiness validation rules
* Accessibility notes
* RTL/LTR rules
* Engineering implementation notes
* No-break constraints

9. Optional Working Preview
   If this environment supports React preview, create a non-production preview page only for visualization.
   It must be clearly marked:
   “Design Preview Only — Not Production Logic”

Do not connect it to real backend unless already safely supported.
Do not replace production files unless explicitly instructed.

Final output required:

* Prototype map
* Screen list
* Component library spec
* Design tokens
* Developer handoff page
* Optional design preview if feasible
* Clear statement of what files were created or changed

Proceed now.
