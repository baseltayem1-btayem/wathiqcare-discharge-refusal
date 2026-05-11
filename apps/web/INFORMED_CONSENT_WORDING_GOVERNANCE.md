# Unified Informed Consent Wording — Architecture & Implementation Guide

**Status**: ENTERPRISE GOVERNANCE FRAMEWORK — PHASE 1 COMPLETE  
**Effective Date**: May 10, 2026  
**Last Updated**: May 10, 2026  

---

## 1. Overview

WathiqCare's unified informed consent wording system enforces **legal defensibility** through strict separation of:

- **FIXED LEGAL CLAUSES** — Immutable, version-controlled, IMC-approved (Arabic + English)
- **DYNAMIC FIELDS** — Physician-editable, populated by system/AI, scope-limited
- **GOVERNANCE CONTROLS** — Legal + Medical approval workflow, audit trails, bilingual synchronization

### Mandatory Architecture Principles

1. **Fixed clauses must remain protected and version-controlled**
2. **Physicians may only edit designated dynamic fields**
3. **Dynamic content must never overwrite fixed legal wording**
4. **Any amendment to fixed wording requires: Legal approval + Medical approval + Governance audit log**
5. **Bilingual structure must remain synchronized**
6. **Final PDF must preserve exact approved wording**
7. **AI-generated content is allowed ONLY in dynamic medical fields**
8. **AI must never modify fixed legal clauses automatically**

---

## 2. Fixed Legal Clauses (Immutable)

All approved wording stored in `approved_wording_templates` table with `is_fixed_legal_clause = TRUE`.

### 2.1 Core Informed Consent Main Clause

**Wording Key**: `core.informed_consent.main_clause`  
**Language**: Bilingual (Arabic + English)  
**Section**: `core_consent`  
**Approval Status**: APPROVED (IMC Legal + Medical)  
**Version**: 1.0.0

**Arabic (فصحى - Modern Standard Arabic)**:
```
أقر أنا الموقع أدناه بأن الطبيب المعالج وفريق الرعاية الصحية قد قاموا بشرح حالتي الصحية وطبيعة الإجراء الطبي / الجراحي / التشخيصي / العلاجي المقترح لي بصورة واضحة ومفهومة، بما في ذلك الغرض من الإجراء، والفوائد المتوقعة، والمخاطر والمضاعفات المحتملة، والبدائل العلاجية الممكنة، إضافة إلى النتائج أو المضاعفات المحتملة في حال رفض العلاج أو عدم إجرائه.

كما أقر بأنه أتيحت لي الفرصة الكاملة لطرح الأسئلة والاستفسارات المتعلقة بحالتي الصحية والإجراء المقترح، وقد تمت الإجابة على جميع استفساراتي بصورة واضحة ومفهومة ومرضية بالنسبة لي.

وأقر كذلك بأن ممارسة الطب والجراحة لا تخلو من المخاطر والمضاعفات المحتملة، وأنه لا يمكن تقديم أو ضمان نتائج محددة بشكل مطلق، رغم اتخاذ كافة المعايير المهنية والطبية المتعارف عليها.

وأفهم أن بعض المخاطر أو المضاعفات قد تكون شائعة أو نادرة أو خطيرة أو مهددة للحياة بحسب طبيعة الإجراء وحالتي الصحية.

كما أوافق على اتخاذ أي إجراءات طبية إضافية أو طارئة يراها الفريق الطبي ضرورية أثناء أو بعد الإجراء الطبي حفاظًا على سلامتي الصحية، وفقًا للأصول الطبية المتعارف عليها.

وأقر بأنه قد تم شرح خيارات التخدير المناسبة لي — إن وجدت — بما في ذلك مخاطر التخدير ومضاعفاته المحتملة.

وأوافق على استخدام وتبادل معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، وفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.

كما أقر بأن هذه الموافقة تمثل موافقة مستنيرة وصادرة بإرادتي الحرة دون أي إكراه أو ضغط.
```

