You are a senior enterprise healthcare UI/UX designer working inside Figma.

Your task is to redesign and upgrade the current WathiqCare Informed Consents Physician Workflow to a 10/10 enterprise-grade hospital platform design.

This is a Figma design task only.

The purpose of this Figma work is to guide the improvement of the current live platform that has already been developed. Therefore, the design must be practical, implementable, and aligned with the current system architecture, APIs, workflow, buttons, and screen logic.

Do not create a marketing website.
Do not create a conceptual product unrelated to the current system.
Do not invent new backend features.
Do not create placeholder screens.
Do not produce code.
Do not redesign the workflow into a different journey.

Product Context:
WathiqCare is an enterprise healthcare legal-tech platform for hospital informed consent workflows. It supports physician-side consent issuance, anesthesia decision routing, patient education, draft PDF generation, secure patient notification, OTP signing, evidence package generation, audit trail, and legal documentation.

Current platform workflow to preserve:

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
13. Return to Home / Dashboard updated state

Design objective:
Raise the UI/UX quality to 10/10 by making the physician workflow feel like a premium enterprise hospital system comparable to Epic, Mayo Clinic, Cleveland Clinic, and mature clinical SaaS platforms.

The design must be:

* Enterprise-grade
* Hospital-ready
* Legal/evidence-ready
* Clinically clear
* Fast for physicians
* Compact but readable
* Desktop-first
* Tablet-ready
* Arabic RTL excellent
* English LTR excellent
* Practical for engineering implementation

Brand colors:
Use WathiqCare / Tayem & Co approved colors:

* Royal Blue: #002B5C
* Luxury Gold: #C9A13B
* Dark Gray: #2F2F2F
* White: #FFFFFF
* Light Blue: #4B9CD3

Visual style requirements:

* Deep navy enterprise header or sidebar
* Clean white clinical cards
* Soft clinical background
* Healthcare blue for primary actions
* Gold only for important status, legal readiness, or high-priority emphasis
* No playful illustrations
* No unnecessary gradients
* No consumer mobile-app styling
* High readability
* Clear hierarchy
* Professional clinical typography
* Strong spacing system
* Clear status badges
* Clear validation states

Design system requirement:
Create a reusable Figma component library that engineering can use to update the current platform.

Required reusable components:

1. App shell / enterprise layout
2. Physician dashboard card
3. Patient search input
4. Patient card
5. Encounter card
6. Consent / procedure card
7. IMC-approved consent badge
8. Template mapping badge
9. Anesthesia option card
10. Disclosure field card
11. Arabic / English field pair
12. Validation badge
13. Critical / Warning / Ready state badge
14. Readiness checklist item
15. Workflow stepper item
16. Status timeline item
17. PDF review card
18. Evidence package indicator
19. Audit trail indicator
20. Primary button
21. Secondary button
22. Disabled button
23. Loading button
24. Error alert
25. Success alert
26. Warning alert
27. PHI protection banner
28. Right-side validation drawer
29. Split-screen patient preview panel
30. Secure link / notification card

Main screens to design fully:

Screen 1: Home / Physician Dashboard
Design a premium physician workspace showing:

* Today’s pending consents
* Draft consents
* Sent consents
* Awaiting patient signature
* Completed consents
* Incomplete disclosure alerts
* Recent activity
* Start new consent action
* Status tracking summary
* Legal/evidence readiness summary

Screen 2: Patient Search
Include:

* Search by MRN / name / ID
* PHI protection warning banner
* Search loading state
* Empty result state
* Error state
* Patient result cards
* Selected patient state
* Clear “continue” action only after patient selection

Screen 3: Encounter Selection
Include:

* Encounter cards
* Encounter number
* Case number
* Admission date
* Department
* Attending physician
* Physician license if available
* Diagnosis
* Planned procedure
* Sync status
* TrakCare/manual source badge
* Sync encounter action if available
* Selected encounter state
* Missing encounter warning

Screen 4: Consent / Procedure Selection
Include:

* IMC-approved consent library card
* Consent title
* Template version
* Template language
* Active / inactive status
* Runtime mapping status
* Missing mapping warning
* Suggested related consents where applicable
* Selected consent state
* Clear readiness indicator

Screen 5: Anesthesia Decision
This screen must be excellent and clinically clear.

Design anesthesia decision cards for:

* No anesthesia
* Local anesthesia
* Regional anesthesia
* General anesthesia
* Sedation / monitored anesthesia care

Each card must show:

* Clinical description
* Whether anesthesia review is required
* Selected state
* Review required badge
* Review not required state
* Warning/helper text
* Anesthesiologist review status

The selected anesthesia must be reflected in:

* Readiness panel
* Draft PDF review summary
* Evidence readiness indicator
* Patient notification readiness

Screen 6: Dynamic Physician Disclosure
Design this as structured clinical authoring, not a long legal text box.

Include fields for:

* Procedure description
* Reason for procedure
* Patient-specific risks
* Expected outcomes
* Alternatives discussed
* Refusal risks
* Special warnings
* Preparation instructions
* Post-procedure instructions
* Follow-up notes
* Implant/device notes if applicable

Each disclosure field must show indicators:

* Appears in patient view
* Appears in PDF
* Included in evidence package
* Included in audit trail

Include:

