# WathiqCare Informed Consent Experience Governance

## 1) Purpose

This document defines the governance philosophy for any future work related to the WathiqCare informed consent experience, including:

- consent templates
- PDF layouts
- UI wording
- onboarding and instructional copy
- patient-facing summaries
- legal declarations
- AI-assisted drafting support

This is a governance and reference document only.

It does not authorize changes to production workflows, routes, APIs, authentication, permissions, PDF engines, or database schema.

All future implementation aligned to this document must remain:

- additive
- controlled
- non-breaking
- enterprise-safe
- production-safe

## 2) Patient Trust Philosophy

WathiqCare informed consent must not be treated as a basic signature transaction or a defensive legal waiver.

The informed consent experience is a medico-legal trust platform designed to document and demonstrate that the patient:

- understood the condition and proposed care
- participated in the decision process
- had the opportunity to ask questions
- received understandable explanations
- agreed voluntarily
- felt respected throughout the process
- experienced transparency rather than intimidation
- understood risks, alternatives, and consequences

Preferred patient-centered philosophy statement:

> We believe that successful treatment begins with clarity, trust, and informed participation. This consent experience has been designed to help you understand your medical condition, treatment options, expected benefits, possible risks, and available alternatives in a clear and transparent manner.

This statement should guide future patient-facing consent experiences, summaries, onboarding text, and explanatory layers.

## 3) Medico-Legal Goals

The primary objective of informed consent within WathiqCare is not merely obtaining a signature.

The primary objective is to create a defensible, respectful, clinically grounded, and legally auditable record showing that informed participation occurred.

Future informed consent work should support these medico-legal goals:

- preserve patient dignity and trust
- strengthen clinical communication quality
- document patient understanding and voluntary agreement
- preserve authoritative Saudi legal wording where required
- produce reliable legal evidence for review, audit, and dispute defensibility
- support bilingual clarity without weakening legal meaning
- maintain physician accountability for explanation and approval

## 4) Patient-Centered Communication Standards

Future informed consent wording should prefer:

- clear, calm, professional language
- clinically understandable descriptions
- transparent explanation of benefits, risks, and alternatives
- language that supports understanding rather than fear
- visually digestible sections rather than overwhelming text walls
- respectful explanations of patient rights and choices

Future informed consent wording should avoid:

- aggressive legal tone
- frightening or coercive phrasing
- excessive legal intimidation
- visually dense or unreadable presentation
- purely defensive formatting that appears designed only to protect the institution
- language implying guaranteed medical outcomes

Patient-friendly communication must never remove or dilute required legal disclosures, refusal consequences, or clinician responsibilities.

## 5) Layered Disclosure Principles

Enterprise-grade informed consent should evolve toward a layered disclosure model.

### Level 1: Patient-Friendly Summary

This layer should explain, in simple and readable language:

- what the condition is
- what treatment or procedure is proposed
- why treatment is recommended
- expected outcomes or expected benefit
- major risks in understandable language

### Level 2: Clinical Details

This layer should preserve physician-facing and clinically specific detail, including:

- physician explanation
- procedure details
- specialty-specific risks
- alternatives
- recovery expectations
- refusal consequences where applicable

### Level 3: Legal Evidence Layer

This layer should preserve auditable legal evidence and execution metadata, including:

- declarations
- signatures
- timestamps
- interpreter and witness fields where required
- audit metadata
- QR verification
- evidence identifiers

The layered model should improve comprehension without weakening the legal evidence layer.

## 6) Enterprise Design Principles

The informed consent experience should gradually evolve toward:

1. Human-centered medical communication
2. Enterprise clinical editorial design
3. Layered disclosure structure
4. High readability
5. Bilingual clarity
6. Professional healthcare typography
7. Psychological reassurance
8. Structured legal evidence
9. Transparent patient rights disclosure
10. Elegant enterprise visual presentation

Future layouts should prefer:

- structured sections
- visual grouping
- calm and professional spacing
- cards or section containers where appropriate
- icons or signals that clarify meaning
- risk indicators that aid understanding
- expandable or staged disclosure where operationally appropriate
- patient-friendly summaries above dense legal content when safe to do so

The target state is:

WathiqCare
Intelligent Medico-Legal Consent Experience

The target state is not:

- plain hospital forms
- Word-style legal documents
- dense unreadable PDFs

## 7) Legal Evidence Philosophy

Every enterprise-grade informed consent document should be designed to support legally defensible evidence handling.

Target legal evidence capabilities include:

- version control
- audit trail
- physician declaration
- interpreter declaration
- witness declaration
- QR verification
- evidence ID
- timestamp
- OTP verification evidence
- device and IP evidence readiness
- document hash readiness
- PDPL and privacy acknowledgment
- withdrawal acknowledgment where applicable
- refusal acknowledgment where applicable

These elements should be treated as part of the consent evidence architecture, not decorative metadata.

## 8) AI Governance Principles

If AI-assisted informed consent generation or enrichment is introduced or expanded, the following governance rules apply:

- AI assists but does not replace physician judgment.
- Physician approval remains mandatory.
- Legal-approved templates remain authoritative.
- AI-generated specialty risks and explanations must remain auditable.
- Generated content must remain versioned and reviewable.
- AI must not override fixed legal wording without approved governance.
- AI output must not weaken required legal disclosures or patient-rights disclosures.

Any AI contribution to informed consent must remain subordinate to approved legal and clinical governance.

## 9) Safety And Protection Rules

Future informed consent improvements must not:

- remove required Saudi legal disclosures
- weaken medico-legal protections
- remove patient rights content
- remove refusal consequences
- remove risk disclosures
- oversimplify legal obligations into misleading summaries
- create guaranteed-outcome language
- replace physician responsibility with automation

Improved readability is allowed and encouraged.

Reduced legal defensibility is not allowed.

## 10) Implementation Guidance For Future Changes

When future teams generate or improve:

- templates
- PDF layouts
- UI wording
- onboarding screens
- consent summaries
- patient explanations
- legal declarations

they should validate the result against this governance checklist:

- Does the experience increase patient understanding?
- Does it preserve trust and dignity?
- Does it keep required legal and Saudi compliance content intact?
- Does it preserve physician accountability?
- Does it support bilingual clarity?
- Does it improve readability without erasing legal detail?
- Does it strengthen the evidence layer rather than hide it?

For day-to-day review use, see [docs/informed-consent-experience-review-checklist.md](c:/work/wathiqcare-discharge-refusal-main/docs/informed-consent-experience-review-checklist.md).

## 11) Change Control Boundaries

This directive does not authorize, by itself:

- workflow refactoring
- route changes
- authentication changes
- API redesign
- Prisma schema changes
- permission redesign
- PDF engine replacement
- production behavior changes

Any implementation derived from this governance document must be reviewed separately and executed under controlled change management.

## 12) Governance Outcome

WathiqCare informed consent should continue evolving toward a system that documents not only that a patient signed, but that the patient was informed, respected, engaged, and given a transparent understanding of care.

That philosophy is part of the platform's medico-legal architecture and should remain visible in future content, design, and evidence decisions.