**English**:
```
I, the undersigned, hereby acknowledge that the treating physician and healthcare team have explained to me, in a clear and understandable manner, my medical condition and the nature of the proposed medical, surgical, diagnostic, or therapeutic procedure, including the purpose of the procedure, expected benefits, potential risks and complications, available treatment alternatives, and the possible consequences or complications that may arise from refusing or delaying treatment.

I further acknowledge that I have been given full opportunity to ask questions and discuss concerns regarding my condition and the proposed procedure, and that all my questions have been answered clearly and satisfactorily.

I understand that the practice of medicine and surgery involves inherent risks and potential complications, and that no absolute guarantee or assurance has been made regarding specific outcomes, despite adherence to recognized medical and professional standards.

I further understand that certain risks or complications may be common, uncommon, serious, or life-threatening depending on the nature of the procedure and my medical condition.

I also authorize the medical team to perform any additional or emergency procedures deemed medically necessary during or after the procedure in order to preserve my health and safety in accordance with accepted medical standards.

I acknowledge that the available anesthesia options — where applicable — together with their potential risks and complications have been explained to me.

I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.

I further acknowledge that this informed consent is given voluntarily and without coercion or undue pressure.
```

### 2.2 Other Fixed Clauses

All of the following are **IMMUTABLE** after approval:

1. **Medical Imaging/Recording Consent** (`core.imaging_recording_consent`)
2. **Interpreter Clause** (`core.interpreter_clause`)
3. **Legal Guardian/Substitute Decision Maker Clause** (`core.legal_guardian_clause`)
4. **Physician Certification** (`core.physician_certification`)
5. **No Guarantee Clause** (`core.no_guarantee_clause`)
6. **Electronic Signature Clause** (`core.electronic_signature_clause`)

All stored in `approved_wording_templates` with full bilingual content (Arabic + English).

---

## 3. Dynamic Fields (Physician-Editable)

**ONLY** the following fields may be edited by physicians or populated by system/AI:

### 3.1 Core Dynamic Fields

| Field | Type | Example | Populated By | Editable By |
|-------|------|---------|--------------|-------------|
| `diagnosis` | String | "Type 2 Diabetes Mellitus" | Physician | Physician |
| `caseDescription` | String | "Poorly controlled blood sugar, HbA1c 9.2%" | Physician | Physician |
| `procedureName` | String | "Insulin Glargine Therapy Initiation" | System | Physician |
| `anesthesiaType` | String? | "No anesthesia required" | System | Physician |
| `expectedBenefits` | String | "Improved glucose control, reduced DM complications" | AI (if enabled) | Physician |
| `commonRisks` | String | "Hypoglycemia (low blood sugar)" | AI (if enabled) | Physician |
| `uncommonRisks` | String | "Lipodystrophy at injection sites" | AI (if enabled) | Physician |
| `seriousRisks` | String | "Severe hypoglycemia leading to seizures or coma" | AI (if enabled) | Physician |
| `treatmentAlternatives` | String | "Oral medications (Metformin, GLP-1 agonists)" | AI (if enabled) | Physician |
| `refusalRisks` | String | "Uncontrolled diabetes → complications (neuropathy, nephropathy)" | AI (if enabled) | Physician |
| `postCareInstructions` | String | "Check blood sugar 2x daily, inject at bedtime, follow-up in 2 weeks" | AI (if enabled) | Physician |
| `physicianNotes` | String? | "Patient educated on proper injection technique" | Physician | Physician |
| `medicationsUsed` | String[] | ["Insulin Glargine U-100", "Lantus Pen 100 IU/mL"] | System | Physician |
| `procedureSite` | String? | "Left abdomen, 2cm from umbilicus" | Physician | Physician |
| `procedureOrgan` | String? | "Pancreatic insulin system (systemic)" | System | Physician |

### 3.2 System-Populated Fields (Read-Only)

These are populated by the system and **CANNOT** be edited by physicians:

| Field | Source | Example |
|-------|--------|---------|
| `physicianName` | Database (user profile) | "Dr. Ahmed Al-Zain" |
| `physicianSpecialty` | Database (user profile) | "Endocrinology" |
| `physicianLicenseNo` | Database (credential verification) | "MOH-2024-0123456" |
| `consentDateTime` | System (timestamp) | "2026-05-10T14:35:00Z" |