* Arabic field
* English field
* Copy from template action
* Add patient-specific note action
* Smart clinical chips
* Editable statement cards

Screen 7: Patient Education Preview
Show what the patient will see:

* Procedure overview
* Benefits
* Risks
* Alternatives
* No-treatment option
* Before procedure
* After procedure
* FAQ
* Ask doctor CTA
* Language toggle Arabic/English
* Evidence viewed indicator

Screen 8: Patient Preview Simulation
Design split-screen:

* Left side: physician authoring controls and checklist
* Right side: patient-facing preview

The physician must clearly see:

* What the patient will read
* What will appear in the PDF
* What will be included in the evidence package
* What will be tracked in the audit trail

Screen 9: Completeness Validation
Create an always-visible right-side validation panel.

Include validation states:

* Missing procedure
* Missing anesthesia where required
* Missing patient-specific disclosure
* Missing risks
* Missing alternatives
* Missing Arabic text
* Missing English text
* Patient preview not confirmed
* PDF readiness pending
* Secure link not ready
* Evidence package pending

Use severity:

* Critical
* Warning
* Ready

Screen 10: Draft PDF Review
Include:

* Draft PDF generated state
* Open PDF button
* Patient summary
* Encounter summary
* Consent/template summary
* Anesthesia information summary
* Physician disclosure summary
* Evidence readiness indicator
* Audit readiness indicator
* PDF metadata summary
* Next recommended action

Screen 11: Send Secure Link / Patient Notification
Include:

* Patient phone confirmation
* Patient email confirmation
* OTP signing method
* Language selection
* Expiration date
* Resend limits
* Final physician confirmation
* Send button disabled until validation passes
* Clear explanation why sending is blocked
* Sent state
* Failed state
* Link created but not sent state

Screen 12: Status Tracking
Show consent lifecycle:

* Draft
* Sent
* Opened
* OTP Verified
* Education Viewed
* Decision Recorded
* Signed
* PDF Generated
* Evidence Package Completed

Include:

* Timestamps
* Resend option
* Revoke link option
* Audit trail indicator
* Evidence status
* Responsible actor
* Current lifecycle state

Screen 13: Return Home / Dashboard Updated State
After sending the consent:

* Return to physician dashboard
* Active consent count updated
* Recent sent consent visible
* Status updated
* Patient notification status shown
* Next action visible if pending

API and workflow constraints:
The design must visually support the current system actions only.

Supported actions:

* Search Patient
* Select Patient
* Load Encounters
* Select Encounter
* Sync Encounter if available
* Select Consent / Procedure
* Select Anesthesia Type
* Generate Draft PDF
* Open / Review Draft PDF
* Request Anesthesia Review
* Send Secure Signing Link / Patient Notification
* View Timeline / Audit Trail
* View Evidence Package Readiness
* Return to Dashboard

Do not add fake actions.
Do not add unsupported AI buttons.
Do not add fake legal approval workflows.
Do not add fake clinical rules.
Do not add billing/admin/platform settings inside this workflow.

Feature cards:
You may include these as dashboard or workflow guidance cards only if clearly shown as status/supporting areas, not fake actions:

* AI Form Assistant
* Legal Review Status
* Patient Education Materials
* Risk Stratification
* Digital Signature Workflow

If included, each card must show a practical status:

* Available
* Not configured
* In review
* Ready
* Requires attention

These cards must not break the workflow or replace the required steps.

UX quality target: 10/10
To reach 10/10, apply the following:

1. Clear clinical workflow hierarchy
2. No cognitive overload
3. Every primary action has a clear next step
4. Every disabled action explains why
5. Every missing requirement is visible
6. Patient/encounter/consent/anesthesia context is always visible
7. PDF and evidence readiness are clearly visible
8. Arabic and English layouts are professional and equal quality
9. The physician should feel they are completing a structured clinical checklist, not writing a legal document
10. The design must be implementable in the current developed platform

Responsive requirements:
Create:

* Desktop 1440px frames
* Tablet 1024px frames
* Optional mobile review frame 390px only for preview/status, not full authoring

Arabic / English requirements:
Create key screens in:

* English LTR
* Arabic RTL

At minimum, provide Arabic RTL versions for:

* Patient Search
* Encounter Selection
* Consent Builder
* Anesthesia Decision
* Dynamic Disclosure
* Patient Preview
* Validation Panel
* Draft PDF Review
* Send Secure Link

Accessibility requirements:

* Clear contrast
* Large clickable areas
* Text labels with icons
* No icon-only critical actions
* Clear error messages
* Clear disabled states
* Keyboard/tab-order friendly layout assumptions
* Readable font sizes for senior physicians

Developer handoff requirements:
Create a Figma handoff page containing:

1. Screen list
2. Component list
3. Color tokens
4. Typography tokens
5. Spacing system
6. Button states
7. Badge states
8. Validation state rules
9. API-backed action mapping
10. Notes for implementation in the current WathiqCare platform

Final deliverables:

* Complete high-fidelity Figma frames
* Full clickable prototype
* Component library
* Desktop version
* Tablet version
* Arabic RTL key screens
* English LTR key screens
* UX notes page
* Developer handoff page

Do not ask whether to proceed.
Do not provide code.
Do not create placeholder frames.
Proceed to create the complete 10/10 Figma prototype and design system.
