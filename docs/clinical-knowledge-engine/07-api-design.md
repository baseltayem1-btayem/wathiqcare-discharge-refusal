# Clinical Knowledge Engine — API Design

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. API Principles

- **Tenant-scoped:** Every endpoint requires `tenantId` (from auth context or query param).
- **Versioned:** APIs are versioned via URL path (`/api/v1/knowledge/...`).
- **RESTful:** Resources are nouns; actions use sub-resources or verbs where appropriate.
- **Bilingual:** Responses include English and Arabic fields where applicable.
- **Governed:** Write endpoints enforce lifecycle state transitions.
- **Audited:** All mutations produce `GovernanceEvent` records.

---

## 2. Base URL

```
/api/v1/knowledge
```

---

## 3. Procedure Catalog

### 3.1 List Procedures

```http
GET /api/v1/knowledge/procedures?specialty={specialty}&q={query}&status={status}
```

**Response:**

```json
{
  "ok": true,
  "items": [
    {
      "id": "proc-1",
      "code": "APPENDECTOMY",
      "nameEn": "Appendectomy",
      "nameAr": "استئصال الزائدة الدودية",
      "specialtyId": "spec-surgery",
      "departmentId": "dept-or",
      "categoryCode": "SURGICAL",
      "anesthesiaRequired": true,
      "status": "ACTIVE"
    }
  ],
  "total": 150,
  "facets": {
    "specialties": ["General Surgery", "ENT"],
    "categories": ["SURGICAL", "DIAGNOSTIC"]
  }
}
```

### 3.2 Get Procedure

```http
GET /api/v1/knowledge/procedures/:id
```

### 3.3 Create Procedure

```http
POST /api/v1/knowledge/procedures
```

**Request:**

```json
{
  "code": "APPENDECTOMY",
  "nameEn": "Appendectomy",
  "nameAr": "استئصال الزائدة الدودية",
  "specialtyId": "spec-surgery",
  "departmentId": "dept-or",
  "categoryCode": "SURGICAL",
  "anesthesiaRequired": true,
  "keywords": ["appendix", "surgery"]
}
```

### 3.4 Update Procedure

```http
PATCH /api/v1/knowledge/procedures/:id
```

---

## 4. Knowledge Packages

### 4.1 Resolve Package for Procedure

```http
GET /api/v1/knowledge/procedures/:code/package?asOf={isoDate}
```

Returns the effective published package for the procedure as of the given date (defaults to now).

**Response:**

```json
{
  "ok": true,
  "package": {
    "id": "pkg-2-1-0",
    "procedureId": "proc-1",
    "version": "2.1.0",
    "status": "PUBLISHED",
    "effectiveDate": "2026-06-01",
    "expiryDate": null,
    "items": [
      { "itemType": "consent_form", "itemId": "form-1", "orderIndex": 1, "isRequired": true },
      { "itemType": "education_material", "itemId": "edu-1", "orderIndex": 2, "isRequired": true },
      { "itemType": "risk_disclosure", "itemId": "risk-1", "orderIndex": 3, "isRequired": true }
    ],
    "requiredParticipants": ["witness"],
    "governanceSnapshot": {
      "medicallyApprovedAt": "2026-05-28T10:00:00Z",
      "legallyApprovedAt": "2026-05-29T14:00:00Z",
      "publishedAt": "2026-06-01T00:00:00Z"
    }
  }
}
```

### 4.2 List Package Versions

```http
GET /api/v1/knowledge/packages/:id/versions
```

### 4.3 Create Package Draft

```http
POST /api/v1/knowledge/packages
```

**Request:**

```json
{
  "procedureId": "proc-1",
  "version": "2.2.0",
  "effectiveDate": "2026-07-01",
  "items": [
    { "itemType": "consent_form", "itemId": "form-2", "orderIndex": 1 },
    { "itemType": "education_material", "itemId": "edu-1", "orderIndex": 2 }
  ]
}
```

### 4.4 Governance Transitions

```http
POST /api/v1/knowledge/packages/:id/submit-for-review
POST /api/v1/knowledge/packages/:id/approve-medically
POST /api/v1/knowledge/packages/:id/approve-legally
POST /api/v1/knowledge/packages/:id/publish
POST /api/v1/knowledge/packages/:id/reject
POST /api/v1/knowledge/packages/:id/supersede
POST /api/v1/knowledge/packages/:id/archive
```