---

## 4. AI Content Restrictions (CRITICAL)

### 4.1 What AI CAN Generate

AI is permitted to generate content **ONLY** for these dynamic medical fields:

```typescript
const AI_ALLOWED_FIELDS = [
  'diagnosis',           // Clinical interpretation
  'expectedBenefits',    // Medical evidence-based benefits
  'commonRisks',         // Specialty-specific common risks
  'uncommonRisks',       // Rare but documented risks
  'seriousRisks',        // Life-threatening complications
  'treatmentAlternatives', // Clinical alternatives
  'refusalRisks',        // Consequences of non-treatment
  'postCareInstructions', // Recovery guidance
];
```

### 4.2 What AI CANNOT Do (Enforcement)

AI **CANNOT**:
- ✗ Modify fixed legal clauses (core consent, physician cert, etc.)
- ✗ Edit system-populated fields
- ✗ Change bilingual structure or language templates
- ✗ Override governance-approved wording
- ✗ Auto-finalize consent (must require physician review + approval)
- ✗ Populate fields outside the allowed dynamic list

### 4.3 Implementation

**File**: `src/lib/core/ai-core.ts`

```typescript
export function validateAiOutputAgainstWordingRepository(
  aiContent: AiDynamicFieldsOutput
): void {
  const allowedDynamicFields = [
    'diagnosis',
    'procedureName',
    'expectedBenefits',
    'commonRisks',
    'uncommonRisks',
    'seriousRisks',
    'treatmentAlternatives',
    'refusalRisks',
    'postCareInstructions',
    'physicianNotes',
    'medicationsUsed',
    'procedureSite',
    'procedureOrgan',
  ];

  const prohibited = Object.keys(aiContent).filter(
    (fieldKey) => !allowedDynamicFields.includes(fieldKey)
  );

  if (prohibited.length > 0) {
    throw new AiLegalClauseViolationError(
      `AI attempted to populate prohibited fields: ${prohibited.join(', ')}. ` +
      `AI can only populate designated dynamic fields.`
    );
  }
}
```

---

## 5. Bilingual Synchronization

### 5.1 Structure

All informed consent documents maintain side-by-side **Arabic + English** content:

- **Arabic** (Modern Standard Arabic — فصحى): Formal, medical terminology
- **English**: Professional, medical standard English

### 5.2 Fixed Clause Synchronization

Fixed legal clauses are **ALWAYS** synchronized:

- If the English version is approved as v1.0.0, the Arabic version is also v1.0.0
- Both versions update together (no independent versioning)
- Audit trail records both languages

### 5.3 Dynamic Field Synchronization

Dynamic fields are populated independently per language:

1. **Physician edits field in Arabic** → English field requires manual translation/verification
2. **System flags out-of-sync conditions** → Audit log entry
3. **Physician must acknowledge bilingual sync** before finalizing

---

## 6. Governance Approval Workflow

### 6.1 Wording Change Proposal Flow

```
PROPOSED (Physician/Legal)
    ↓
[LEGAL REVIEW] — Legal team verifies compliance with Saudi law
    ↓
[MEDICAL REVIEW] — Medical team verifies clinical accuracy
    ↓
APPROVED (both gates passed)
    ↓
[VERSION BUMP] — v1.0.0 → v1.1.0 (or v2.0.0 for major changes)
    ↓
[EFFECTIVE DATE SET] — Can be scheduled for future rollout
    ↓
[AUDIT LOGGED] — All decisions recorded with timestamps, actors, reasons
```

### 6.2 Approval Requirements

**Fixed clause changes require:**
- Legal review (**mandatory**)
- Medical review (**mandatory**)
- Both must vote APPROVED before effective
- Reason statement required
- Version bump (semantic versioning)
- Audit trail entry with actor, timestamp, decision

**Dynamic field changes:**
- Tracked in consent document audit trail
- Physician can edit freely (within allowed scope)
- Changes audited per-document

### 6.3 Database Tables

