# PILOT FEEDBACK TEMPLATE

**Audience:** Physicians, patients (proxied), legal reviewers, compliance reviewers.
**Use:** One submission per pilot encounter (clinical roles) or per pilot week (legal/compliance).
**Storage:** `/pilot-evidence/feedback/<role>/<date>-<reference>.md` (or platform-managed form).

---

## A. Physician Feedback Form

**Encounter reference:** _____________
**Procedure type:** _____________
**Date / time:** _____________
**Physician:** _____________

### A.1 Dispatch experience

- Time from opening patient record to dispatch (estimate): _____________ seconds.
- Template selection clarity (1–5, 5 = excellent): _____________
- Mobile-number verification step worked as expected: ☐ Yes ☐ No — notes: __________

### A.2 Patient progression

- Did the patient complete the flow? ☐ Accepted ☐ Refused ☐ Abandoned ☐ Expired
- Approx. time from dispatch to completion: _____________ minutes.
- Did the patient require help? ☐ No ☐ Yes — what step: __________

### A.3 Refusal handling (if applicable)

- Was the refusal clearly captured? ☐ Yes ☐ No
- Was the refusal PDF correctly filed? ☐ Yes ☐ No
- Did the refusal pathway feel clinically appropriate? ☐ Yes ☐ No — comment: __________

### A.4 Quality

- Overall confidence in defensibility of this consent (1–5): _____________
- Would you recommend this workflow for general use? ☐ Yes ☐ No ☐ With changes
- NPS-style: How likely are you to recommend to a colleague (0–10)? _____________

### A.5 Comments / defects observed

```
(free text)
```

---

## B. Patient Feedback Form (administered by clinical staff)

**Encounter reference:** _____________
**Date / time:** _____________
**Language used:** ☐ Arabic ☐ English
**Device:** ☐ iOS ☐ Android ☐ Other: ____

### B.1 Comprehension

- I understood why the procedure was being recommended. (1–5): _____________
- I understood the risks. (1–5): _____________
- I understood the benefits. (1–5): _____________
- I understood the alternatives. (1–5): _____________
- I understood what would happen if I refused. (1–5): _____________

### B.2 Usability

- The link arrived promptly. ☐ Yes ☐ No
- The educational materials were easy to read. (1–5): _____________
- The Accept / Refuse choice was clear. ☐ Yes ☐ No
- The OTP code arrived on time. ☐ Yes ☐ No
- The signature pad worked correctly. ☐ Yes ☐ No

### B.3 Confidence

- I felt I had enough time and information to make my decision. (1–5): _____________
- I felt my choice was respected. (1–5): _____________

### B.4 Patient comments

```
(free text — captured verbatim where possible)
```

---

## C. Legal Reviewer Form (weekly)

**Reviewer:** _____________
**Week ending:** _____________
**Sample size reviewed:** _____________ (consents) + _____________ (refusals)

### C.1 Evidence-package validation (per `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §4)

- Packages passing: ___ / ___
- Packages failing: ___ — list references: __________

### C.2 Defensibility pillars

| Pillar | All sampled cases pass? | Notes |
|---|---|---|
| Informed | ☐ Yes ☐ No | |
| Voluntary | ☐ Yes ☐ No | |
| Identified | ☐ Yes ☐ No | |
| Documented | ☐ Yes ☐ No | |
| Auditable | ☐ Yes ☐ No | |

### C.3 Refusal review

- Refusal sampled: ___
- All refusal evidence packages valid? ☐ Yes ☐ No
- Refusal language fit for purpose? ☐ Yes ☐ No

### C.4 Recommendations

```
(free text)
```

### C.5 Reviewer sign-off

- Recommend continued pilot operation? ☐ Yes ☐ No
- Any rollback trigger met? ☐ No ☐ Yes — which: __________

Signature, date.

---

## D. Compliance Reviewer Form (PDPL, weekly)

**Reviewer:** _____________
**Week ending:** _____________

### D.1 PDPL checklist (per `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §8)

| Check | Yes / No / N/A | Notes |
|---|---|---|
| Sample evidence packages reviewed | | |
| All sampled packages pass §4 | | |
| UI masking correct (no full PII rendered) | | |
| Log masking correct (no full PII at INFO) | | |
| Retention configuration verified | | |
| No cross-border transfers | | |
| No purpose-creep detected | | |
| Breach register reviewed (zero new entries OR all handled) | | |
| Access controls reviewed (named accounts only) | | |
| Backup encryption confirmed | | |

### D.2 Patient-rights handling (any requests this week?)

- Access requests: ___ — resolved within SLA? ☐ Yes ☐ No
- Rectification requests: ___
- Erasure requests: ___ — balanced against medical retention? ☐ Yes ☐ No
- Notes: __________

### D.3 Sign-off

- Overall PDPL alignment this week: ☐ Aligned ☐ Aligned w/ remediation ☐ Not aligned
- Recommend continued pilot operation? ☐ Yes ☐ No

Signature, date.

---

## E. Defect / Incident Quick-Report (any role)

**Reporter:** _____________
**Role:** _____________
**Date / time:** _____________

- Encounter reference (if applicable): _____________
- Severity (suspected): ☐ P1 ☐ P2 ☐ P3
- Description:

```
(free text — what happened, what you expected, what you observed)
```

- Reproducibility: ☐ Always ☐ Sometimes ☐ Once
- Routed to: ☐ Program Operations ☐ Engineering On-Call ☐ Legal ☐ Compliance ☐ Security

---

## Submission

- Clinical encounter forms: complete within 24 hours of encounter.
- Weekly reviewer forms: complete by EOW Friday.
- Defect quick-reports: submit immediately.
- All submissions stored under `/pilot-evidence/feedback/` (or in the platform's feedback module if configured).