**Approval/Rejection Request:**

```json
{
  "comment": "Approved with updated risk language.",
  "metadata": {
    "reviewChecklist": ["risks_verified", "alternatives_verified"]
  }
}
```

---

## 5. Consent Forms

### 5.1 List Forms

```http
GET /api/v1/knowledge/forms?q={query}&category={category}&specialty={specialty}&status={status}
```

### 5.2 Get Form

```http
GET /api/v1/knowledge/forms/:id
```

### 5.3 Create Form

```http
POST /api/v1/knowledge/forms
```

**Request:**

```json
{
  "code": "APPENDECTOMY_CONSENT",
  "titleEn": "Appendectomy Consent",
  "titleAr": "موافقة استئصال الزائدة الدودية",
  "formType": "PROCEDURE_CONSENT",
  "riskLevel": "medium",
  "sections": [
    {
      "type": "header",
      "orderIndex": 1,
      "titleEn": "Procedure Information",
      "contentEn": "You are scheduled for an appendectomy."
    },
    {
      "type": "risk",
      "orderIndex": 2,
      "titleEn": "Risks",
      "contentEn": "Risks include bleeding, infection, and anesthesia complications."
    }
  ]
}
```

### 5.4 Governance Transitions

Same pattern as packages:

```http
POST /api/v1/knowledge/forms/:id/submit-for-review
POST /api/v1/knowledge/forms/:id/approve-medically
...
```

---

## 6. Education Materials

### 6.1 List Materials

```http
GET /api/v1/knowledge/education?q={query}&assetType={type}
```

### 6.2 Create Material

```http
POST /api/v1/knowledge/education
```

**Request:**

```json
{
  "code": "APPENDECTOMY_EDU",
  "titleEn": "Appendectomy Patient Education",
  "titleAr": "تثقيف المريض باستئصال الزائدة",
  "assetType": "PDF",
  "assetUrl": "/assets/edu/appendectomy.pdf",
  "durationMinutes": 5,
  "comprehensionChecks": [
    {
      "questionEn": "What is the purpose of an appendectomy?",
      "questionAr": "ما هو الغرض من استئصال الزائدة؟",
      "options": [
        { "id": "a", "labelEn": "To remove the appendix", "labelAr": "إزالة الزائدة" },
        { "id": "b", "labelEn": "To examine the stomach", "labelAr": "فحص المعدة" }
      ],
      "correctOptionId": "a"
    }
  ]
}
```

### 6.3 Evaluate Comprehension

```http
POST /api/v1/knowledge/education/:id/evaluate
```

**Request:**

```json
{
  "answers": { "check-1": "a" },
  "durationSeconds": 120,
  "attempts": 1
}
```

**Response:**

```json
{
  "ok": true,
  "scorePct": 100,
  "passed": true,
  "correctIds": ["check-1"]
}
```

---

## 7. Risk & Alternative Libraries

### 7.1 List Risks

```http
GET /api/v1/knowledge/risks?q={query}&specialty={specialty}&riskLevel={level}
```

### 7.2 Create Risk

```http
POST /api/v1/knowledge/risks
```

**Request:**

```json
{
  "code": "BLEEDING_GENERAL",
  "titleEn": "Bleeding",
  "titleAr": "النزيف",
  "descriptionEn": "Excessive bleeding may require transfusion or reoperation.",
  "descriptionAr": "قد يتسبب النزيف المفرط في الحاجة إلى نقل دم أو إعادة العملية.",
  "riskLevel": "standard",
  "specialtyIds": ["spec-surgery"]
}
```

### 7.3 List Alternatives

```http
GET /api/v1/knowledge/alternatives?q={query}&specialty={specialty}
```

### 7.4 Create Alternative

```http
POST /api/v1/knowledge/alternatives
```

---

## 8. Decision Rules

### 8.1 List Rules

```http
GET /api/v1/knowledge/rules?status={status}&q={query}
```

### 8.2 Create Rule

```http
POST /api/v1/knowledge/rules
```

**Request:**