**`approved_wording_templates`** — Fixed, approved wording
```sql
CREATE TABLE approved_wording_templates (
  id                    UUID PRIMARY KEY,
  tenant_id             UUID NOT NULL,
  wording_key           TEXT NOT NULL,          -- e.g., 'core.informed_consent.main_clause'
  version               TEXT NOT NULL,          -- 1.0.0, 1.1.0, 2.0.0, etc.
  language              TEXT NOT NULL,          -- 'ar', 'en', 'bilingual'
  is_fixed_legal_clause BOOLEAN NOT NULL,       -- TRUE = immutable
  content_ar            TEXT,
  content_en            TEXT,
  section               TEXT NOT NULL,
  legal_review_status   TEXT NOT NULL,          -- PENDING, APPROVED, REJECTED
  medical_review_status TEXT NOT NULL,          -- PENDING, APPROVED, REJECTED
  effective_date        TIMESTAMPTZ NOT NULL,
  approved_by_id        UUID,
  approved_at           TIMESTAMPTZ,
  deprecated_at         TIMESTAMPTZ,            -- NULL = active
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL
);
```

**`wording_change_audit`** — Governance trail
```sql
CREATE TABLE wording_change_audit (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  template_id     UUID REFERENCES approved_wording_templates(id),
  wording_key     TEXT NOT NULL,
  change_type     TEXT NOT NULL,    -- CREATED, APPROVED, REJECTED, DEPRECATED, VERSION_BUMP
  actor_id        UUID NOT NULL,
  actor_role      TEXT NOT NULL,    -- PHYSICIAN, LEGAL, MEDICAL, COMPLIANCE, ADMIN
  reason          TEXT,
  previous_version TEXT,
  new_version     TEXT,
  timestamp       TIMESTAMPTZ NOT NULL
);
```

---

## 7. Developer Integration Guide

### 7.1 Retrieving Approved Wording

```typescript
import { WordingRepositoryService } from '@/lib/core/wording-repository-service';

// Get a specific clause
const coreConsent = await WordingRepositoryService.retrieveWordingBySection(
  'core_consent',
  'bilingual',
  { version: '1.0.0' } // optional: specific version
);

// Get all clauses for a document
const allClauses = await WordingRepositoryService.retrieveWordingForConsent({
  forSpecialty: 'Endocrinology',
  forProcedure: 'proc-123',
  language: 'bilingual'
});
```

### 7.2 Building a Structured Consent Document

```typescript
import { WordingRepositoryService } from '@/lib/core/wording-repository-service';
import type { ConsentDynamicFieldsSpecification } from '@/lib/core/wording-types';

const dynamicFields: ConsentDynamicFieldsSpecification = {
  diagnosis: 'Type 2 Diabetes Mellitus',
  procedureName: 'Insulin Therapy Initiation',
  expectedBenefits: 'Better glucose control, reduced complications',
  commonRisks: 'Hypoglycemia',
  // ... other dynamic fields
  physicianName: 'Dr. Ahmed Al-Zain',
  physicianLicenseNo: 'MOH-2024-0123456',
  consentDateTime: new Date(),
};

const consentDoc = await WordingRepositoryService.buildStructuredConsentDocument(
  patientId,
  procedureId,
  'Endocrinology',
  dynamicFields,
  'bilingual'
);

// consentDoc now has:
// - fixedSections: { coreConsent, physicianCertification, ... }
// - dynamicFields: { diagnosis, procedureName, ... }
// - arContent: Full Arabic text (fixed + dynamic combined)
// - enContent: Full English text (fixed + dynamic combined)
// - readOnlyFields: [ ... list of immutable paths ... ]
// - auditTrail: [ { changeType, actor, timestamp, ... } ]
```

### 7.3 Validating Consent Document

```typescript
const validation = await WordingRepositoryService.validateConsentDocument(consentDoc);

if (!validation.isValid) {
  console.error('Document validation failed:');
  validation.errors.forEach((err) => {
    console.error(`[${err.code}] ${err.message}`);
  });
  return;
}

// Document is valid; proceed to PDF generation or signing
```

### 7.4 AI Content Validation

