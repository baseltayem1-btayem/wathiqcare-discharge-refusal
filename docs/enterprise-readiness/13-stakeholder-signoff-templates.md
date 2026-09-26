# 13. Stakeholder Sign-Off Templates — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Purpose:** Capture formal approval from each stakeholder group before advancing Clinical Workspace 2.0 beyond its current phase.

---

## 1. How to Use These Templates

1. Each stakeholder reviews the referenced documents and evidence.
2. The stakeholder completes the sign-off statement and signature block.
3. The Enterprise Readiness Lead collects all signed templates and attaches them to the [08-production-readiness-report.md](./08-production-readiness-report.md).
4. No phase advancement (pilot → production → full rollout) may occur without the required sign-offs for that phase.

---

## 2. Sign-Off by Phase

| Phase | Required Sign-Offs |
|-------|-------------------|
| UAT start | UAT Lead, Clinical SME, Engineering Lead |
| UAT complete | UAT Lead, Clinical SME, QA, Legal, Compliance |
| Controlled pilot | Executive Sponsor, Medical Director, CIO, Legal, Compliance, InfoSec, Release Manager |
| Full production | Executive Sponsor, Medical Director, CIO, Legal, Compliance, InfoSec, Quality, Clinical Governance, Operations |
| Hypercare exit | Operations, Support Lead, Clinical SME, Executive Sponsor |

---

## 3. CEO / Executive Sponsor

**Sign-off statement:**