```json
{
  "code": "MINOR_REQUIRES_GUARDIAN",
  "nameEn": "Minor requires guardian",
  "nameAr": "القاصر يتطلب ولي أمر",
  "priority": 100,
  "condition": {
    "operator": "OR",
    "operands": [
      { "field": "patient.capacityStatus", "operator": "EQUALS", "value": "minor" },
      { "field": "patient.capacityStatus", "operator": "EQUALS", "value": "incapacitated" }
    ]
  },
  "action": {
    "type": "REQUIRE_PARTICIPANT",
    "participantType": "guardian",
    "isMandatory": true,
    "messageEn": "A legal guardian is required.",
    "messageAr": "يلزم وجود ولي أمر قانوني."
  }
}
```

### 8.3 Evaluate Rules

```http
POST /api/v1/knowledge/rules/evaluate
```

**Request:**

```json
{
  "procedureId": "proc-1",
  "packageId": "pkg-2-1-0",
  "patientContext": {
    "age": 12,
    "capacityStatus": "minor",
    "languagePreference": "bilingual"
  },
  "encounterContext": {
    "type": "outpatient",
    "isEmergency": false
  }
}
```

**Response:**

```json
{
  "ok": true,
  "riskLevel": "high",
  "requiredParticipants": [
    { "participantType": "guardian", "isMandatory": true, "trigger": { "ruleIds": ["MINOR_REQUIRES_GUARDIAN"] } }
  ],
  "suggestions": [],
  "blockers": [],
  "matchedRuleIds": ["MINOR_REQUIRES_GUARDIAN"]
}
```

---

## 9. Assembly Service

### 9.1 Assemble Package

```http
POST /api/v1/knowledge/assembly
```

**Request:**

```json
{
  "procedureCode": "APPENDECTOMY",
  "patientContext": {
    "mrn": "MRN-123",
    "capacityStatus": "competent",
    "languagePreference": "bilingual"
  },
  "physicianContext": {
    "physicianId": "doc-1",
    "licenseNumber": "L-123",
    "specialty": "General Surgery"
  },
  "encounterContext": {
    "type": "outpatient",
    "isEmergency": false
  }
}
```

**Response:**

```json
{
  "ok": true,
  "assembly": {
    "assemblyId": "asm-uuid",
    "procedureId": "proc-1",
    "packageId": "pkg-2-1-0",
    "packageVersion": "2.1.0",
    "status": "ready",
    "consentForms": [ ... ],
    "educationMaterials": [ ... ],
    "riskDisclosures": [ ... ],
    "alternativeTreatments": [ ... ],
    "requiredParticipants": [ ... ],
    "suggestions": [ ... ],
    "blockers": [ ... ]
  }
}
```

---

## 10. Governance Audit

### 10.1 Get Entity History

```http
GET /api/v1/knowledge/audit?entityType=PACKAGE&entityId=pkg-2-1-0
```

**Response:**

```json
{
  "ok": true,
  "events": [
    { "eventType": "CREATED", "actorRole": "CONTENT_AUTHOR", "createdAt": "..." },
    { "eventType": "SUBMITTED_FOR_REVIEW", "actorRole": "CONTENT_AUTHOR", "createdAt": "..." },
    { "eventType": "MEDICALLY_APPROVED", "actorRole": "CLINICAL_REVIEWER", "createdAt": "..." },
    { "eventType": "LEGALLY_APPROVED", "actorRole": "LEGAL_REVIEWER", "createdAt": "..." },
    { "eventType": "PUBLISHED", "actorRole": "GOVERNANCE_LEAD", "createdAt": "..." }
  ]
}
```

### 10.2 Verify Audit Chain

```http
GET /api/v1/knowledge/audit/:entityType/:entityId/verify
```

Returns whether the hash chain is intact.

---

## 11. Error Responses

All errors follow this shape:

```json
{
  "ok": false,
  "error": "VALIDATION_ERROR",
  "message": "Package cannot be published without legal approval.",
  "details": {
    "field": "status",
    "currentStatus": "MEDICALLY_APPROVED"
  }
}
```

Common error codes:

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Entity not found |
| `VALIDATION_ERROR` | 422 | Business rule violation |
| `GOVERNANCE_ERROR` | 422 | Invalid lifecycle transition |
| `CONFLICT` | 409 | Duplicate or conflicting state |
| `TENANT_ISOLATION` | 403 | Entity belongs to another tenant |