```typescript
import { validateAiOutputAgainstWordingRepository } from '@/lib/core/ai-core';

const aiOutput = {
  diagnosis: 'Acute appendicitis',
  expectedBenefits: 'Removal of inflamed appendix',
  commonRisks: 'Bleeding, infection',
  // No fixed fields — this is allowed
};

try {
  validateAiOutputAgainstWordingRepository(aiOutput);
  // AI output is valid; use it to populate dynamic fields
  const updatedFields = { ...dynamicFields, ...aiOutput };
} catch (err) {
  if (err instanceof AiLegalClauseViolationError) {
    console.error('AI attempted to modify fixed clauses:', err.message);
    // Reject AI output entirely
  }
}
```

### 7.5 UI Integration

**In `ConsentDocument.tsx` component:**

```typescript
// Mark fixed sections as read-only
const isReadOnly = consentDoc.readOnlyFields.includes(fieldPath);

if (isReadOnly) {
  return (
    <div className="consent-field read-only">
      <LockIcon /> {/* Visual indicator */}
      <p>{content}</p>
      <span className="subtitle">This section is protected and cannot be edited</span>
    </div>
  );
}

// Allow editing for dynamic fields only
return (
  <textarea
    value={content}
    onChange={handleChange}
    disabled={isReadOnly}
  />
);
```

---

## 8. Enforcement & Audit

### 8.1 Pre-Submission Validation

Before allowing a consent document to be signed:

1. ✓ All fixed sections match approved template versions
2. ✓ No fixed clauses have been modified
3. ✓ All required dynamic fields are populated
4. ✓ Physician approval recorded with timestamp
5. ✓ Bilingual synchronization verified
6. ✓ AI content (if used) only in allowed fields

### 8.2 Audit Logging

Every change is recorded:

```typescript
interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: { userId, role, name };
  action: 'CREATED' | 'MODIFIED' | 'APPROVED' | 'SIGNED' | 'AI_POPULATED';
  fieldPath?: string;
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
}
```

### 8.3 Governance Compliance

- Legal & Medical roles can query change proposals
- Both must explicitly vote to approve wording changes
- Rejected proposals create audit trail with reason
- All versioning tracked (v1.0.0 → v1.1.0 → v2.0.0)

---

## 9. Deployment Checklist

- [ ] Migration 0020 deployed (approved_wording_templates, wording_change_audit)
- [ ] Wording templates seeded with all 7 fixed clauses (Arabic + English)
- [ ] `WordingRepositoryService` tests passing (12 tests)
- [ ] `ai-core.ts` wording validation integrated
- [ ] Feature flag `ENABLE_GOVERNANCE_WORKFLOW` configured
- [ ] `ConsentDocument.tsx` updated to mark fixed sections as read-only
- [ ] API routes gated by feature flag
- [ ] Audit logging enabled in DB
- [ ] Physician approval workflow verified end-to-end
- [ ] Legal/Medical review governance UI staged

---

## 10. Next Steps

1. **[Week 1]** Wire feature flags into existing consent routes
2. **[Week 1]** Add governance UI for wording repository CRUD
3. **[Week 2]** Implement specialty knowledge base seeding (14 specialties)
4. **[Week 2]** Build wording change proposal workflow (Legal + Medical approvals)
5. **[Week 3]** Full testing suite (API + workflow + webhook validation)
6. **[Week 3]** Bilingual synchronization enforcement in consent editor

---

## 11. References

- **Wording Types**: `src/lib/core/wording-types.ts`
- **Repository Service**: `src/lib/core/wording-repository-service.ts`
- **Tests**: `src/lib/core/wording-repository-service.test.ts`
- **AI Integration**: `src/lib/core/ai-core.ts` (wording validation section)
- **Database**: `prisma/migrations/0020_approved_wording_governance.sql`
- **Configuration**: `src/lib/config/feature-flags.ts` (ENABLE_GOVERNANCE_WORKFLOW)

---

**Approved by**: IMC Legal & Medical Governance Committee  
**Effective**: 2026-05-10  
**Last Review**: 2026-05-10
