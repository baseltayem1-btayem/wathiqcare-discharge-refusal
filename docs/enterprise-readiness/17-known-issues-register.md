# 17. Known Issues Register — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Scope:** Known limitations and issues for Clinical Workspace 2.0 at the current validation stage.

---

## 1. How This Register Is Used

This register captures limitations that are understood and accepted at this point in the release cycle. Items here are not defects in the prototype; they are gaps between the prototype validation scope and full production readiness. Each item includes a workaround and an owner responsible for closure.

---

## 2. Known Issues

| ID | Issue | Category | Severity | Workaround | Owner | Target Resolution |
|----|-------|----------|----------|------------|-------|-------------------|
| KI-01 | Patient-facing remote signing route `/sign/[token]/workflow` is not implemented. | Functional | High | Use **Preview patient journey** in the physician workspace to simulate the patient experience. | Product / Engineering | Before production release |
| KI-02 | Clinical Knowledge Engine integration is mocked; live package resolution may differ. | Integration | Medium | Validate decision rules manually against mock data; plan live CKE contract validation. | Clinical Knowledge team | Before pilot |
| KI-03 | OTP verification is simulated; no real SMS gateway is used. | Functional | Medium | Use simulated **Verify OTP** button during UAT; integrate approved OTP provider for production. | Engineering | Before production release |
| KI-04 | PDF finalization is mocked; no production PDF is generated. | Functional | Medium | Export JSON evidence package from Task Simulator; integrate PDF service for production. | Engineering | Before production release |
| KI-05 | Archive to clinical record is mocked; no EHR write occurs. | Integration | Medium | Manually record consent decision in the existing system until EHR integration is built. | Engineering / Integration | Before pilot |
| KI-06 | No load or concurrency testing has been performed. | Performance | Medium | Limit pilot to controlled group; schedule load tests in staging. | QA / DevOps | Before pilot |
| KI-07 | Legal review of refusal language and patient copy disclaimers is pending. | Legal | High | Use prototype copy only in UAT; do not deploy patient-facing copy to production until Legal approves. | Legal Affairs | Before production release |
| KI-08 | Third-party accessibility audit is pending. | Compliance | Medium | Run automated a11y scans during UAT; schedule independent audit before full rollout. | Compliance | Before full rollout |
| KI-09 | No real patient data is used; UAT relies on deterministic mock patients. | Data | Low | Use approved mock patients only; plan data-validation phase with synthetic data in staging. | QA | Before pilot |
| KI-10 | Physician workspace labels are primarily English; bilingual physician labels are partial. | Localization | Low | Patient journey is fully bilingual; physician label enhancement tracked as product improvement. | Product / UX | Post-pilot |
| KI-11 | Guardian, interpreter, and witness flows are validated through manual scripts only. | Testing | Medium | Execute TS-03, TS-04, and TS-05 during UAT with appropriate participants. | QA | During UAT |
| KI-12 | Keyboard-only navigation is not yet independently verified. | Accessibility | Medium | Include keyboard navigation checks in TS-11 and automated a11y scans. | Compliance / QA | During UAT |

---

## 3. Severity Definitions

| Severity | Meaning |
|----------|---------|
| High | Blocks production release or pilot expansion until resolved. |
| Medium | Acceptable for controlled UAT/pilot with a documented workaround and closure plan. |
| Low | Cosmetic, low-impact, or enhancement; does not block go-live. |

---

## 4. Workaround Summary by Phase

| Phase | Acceptable Workarounds |
|-------|------------------------|
| Prototype UAT | KI-01 through KI-12 are acceptable if documented and participants are briefed. |
| Controlled pilot | KI-02, KI-05, KI-06, KI-08, KI-10, KI-11, KI-12 may remain with mitigation plans. KI-01, KI-03, KI-04, KI-07 must be resolved or replaced by production services. |
| Full production | Only low-severity items (KI-10, KI-12 if remediated) may remain as accepted observations. |

---

## 5. Closure Criteria

An issue may be removed from this register when:

1. The functionality is implemented and tested in a non-prototype environment.
2. The workaround is no longer needed.
3. A signed acceptance or risk acceptance is recorded in [18-open-risks-register.md](./18-open-risks-register.md) if the issue will remain in production.

---

## 6. Review Cadence

- **Daily during UAT:** Add new findings; confirm workarounds are effective.
- **Weekly during hypercare:** Review unresolved items and update target dates.
- **At each phase gate:** Verify that remaining known issues are acceptable for the next phase.

---

## 7. Related Documents

- [18-open-risks-register.md](./18-open-risks-register.md)
- [10-risk-register.md](./10-risk-register.md)
- [08-production-readiness-report.md](./08-production-readiness-report.md)
- [12-production-validation-matrix.md](./12-production-validation-matrix.md)
