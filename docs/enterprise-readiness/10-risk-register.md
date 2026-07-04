# 10. Risk Register — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Scope:** Enterprise readiness and production release of Clinical Workspace 2.0 (`/prototype/clinical-workspace-2`).

---

## 1. Risk Scoring Legend

| Score | Probability | Impact |
|-------|-------------|--------|
| 1 | Rare (< 10%) | Minimal |
| 2 | Unlikely (10–30%) | Minor |
| 3 | Possible (30–50%) | Moderate |
| 4 | Likely (50–70%) | Major |
| 5 | Almost certain (> 70%) | Critical |

**Risk score = Probability × Impact.** Scores ≥ 12 are considered high and require active mitigation or executive acceptance.

---

## 2. Project Risks

| ID | Risk | Category | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|----------|-------------|--------|-------|------------|-------|--------|
| R-01 | Patient-facing remote signing route `/sign/[token]/workflow` is not implemented, blocking real remote patient signing. | Technical | 5 | 5 | 25 | Keep prototype in preview mode; create separate engineering ticket; build behind feature flag. | Product / Engineering | Open |
| R-02 | Mock Clinical Knowledge Engine behavior diverges from live CKE, producing incorrect alerts, blockers, or required participants. | Clinical / Technical | 4 | 4 | 16 | Validate against live CKE API contract; clinical SME review mapping logic; staged rollout. | Clinical Knowledge team | Open |
| R-03 | Refusal language or patient copy disclaimers are not legally defensible. | Legal | 4 | 5 | 20 | Route all consent/refusal copy through Legal Affairs before release; obtain signed legal approval. | Legal Affairs | Open |
| R-04 | Third-party accessibility audit finds WCAG gaps not caught by internal scans. | Compliance | 3 | 4 | 12 | Run automated a11y scans in UAT; schedule independent audit; remediate findings before rollout. | Compliance | Open |
| R-05 | Load/concurrency testing reveals performance degradation or signature-session conflicts. | Technical / Operational | 3 | 4 | 12 | Add load-test criteria; execute in staging; define scaling and circuit-breaker plans. | QA / DevOps | Open |
| R-06 | Physicians or support staff are not trained before go-live, leading to workflow errors. | Operational | 3 | 4 | 12 | Deliver training guides; conduct hands-on sessions; keep quick-reference cards available. | Training Lead / Operations | Mitigating |
| R-07 | Feature flag misconfiguration exposes the workspace to unauthorized users or tenants. | Security | 2 | 5 | 10 | Use targeted flags; test kill switch; require dual approval for flag changes in production. | InfoSec / Engineering | Mitigating |
| R-08 | UAT defects are not triaged or fixed within the planned window, delaying go-live. | Schedule | 3 | 3 | 9 | Define severity classes and SLA; reserve engineering capacity; daily defect standup. | UAT Lead / Engineering | Mitigating |
| R-09 | Exported evidence packages contain real PHI due to environment misconfiguration. | Security / Compliance | 2 | 5 | 10 | Enforce mock-data mode for UAT; review export JSON; InfoSec spot-check. | InfoSec / QA | Mitigating |
| R-10 | Rollback is required but communication delays amplify clinical impact. | Operational | 2 | 4 | 8 | Pre-position communication templates; define approver list; rehearse tabletop exercise. | Release Manager | Mitigating |
| R-11 | Hypercare coverage gaps lead to slow incident response during first 30 days. | Operational | 2 | 4 | 8 | Publish rota; define escalation matrix; hold daily hypercare rounds. | Operations / Support Lead | Mitigating |
| R-12 | Patient or guardian does not understand the consent due to literacy, vision, or language barriers. | Clinical / Equity | 3 | 4 | 12 | Provide bilingual text, audio/video education, text-size/contrast controls, interpreter flow, and nurse assistance. | Clinical Governance | Mitigating |
| R-13 | Integration with electronic health record (EHR) for archive/finalization fails. | Technical | 2 | 4 | 8 | Design archive step as async job with retry and dead-letter queue; validate in staging. | Engineering / Integration | Open |
| R-14 | Signature evidence hash algorithm or storage is challenged in an audit. | Legal / Security | 2 | 5 | 10 | Document hash scheme and key custody; align with legal evidence retention policy. | InfoSec / Legal | Open |
| R-15 | Regulatory requirements change between pilot and full rollout. | Compliance | 2 | 3 | 6 | Monitor regulatory notices; maintain traceability matrix; schedule quarterly compliance review. | Compliance | Monitoring |

---

## 3. Risk Distribution

| Status | Count |
|--------|-------|
| Open (no mitigation yet) | 5 |
| Mitigating (actions in progress) | 8 |
| Monitoring (residual, accepted) | 1 |
| Closed | 1 (R-16 placeholder if needed) |

*(No risks are closed at this time.)*

---

## 4. Risk Trends and Triggers

| Trend | Trigger | Response |
|-------|---------|----------|
| Remote signing route delayed | Engineering ticket not started 2 weeks before pilot | Escalate to Engineering Lead and Executive Sponsor |
| Legal review pending > 5 business days | Copy not approved 1 week before go-live | Escalate to Medical Director and Legal Affairs head |
| Accessibility audit findings critical | Any critical or serious WCAG violation | Block rollout until remediated and re-tested |
| UAT P0/P1 defects open | Any open P0/P1 at exit criteria review | Extend UAT or downgrade to GO WITH OBSERVATIONS |
| Load test failure | p95 response > 2 s or error rate > 0.1% | Tune infrastructure or reduce rollout scope |

---

## 5. Escalation Path

1. **Risk owner** → attempts mitigation and reports status.
2. **Enterprise Readiness Lead** → reviews risk register weekly; escalates high scores.
3. **Executive Sponsor / Medical Director / CIO** → decides on acceptance, scope reduction, or go-live delay for risks scoring ≥ 12.

---

## 6. Related Documents

- [08-production-readiness-report.md](./08-production-readiness-report.md) — current status and recommendation.
- [18-open-risks-register.md](./18-open-risks-register.md) — risks accepted for carry-forward at go-live.
- [07-rollback-checklist.md](./07-rollback-checklist.md) — response plan for realized technical risks.
- [16-hypercare-plan.md](./16-hypercare-plan.md) — first-30-days risk monitoring.
