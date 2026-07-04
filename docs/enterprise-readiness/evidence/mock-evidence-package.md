# Mock Evidence Package — Clinical Workspace 2.0

**Purpose:** Show the structure and content of an exported informed-consent evidence package for compliance, legal, and QA review.  
**Scope:** Prototype `/prototype/clinical-workspace-2` using deterministic mock data.  
**Data classification:** No real PHI; national IDs are masked.

---

## 1. Evidence Export Trigger

The evidence package is generated from the Task Simulator after a consent is dispatched and a patient journey is completed. Clicking **Export evidence** downloads `intelligent-clinical-journey-evidence.json`.

---

## 2. Example Exported Package (Happy Path)

```json
{
  "mode": "prototype",
  "timestamp": "2026-06-26T14:32:10.000Z",
  "reference": "ICJ-2026-000101-APP-001",
  "patient": {
    "id": "p-101",
    "mrn": "MRN-000101",
    "name": "Ahmad Hassan",
    "nameAr": "أحمد حسن",
    "dateOfBirth": "1988-03-15",
    "capacityStatus": "competent",
    "languagePreference": "ar"
  },
  "encounter": {
    "id": "e-101-1",
    "encounterId": "ENC-2026-0001",
    "department": "General Surgery",
    "physician": "Dr. Khalid Al-Rashid",
    "physicianLicense": "SCHS-12345",
    "diagnosis": "Acute appendicitis",
    "procedure": "Laparoscopic appendectomy",
    "caseNumber": "CAS-2026-1201"
  },
  "procedure": {
    "code": "LAP-APP",
    "nameEn": "Laparoscopic appendectomy",
    "nameAr": "استئصال الزائدة بالمنظار",
    "riskLevel": "MEDIUM",
    "categoryCode": "PROCEDURE_CONSENT"
  },
  "decision": "accepted",
  "requiredParticipants": ["witness"],
  "baseline": {
    "physicianClicks": 32,
    "patientEducationTimeSeconds": 0,
    "questionsAsked": 0,
    "alertsUnacknowledged": 0
  },
  "current": {
    "physicianClicks": 24,
    "patientEducationTimeSeconds": 520,
    "questionsAsked": 1,
    "alertsUnacknowledged": 0
  },
  "deltas": {
    "physicianClicks": -8,
    "patientEducationTimeSeconds": 520,
    "questionsAsked": 1,
    "alertsUnacknowledged": 0
  },
  "percentReductions": {
    "physicianClicks": 25
  },
  "patientMetrics": {
    "educationTabsViewed": 5,
    "comprehensionScore": 100,
    "questionText": "What are the alternatives?",
    "decisionTimestamp": "2026-06-26T14:30:45.000Z"
  },
  "timeline": [
    {
      "id": "evt-001",
      "actor": "Dr. Khalid Al-Rashid",
      "role": "physician",
      "eventType": "CONSENT_DISPATCHED",
      "timestamp": "2026-06-26T14:22:18.000Z",
      "summary": "Consent dispatched to patient for Laparoscopic appendectomy",
      "evidenceHash": "sha256:7a3f...e9d2"
    },
    {
      "id": "evt-002",
      "actor": "Ahmad Hassan",
      "role": "patient",
      "eventType": "EDUCATION_COMPLETED",
      "timestamp": "2026-06-26T14:25:33.000Z",
      "summary": "Patient completed education and comprehension check",
      "evidenceHash": "sha256:9c1b...4f7a"
    },
    {
      "id": "evt-003",
      "actor": "Ahmad Hassan",
      "role": "patient",
      "eventType": "QUESTION_SUBMITTED",
      "timestamp": "2026-06-26T14:27:12.000Z",
      "summary": "Question submitted: What are the alternatives?",
      "evidenceHash": "sha256:2d8e...b1c3"
    },
    {
      "id": "evt-004",
      "actor": "Ahmad Hassan",
      "role": "patient",
      "eventType": "DECISION_ACCEPTED",
      "timestamp": "2026-06-26T14:28:05.000Z",
      "summary": "Patient accepted the procedure",
      "evidenceHash": "sha256:4e5a...88d1"
    },
    {
      "id": "evt-005",
      "actor": "Ahmad Hassan",
      "role": "patient",
      "eventType": "OTP_VERIFIED",
      "timestamp": "2026-06-26T14:29:50.000Z",
      "summary": "OTP verified (simulated in prototype)",
      "evidenceHash": "sha256:1f0c...6a2e"
    },
    {
      "id": "evt-006",
      "actor": "Ahmad Hassan",
      "role": "patient",
      "eventType": "SIGNATURE_CAPTURED",
      "timestamp": "2026-06-26T14:30:12.000Z",
      "summary": "Patient signature captured",
      "evidenceHash": "sha256:8b2d...c5f1"
    },
    {
      "id": "evt-007",
      "actor": "System",
      "role": "system",
      "eventType": "PDF_FINALIZED",
      "timestamp": "2026-06-26T14:30:45.000Z",
      "summary": "Consent PDF finalized (mock)",
      "evidenceHash": "sha256:3a7e...d4b0"
    },
    {
      "id": "evt-008",
      "actor": "System",
      "role": "system",
      "eventType": "ARCHIVED_TO_CLINICAL_RECORD",
      "timestamp": "2026-06-26T14:32:10.000Z",
      "summary": "Archived to clinical record (mock)",
      "evidenceHash": "sha256:6c1f...9e3a"
    }
  ]
}
```

---

## 3. Refusal Path Evidence Differences

For a refusal (e.g., Robert Smith / Coronary angiography), the following fields differ:

| Field | Value |
|-------|-------|
| `decision` | `refused` |
| `patientMetrics.comprehensionScore` | 100 (if education completed) |
| `patientMetrics.decisionTimestamp` | timestamp of refusal |
| Timeline event | `DECISION_REFUSED` replaces `DECISION_ACCEPTED` |
| Signature event summary | "Refusal signature captured" |
| Confirmation screen | "Refusal recorded" with red status icon |

---

## 4. Evidence Validation Checklist

- [ ] JSON is well-formed and schema-valid.
- [ ] `reference` is unique and traceable to the encounter.
- [ ] Every critical event has a non-empty `evidenceHash`.
- [ ] Actor attribution is present for human actions.
- [ ] Timestamps are in UTC and chronologically ordered.
- [ ] `decision` field is `accepted` or `refused`.
- [ ] No real PHI beyond mock identifiers is present.
- [ ] Required participants match the decision rules in the Clinical Knowledge Package.

---

## 5. Chain of Custody

| Step | Action | Owner |
|------|--------|-------|
| Generation | Task Simulator exports JSON at end of journey. | System |
| Verification | QA validates JSON schema and hash presence. | QA |
| Legal review | Legal reviewer confirms decision and signature events. | Legal Affairs |
| Retention | Exported evidence stored per `docs/governance/audit-retention-policy.md`. | InfoSec / DBA |
| Audit request | Compliance retrieves evidence by `reference` or `encounterId`. | Compliance |

---

## 6. Limitations

- Evidence hashes in the prototype are illustrative; production must define the hashing algorithm, salt/key custody, and tamper-evident storage.
- PDF finalization and clinical-record archive are mocked in the prototype.
- OTP verification is simulated; production must integrate the approved OTP/SMS provider.

---

**Related documents:** [01-uat-plan.md](../01-uat-plan.md), [04-acceptance-criteria.md](../04-acceptance-criteria.md), [14-operational-runbook.md](../14-operational-runbook.md).