> I confirm that the Clinical Workspace 2.0 Enterprise Readiness Package has been reviewed, the recommendation is understood, and the necessary resources and executive support are committed for the agreed phase.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Executive Readiness Summary | [09-executive-readiness-summary.md](./09-executive-readiness-summary.md) | ☐ |
| Production Readiness Report | [08-production-readiness-report.md](./08-production-readiness-report.md) | ☐ |
| Risk Register | [10-risk-register.md](./10-risk-register.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 4. CIO / Head of IT

**Sign-off statement:**

> I confirm that the technical architecture, deployment approach, rollback plan, monitoring, and security controls for Clinical Workspace 2.0 are acceptable for the agreed phase, and that no production modifications are authorized beyond the approved scope.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Deployment Checklist | [06-deployment-checklist.md](./06-deployment-checklist.md) | ☐ |
| Rollback Checklist | [07-rollback-checklist.md](./07-rollback-checklist.md) | ☐ |
| Operational Runbook | [14-operational-runbook.md](./14-operational-runbook.md) | ☐ |
| Production Validation Matrix | [12-production-validation-matrix.md](./12-production-validation-matrix.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 5. Medical Director / Clinical Governance

**Sign-off statement:**

> I confirm that the clinical workflow, decision-support rules, alert logic, risk disclosures, and refusal handling are clinically sound and align with informed-consent governance standards for the agreed phase.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Clinical Scenarios | [03-clinical-scenarios.md](./03-clinical-scenarios.md) | ☐ |
| Acceptance Criteria | [04-acceptance-criteria.md](./04-acceptance-criteria.md) | ☐ |
| Physician Quick Guide | [training/physician-quick-guide.md](./training/physician-quick-guide.md) | ☐ |
| Known Issues Register | [17-known-issues-register.md](./17-known-issues-register.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 6. Legal Affairs

**Sign-off statement:**

> I confirm that the consent language, refusal workflow, guardian/interpreter/witness attestations, evidence package, and audit trail meet the organization’s legal standards for informed consent documentation and defensibility for the agreed phase.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Legal Reviewer Guide | [training/legal-reviewer-guide.md](./training/legal-reviewer-guide.md) | ☐ |
| Mock Evidence Package | [evidence/mock-evidence-package.md](./evidence/mock-evidence-package.md) | ☐ |
| Acceptance Criteria — Legal Defensibility | [04-acceptance-criteria.md](./04-acceptance-criteria.md) | ☐ |
| Open Risks Register | [18-open-risks-register.md](./18-open-risks-register.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 7. Compliance / Quality

**Sign-off statement:**

> I confirm that accessibility, bilingual, data-handling, and audit-trail requirements have been validated to the extent required for the agreed phase, and that any outstanding findings are documented and accepted.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Acceptance Criteria — Accessibility | [04-acceptance-criteria.md](./04-acceptance-criteria.md) | ☐ |
| Acceptance Criteria — Bilingual | [04-acceptance-criteria.md](./04-acceptance-criteria.md) | ☐ |
| Nurse / Support Guide | [training/nurse-support-guide.md](./training/nurse-support-guide.md) | ☐ |
| Production Validation Matrix | [12-production-validation-matrix.md](./12-production-validation-matrix.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 8. Information Security

**Sign-off statement:**

> I confirm that the proposed deployment, feature-flag controls, evidence handling, and rollback approach do not introduce unacceptable security risk for the agreed phase, and that no real PHI is used in prototype validation.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Deployment Checklist | [06-deployment-checklist.md](./06-deployment-checklist.md) | ☐ |
| Rollback Checklist | [07-rollback-checklist.md](./07-rollback-checklist.md) | ☐ |
| Mock Evidence Package | [evidence/mock-evidence-package.md](./evidence/mock-evidence-package.md) | ☐ |
| Risk Register | [10-risk-register.md](./10-risk-register.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 9. Operations / Release Manager

**Sign-off statement:**

> I confirm that deployment, rollback, monitoring, support handover, and hypercare plans are in place and that the release can be managed safely for the agreed phase.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Deployment Checklist | [06-deployment-checklist.md](./06-deployment-checklist.md) | ☐ |
| Rollback Checklist | [07-rollback-checklist.md](./07-rollback-checklist.md) | ☐ |
| Operational Runbook | [14-operational-runbook.md](./14-operational-runbook.md) | ☐ |
| Support Handover Guide | [15-support-handover-guide.md](./15-support-handover-guide.md) | ☐ |
| Hypercare Plan | [16-hypercare-plan.md](./16-hypercare-plan.md) | ☐ |
| Go-Live Checklist | [11-go-live-checklist.md](./11-go-live-checklist.md) | ☐ |

| Phase approved | ☐ UAT start | ☐ Controlled pilot | ☐ Full production | ☐ Hypercare exit |
|----------------|-------------|-------------------|-------------------|-----------------|

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 10. External Auditor (Optional)

**Sign-off statement:**

> I acknowledge receipt of the Enterprise Readiness Package, evidence samples, and risk registers for Clinical Workspace 2.0. No audit opinion is implied by this receipt.

| Reviewed Document | Reference | Satisfied |
|-------------------|-----------|-----------|
| Final Enterprise Readiness Index | [19-final-enterprise-readiness-index.md](./19-final-enterprise-readiness-index.md) | ☐ |
| Mock Evidence Package | [evidence/mock-evidence-package.md](./evidence/mock-evidence-package.md) | ☐ |
| Risk Register | [10-risk-register.md](./10-risk-register.md) | ☐ |

**Name:** _________________________  **Signature:** _________________________  **Date:** __________

---

## 11. Consolidated Sign-Off Summary

| Stakeholder | Phase | Name | Date | Signature on File |
|-------------|-------|------|------|-------------------|
| CEO / Executive Sponsor | | | | ☐ |
| CIO / Head of IT | | | | ☐ |
| Medical Director / Clinical Governance | | | | ☐ |
| Legal Affairs | | | | ☐ |
| Compliance / Quality | | | | ☐ |
| Information Security | | | | ☐ |
| Operations / Release Manager | | | | ☐ |
| External Auditor (if applicable) | | | | ☐ |

---

**Record retention:** Store completed templates with the [08-production-readiness-report.md](./08-production-readiness-report.md) per `docs/governance/audit-retention-policy.md`.
