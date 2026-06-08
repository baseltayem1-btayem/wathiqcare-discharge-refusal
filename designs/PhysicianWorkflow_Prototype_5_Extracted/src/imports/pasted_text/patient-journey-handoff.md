Excellent. The Physician Workflow 10/10 Design Handoff Package is accepted as Phase 1.

Now proceed with Phase 2:

Create a separate complete WathiqCare Patient Journey 10/10 Design Handoff Package.

Important:
Do not mix the patient journey with the physician workflow documents.
Create a separate directory:

`/DESIGN_HANDOFF_PATIENT_JOURNEY/`

This package must be mobile-first and must support:

* iPhone / iOS
* Android mobile
* Tablet
* Desktop web
* Mac / PC browser

The patient journey must match the same 10/10 quality level as the Physician Workflow package.

Create the following files:

1. `README.md`
   Package overview and quick start guide.

2. `00_PATIENT_JOURNEY_DEVELOPER_HANDOFF.md`
   Main handoff document. This is the starting point for engineering and design review.

3. `01_PATIENT_JOURNEY_MAP.md`
   Complete patient journey map from secure link opening until completion, refusal, expired link, revoked link, and resume session states.

4. `02_PATIENT_SCREEN_SPECIFICATIONS.md`
   Detailed screen-by-screen specifications for all patient screens.

5. `03_PATIENT_COMPONENT_LIBRARY.md`
   Reusable patient-facing component specifications.

6. `04_PATIENT_DESIGN_TOKENS.md`
   Patient UI design tokens for mobile, tablet, and desktop.

7. `05_PATIENT_API_UI_MAPPING.md`
   Patient journey API/action-to-UI mapping.

8. `06_PATIENT_LEGAL_EVIDENCE_MAPPING.md`
   Legal, evidence, audit trail, PDF, and patient acknowledgment mapping.

9. `07_PATIENT_ACCESSIBILITY_RTL_LTR_GUIDE.md`
   Accessibility, Arabic RTL, English LTR, elderly-user, and mobile usability guide.

10. `PATIENT_JOURNEY_HANDOFF_SUMMARY.md`
    Executive summary of the full patient journey package.

Patient journey screens to fully specify:

1. Secure Link Landing

* Hospital identity
* WathiqCare secured-by identity
* Secure session message
* Consent package title
* Expiration/validity status
* Language selector
* Privacy / PHI note
* Continue button

2. OTP / Identity Verification

* Masked mobile number
* OTP input
* Resend OTP
* Expiry countdown
* Wrong OTP error
* Expired OTP state
* Verification success state

3. Patient Role Selection

* Patient
* Guardian / ولي
* Legal representative / وصي
* Parent for minor
* Authorized representative
* Role explanations
* Disabled continue until role selected

4. Guardian / Representative Details

* Name
* ID/Iqama number
* Mobile number
* Relationship to patient
* DOB if required
* Representation document upload
* Document type
* Upload success/error
* Legal attestation checkbox

5. Consent Package Overview

* Procedure consent
* Anesthesia consent if applicable
* Blood transfusion consent if applicable
* Photography/telemedicine/data consent if applicable
* Patient education package
* Required/optional status
* Reading time
* Completion status

6. Patient Education

* Procedure overview
* Why procedure is recommended
* Benefits
* Common risks
* Serious risks
* Alternatives
* No-treatment option
* Before procedure
* After procedure
* Recovery instructions
* FAQ
* Ask doctor / request clarification CTA if supported
* Education viewed indicator

7. Consent Review

* Plain-language summary
* Procedure details
* Physician disclosure
* Patient-specific risks
* Alternatives
* Refusal risks
* Anesthesia information if applicable
* Hospital/legal acknowledgment
* PDF preview or document view
* Read and understood acknowledgment

8. Anesthesia Consent Review

* Type of anesthesia
* Review required/completed status
* Risks
* Alternatives
* Fasting instructions
* Allergy/airway notes if available
* Recovery/monitoring instructions
* Patient acknowledgment
* Warning if anesthesia review pending

9. Patient Clarification Request

* I have a question
* Request doctor clarification
* I need help understanding
* Structured question field
* Submit clarification request
* Success state
* Awaiting clarification state

10. Decision Screen

* Accept / consent
* Refuse / decline
* Request clarification before deciding
* Refusal acknowledgment
* Refusal risks
* Optional refusal reason
* Confirm refusal
* Continue to signature after acceptance

11. Signature Screen

* Patient/guardian name confirmation
* Signature area
* OTP confirmation if required
* Checkbox acknowledgments
* Confirm signature
* Loading
* Error
* Success

12. Completion Screen

* Consent completed
* Consent status
* PDF generated message
* Patient copy availability
* Reference number
* Timestamp
* Hospital help/contact note
* View/download patient copy if supported

13. Resume Journey / Patient Status

* Completed items
* Pending items
* Resume where left off
* Already completed state
* Link expired state
* Link revoked state

14. Error / Edge States

* Invalid token
* Expired link
* Revoked link
* OTP failed
* Too many OTP attempts
* Session locked
* Document unavailable
* PDF unavailable
* Network error
* Consent package not ready
* Anesthesia review pending
* Guardian document rejected
* Patient requested clarification
* Consent refused
* Consent already signed

15. Patient Copy / PDF Viewer

* Patient copy label
* Document reference
* View/download state
* Verification QR / evidence verification indicator if applicable
* Language toggle if bilingual
* Draft vs signed final copy distinction

Device requirements:
Create specifications for:

* iPhone 390px
* Android 360px / 412px
* Tablet 768px / 1024px
* Desktop 1280px / 1440px

Design principles:

* Mobile-first
* Arabic-first RTL excellence
* English LTR support
* Simple for elderly patients
* Clear legal seriousness
* Minimal cognitive load
* Large touch targets
* Sticky bottom CTA on mobile
* Side progress panel on tablet/desktop
* No clutter
* No marketing style
* No playful consumer visuals

Use WathiqCare colors:

* Royal Blue: #002B5C
* Luxury Gold: #C9A13B
* Dark Gray: #2F2F2F
* White: #FFFFFF
* Light Blue: #4B9CD3
* Soft clinical background: #F4F7FB

Patient components to specify:

* Secure session header
* Hospital / WathiqCare identity lockup
* Language selector
* OTP input
* OTP countdown
* Role selection card
* Guardian form
* Document upload card
* Consent package item card
* Education card
* Risk disclosure card
* Alternative option card
* Progress stepper
* Acknowledgment checkbox
* Decision card
* Refusal warning card
* Signature card
* Completion receipt card
* Patient PDF viewer card
* Error state card
* Expired link state
* Revoked link state
* Support/help card
* Sticky mobile CTA
* Tablet/desktop side progress panel

Backend/action mapping must respect only supported WathiqCare patient actions:

* Open secure link
* Verify OTP
* Select role
* Submit guardian/representative details
* Upload supporting document
* View consent package
* View patient education
* Review consent
* Review anesthesia if applicable
* Request clarification
* Accept consent
* Refuse consent
* Sign consent
* View/download patient copy if available
* Resume session
* See expired/revoked/error state

Legal/evidence mapping:
Every major patient action must indicate whether it is recorded in:

* Audit trail
* Evidence package
* Final PDF
* Hospital legal record

Final output:
Create the full Patient Journey 10/10 Design Handoff Package with all listed files and a clear summary.

Do not ask whether to proceed.
Proceed now.
