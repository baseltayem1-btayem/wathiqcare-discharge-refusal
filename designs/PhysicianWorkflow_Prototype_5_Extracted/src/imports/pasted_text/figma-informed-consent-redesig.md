Stop implementation in code. This task is for Figma design only.

You are not required to create React components, TypeScript files, code placeholders, routes, or frontend implementation files.

The required output is a complete high-fidelity Figma prototype for the WathiqCare Informed Consents Physician Workflow, not a coded prototype.

Please redesign the actual UI/UX screens in Figma only, using the existing WathiqCare physician workflow as the product structure.

Important correction:
Do not create placeholder screens. Every required workflow screen must be fully designed in Figma.

Required Figma screens:

1. Home / Physician Workflow Dashboard

* Pending consents
* Draft consents
* Sent consents
* Awaiting patient signature
* Completed consents
* Alerts for incomplete disclosures
* Quick access to start new consent

2. Patient Search

* MRN/name/search field
* Search results
* Patient card
* PHI protection warning
* Empty/loading/error states

3. Encounter Selection

* Encounter cards
* Encounter number
* Case number
* Department
* Attending physician
* Diagnosis
* Planned procedure
* TrakCare sync status
* Selected encounter state

4. Consent / Procedure Selection

* IMC-approved consent library card
* Active/inactive status
* Template mapping status
* Consent version/language
* Missing mapping warning
* Selected consent state

5. Anesthesia Decision

* No anesthesia
* Local anesthesia
* Regional anesthesia
* General anesthesia
* Sedation / monitored anesthesia care
* Review required badge
* Selected anesthesia state
* Anesthesiologist review status

6. Dynamic Physician Disclosure

* Procedure description
* Reason for procedure
* Patient-specific risks
* Alternatives discussed
* Refusal risks
* Special warnings
* Preparation instructions
* Post-procedure instructions
* Arabic and English fields
* Indicators showing whether each disclosure appears in:

  * Patient view
  * PDF
  * Evidence package
  * Audit trail

7. Patient Education Preview

* Procedure overview
* Benefits
* Risks
* Alternatives
* No-treatment option
* Before procedure
* After procedure
* FAQ
* Ask doctor CTA

8. Patient Preview Simulation

* Split-screen layout
* Left: physician authoring controls
* Right: patient-facing preview
* Show what patient will read
* Show what will appear in PDF
* Show what enters evidence package

9. Completeness Validation Panel

* Always-visible right-side validation panel
* Critical / Warning / Ready states
* Missing procedure
* Missing anesthesia where required
* Missing patient-specific disclosure
* Missing risks
* Missing alternatives
* Missing Arabic text
* Missing English text
* PDF readiness pending

10. Draft PDF Review

* Draft PDF generated state
* Open PDF button
* Patient summary
* Encounter summary
* Consent summary
* Anesthesia information summary
* Evidence readiness indicator
* Audit readiness indicator

11. Send Secure Link / Patient Notification

* Patient phone/email confirmation
* OTP signing method
* Language selection
* Expiration date
* Resend limits
* Final physician confirmation
* Send button disabled until validation passes

12. Status Tracking

* Draft
* Sent
* Opened
* OTP Verified
* Education Viewed
* Decision Recorded
* Signed
* PDF Generated
* Evidence Package Completed
* Resend option
* Revoke option
* Audit trail indicator

13. Home / Return State

* Physician returns to dashboard after sending
* Updated consent status
* Active consent count updated
* Recent activity visible

Design system requirements:

* Create reusable Figma components:

  * Patient card
  * Encounter card
  * Consent card
  * Anesthesia option card
  * Disclosure card
  * Validation badge
  * Readiness checklist item
  * Status timeline item
  * PDF review card
  * Evidence indicator
  * Primary/secondary/disabled/loading buttons
  * Clinical status chips

API and workflow constraints:
The design must preserve the existing workflow and must not invent unsupported behavior.

The design must visually support these existing API-backed actions:

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

Do not add fake buttons, fake AI actions, fake approvals, or unsupported workflows.

Visual direction:

* Enterprise hospital system
* Epic / Mayo / Cleveland Clinic level clinical clarity
* Not a marketing website
* Not a consumer mobile app
* Desktop-first and tablet-ready
* Arabic RTL and English LTR
* WathiqCare colors:

  * Royal Blue: #002B5C
  * Luxury Gold: #C9A13B
  * Dark Gray: #2F2F2F
  * White: #FFFFFF
  * Light Blue: #4B9CD3

Deliverables required in Figma:

1. Full clickable prototype
2. Desktop 1440px version
3. Tablet 1024px version
4. Arabic RTL key screens
5. English LTR key screens
6. Component library
7. UX notes page explaining:

   * Clinical workflow logic
   * Legal defensibility logic
   * Validation rules
   * Accessibility considerations
   * Developer handoff notes

Do not respond with code files. Do not say screens are placeholders. Produce the Figma prototype screens completely.
