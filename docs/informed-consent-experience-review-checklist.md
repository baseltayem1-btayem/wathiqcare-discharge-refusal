# Informed Consent Experience Review Checklist

Use this checklist when reviewing any proposed change to informed consent:

- templates
- PDF layouts
- UI wording
- onboarding or explanatory screens
- patient summaries
- physician-facing consent drafting surfaces
- legal declaration content

This checklist is derived from [docs/informed-consent-experience-governance.md](c:/work/wathiqcare-discharge-refusal-main/docs/informed-consent-experience-governance.md).

It does not authorize workflow or API changes by itself.

## Scope Gate

- [ ] The change is additive and controlled.
- [ ] The change does not refactor workflows.
- [ ] The change does not alter routes.
- [ ] The change does not alter auth or session behavior.
- [ ] The change does not redesign APIs.
- [ ] The change does not modify Prisma schema.
- [ ] The change does not weaken permissions or role protections.
- [ ] The change does not replace the existing PDF engine unless separately approved.

## Patient Trust Review

- [ ] The experience reads as a trust and understanding workflow, not just a signature form.
- [ ] The language helps the patient understand the condition and proposed care.
- [ ] The language makes room for patient participation and questions.
- [ ] The tone is respectful and calm.
- [ ] The content communicates voluntariness clearly.
- [ ] The content avoids intimidation, coercion, or defensive over-lawyering.

## Patient-Centered Language Review

- [ ] The wording is understandable for a non-specialist patient.
- [ ] Expected benefits are described clearly.
- [ ] Risks are described clearly without misleading reassurance.
- [ ] Alternatives are disclosed clearly.
- [ ] Refusal consequences are present when required.
- [ ] No wording implies a guaranteed outcome.
- [ ] No essential legal disclosure has been removed in the name of simplification.

## Layered Disclosure Review

- [ ] Level 1 summary is present or improved in a patient-friendly way.
- [ ] Level 1 explains what the condition is.
- [ ] Level 1 explains what treatment or procedure is proposed.
- [ ] Level 1 explains why treatment is recommended.
- [ ] Level 1 explains major risks in understandable language.
- [ ] Level 2 preserves physician and clinical detail.
- [ ] Level 2 preserves specialty-specific risks and alternatives.
- [ ] Level 3 preserves legal evidence content and execution metadata.

## Bilingual Clarity Review

- [ ] Arabic and English versions are both present where required.
- [ ] Arabic and English communicate the same legal meaning.
- [ ] Bilingual presentation does not create ambiguity or contradiction.
- [ ] Readability is acceptable in both languages.
- [ ] Typography and spacing do not make one language materially weaker or harder to review.

## Design And Readability Review

- [ ] The layout is visually structured and easy to scan.
- [ ] The layout avoids dense, overwhelming text walls where improvement is possible.
- [ ] Cards, sections, dividers, or grouping improve comprehension.
- [ ] Icons or visual indicators, if used, clarify rather than distract.
- [ ] Risk presentation is readable and appropriately emphasized.
- [ ] The overall visual tone feels calm, professional, and enterprise-safe.
- [ ] The result does not regress into a plain Word-style legal form unless legally unavoidable.

## Legal Evidence Review

- [ ] Version identity remains visible or preserved.
- [ ] Audit trail expectations are preserved.
- [ ] Physician declaration remains intact where required.
- [ ] Interpreter declaration remains intact where required.
- [ ] Witness declaration remains intact where required.
- [ ] QR verification readiness is preserved.
- [ ] Evidence identifier readiness is preserved.
- [ ] Timestamp visibility or readiness is preserved.
- [ ] PDPL and privacy acknowledgment remains intact.
- [ ] Withdrawal or refusal acknowledgment remains intact where applicable.

## AI Governance Review

- [ ] Any AI-assisted content is clearly subordinate to physician judgment.
- [ ] Physician approval remains mandatory.
- [ ] Legal-approved template wording remains authoritative.
- [ ] AI-generated risk or explanation content remains auditable.
- [ ] AI-generated content remains reviewable and versioned.
- [ ] No AI feature bypasses required legal wording or mandatory disclosures.

## Safety Gate

- [ ] Required Saudi legal disclosures remain present.
- [ ] Medico-legal protections are not weakened.
- [ ] Patient rights disclosures are preserved.
- [ ] Risk disclosures are preserved.
- [ ] Refusal consequences are preserved where applicable.
- [ ] Physician accountability is preserved.
- [ ] The change improves readability without reducing legal defensibility.

## Approval Notes

- Review owner: ____________________
- Area reviewed: UI / Template / PDF / Copy / AI / Other
- Date: ____________________
- Outcome: Approved / Approved with revisions / Rejected
- Notes: ____________________
