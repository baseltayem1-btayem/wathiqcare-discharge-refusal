# Clinical Knowledge Engine — Domain Model

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Overview

This document defines the canonical domain entities for the Clinical Knowledge Engine (CKE). Each entity includes its purpose, key attributes, invariants, and relationships.

All entities are tenant-scoped. All content-bearing entities support localization and versioning.

---

## 2. Entity Catalog

### 2.1 ClinicalSpecialty

**Purpose:** Canonical classification of medical specialties. Procedures and packages belong to specialties.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier, e.g., `GENERAL_SURGERY` |
| `nameEn` | String | English display name |
| `nameAr` | String | Arabic display name |
| `parentId` | UUID? | Hierarchical specialties |
| `status` | Enum | `active` / `inactive` |
| `createdAt` / `updatedAt` | Timestamp | Audit |

**Invariants:**
- `code` is unique per tenant.
- Cannot be deactivated if active procedures reference it.

---

### 2.2 ClinicalDepartment

**Purpose:** Hospital operational unit. A department may map to one or more specialties.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier, e.g., `OP_THEATER` |
| `nameEn` / `nameAr` | String | Display names |
| `specialtyIds` | UUID[] | Related specialties |
| `status` | Enum | `active` / `inactive` |

---

### 2.3 ClinicalProcedure

**Purpose:** The single source of truth for a clinical procedure. One procedure maps to one active knowledge package.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Hospital/EHR procedure code |
| `nameEn` / `nameAr` | String | Procedure names |
| `shortNameEn` / `shortNameAr` | String? | Display variants |
| `specialtyId` | UUID | FK to ClinicalSpecialty |
| `departmentId` | UUID | FK to ClinicalDepartment |
| `categoryCode` | String | High-level bucket, e.g., `SURGICAL`, `DIAGNOSTIC` |
| `typicalDurationMinutes` | Int? | Optional operational guidance |
| `anesthesiaRequired` | Boolean | Default rule input |
| `keywords` | String[] | Search terms in both languages |
| `status` | Enum | `draft` / `active` / `inactive` |
| `externalMappings` | JSON | EHR code mappings (ICD-10, CPT, SNOMED) |

**Invariants:**
- `code` is unique per tenant.
- Only `active` procedures may have a `PUBLISHED` package.
- Deleting a procedure is a soft delete (`status = inactive`).

---

### 2.4 ClinicalKnowledgePackage

**Purpose:** The central aggregate. A versioned bundle of all content required for a procedure's consent journey.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `procedureId` | UUID | FK to ClinicalProcedure |
| `version` | String | Semantic, e.g., `2.1.0` |
| `versionMajor` | Int | Parsed from version |
| `versionMinor` | Int | Parsed from version |
| `versionPatch` | Int | Parsed from version |
| `effectiveDate` | Date | When package becomes active |
| `expiryDate` | Date? | When package ceases to be active |
| `status` | Enum | `draft` / `under_review` / `medically_approved` / `legally_approved` / `published` / `superseded` / `archived` |
| `governanceSnapshot` | JSON | IDs and timestamps of approvals |
| `requiredParticipantIds` | UUID[] | Derived from rules, stored for audit |
| `createdByUserId` | UUID | Author |
| `publishedByUserId` | UUID? | Publisher |
| `supersededByPackageId` | UUID? | Next version |

**Invariants:**
- Only one `PUBLISHED` package per procedure per tenant at any time.
- `PUBLISHED` requires `medically_approved` and `legally_approved` events.
- `effectiveDate` must be ≤ `expiryDate` when both present.
- A package is immutable after `PUBLISHED`.

---

### 2.5 PackageItem

**Purpose:** Junction between a package and its content entities, with package-specific ordering and overrides.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `packageId` | UUID | FK to ClinicalKnowledgePackage |
| `itemType` | Enum | `consent_form` / `education_material` / `risk_disclosure` / `alternative_treatment` / `decision_rule` |
| `itemId` | UUID | FK to content entity |
| `orderIndex` | Int | Display/execution order |
| `isRequired` | Boolean | Whether item is mandatory in the package |
| `packageOverrides` | JSON? | Tenant-specific wording overrides |

---

### 2.6 ConsentForm

**Purpose:** Legal document template. A form may be reused across multiple packages.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable form code |
| `titleEn` / `titleAr` | String | Display titles |
| `formType` | Enum | `procedure_consent` / `anesthesia_consent` / `blood_transfusion` / `research_consent` / `high_risk` / etc. |
| `riskLevel` | Enum | `standard` / `medium` / `high` / `critical` |
| `status` | Enum | `draft` / `under_review` / `approved` / `published` / `superseded` / `archived` |
| `version` | String | Semantic version |
| `effectiveDate` / `expiryDate` | Date | Validity window |
| `governanceSnapshot` | JSON | Approval evidence |
| `pdfTemplateUrl` | String? | Link to approved PDF asset |
| `requiresWitness` | Boolean | Default witness requirement |
| `requiresInterpreter` | Boolean | Default interpreter requirement |

**Invariants:**
- Only `PUBLISHED` forms may be referenced by a `PUBLISHED` package.
- A form version is immutable after publish.

---

### 2.7 ConsentFormSection

**Purpose:** Structured sections within a form (header, disclosure, risk, benefit, alternative, acknowledgment, signature).

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `formId` | UUID | FK to ConsentForm |
| `type` | Enum | `header` / `disclosure` / `risk` / `benefit` / `alternative` / `acknowledgment` / `signature` |
| `orderIndex` | Int | Display order |
| `titleEn` / `titleAr` | String? | Section titles |
| `contentEn` / `contentAr` | Text | Section body |
| `isRequired` | Boolean | Must be present in rendered output |
| `isEditableByPhysician` | Boolean | Allow physician notes |

---

### 2.8 EducationMaterial

**Purpose:** Patient-facing education content with optional comprehension checks.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier |
| `titleEn` / `titleAr` | String | Titles |
| `assetType` | Enum | `pdf` / `video` / `interactive` / `text` |
| `assetUrl` | String | Storage URL |
| `durationMinutes` | Int? | Expected consumption time |
| `status` | Enum | Same lifecycle as ConsentForm |
| `version` | String | Semantic version |
| `comprehensionCheckIds` | UUID[] | Linked checks |

---

### 2.9 ComprehensionCheck

**Purpose:** Validates patient understanding before signing.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `educationMaterialId` | UUID | FK |
| `questionEn` / `questionAr` | String | Question text |
| `options` | JSON | Array of `{id, labelEn, labelAr}` |
| `correctOptionId` | String | Correct answer |
| `explanationEn` / `explanationAr` | String | Explanation shown after answering |
| `passingScore` | Int | Defaults to 80 |

---

### 2.10 RiskDisclosure

**Purpose:** Governed risk statement. Reusable across packages and procedures.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier |
| `titleEn` / `titleAr` | String | Risk title |
| `descriptionEn` / `descriptionAr` | Text | Risk description |
| `riskLevel` | Enum | `standard` / `medium` / `high` / `critical` |
| `incidenceRate` | String? | Optional epidemiological note |
| `specialtyIds` | UUID[] | Applicable specialties |
| `status` / `version` | Enum / String | Same lifecycle as other content |

---

### 2.11 AlternativeTreatment

**Purpose:** Governed alternative treatment disclosure.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier |
| `titleEn` / `titleAr` | String | Alternative title |
| `descriptionEn` / `descriptionAr` | Text | Description |
| `specialtyIds` | UUID[] | Applicable specialties |
| `status` / `version` | Enum / String | Same lifecycle |

---

### 2.12 DecisionRule

**Purpose:** Configurable clinical-legal rule evaluated against patient context.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `code` | String | Stable identifier |
| `nameEn` / `nameAr` | String | Display name |
| `description` | Text | Clinical intent |
| `priority` | Int | Evaluation order |
| `condition` | JSON | Rule condition (see Rules Engine doc) |
| `action` | JSON | Rule action (see Rules Engine doc) |
| `status` | Enum | `draft` / `active` / `inactive` |
| `effectiveDate` / `expiryDate` | Date | Validity window |
| `createdBy` / `approvedBy` | UUID | Governance |

---

### 2.13 RequiredParticipant

**Purpose:** Derived requirement for a specific package/patient context.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `packageId` | UUID | FK |
| `participantType` | Enum | `witness` / `interpreter` / `guardian` / `anesthesiologist` / `second_physician` |
| `trigger` | JSON | Which rule(s) produced this requirement |
| `isMandatory` | Boolean | Blocking vs. advisory |

---

### 2.14 PackageVersion

**Purpose:** Explicit version lineage snapshot for audit and rollback.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `packageId` | UUID | FK |
| `version` | String | Snapshot version |
| `snapshot` | JSON | Full package snapshot at publish time |
| `createdAt` | Timestamp | When snapshot taken |
| `createdByUserId` | UUID | Publisher |

---

### 2.15 GovernanceEvent

**Purpose:** Append-only record of every lifecycle transition and approval.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Multi-tenancy |
| `entityType` | Enum | `procedure` / `package` / `form` / `education` / `risk` / `alternative` / `rule` |
| `entityId` | UUID | Target entity |
| `eventType` | Enum | `created` / `submitted_for_review` / `medically_approved` / `legally_approved` / `published` / `superseded` / `archived` / `rejected` |
| `actorUserId` | UUID | Who performed the action |
| `actorRole` | String | Role at time of action |
| `comment` | Text? | Approval/rejection note |
| `metadata` | JSON | Contextual evidence |
| `previousHash` | String | Chain integrity |
| `eventHash` | String | SHA-256 of this event |
| `createdAt` | Timestamp | Event time |

---

## 3. Relationships Summary

```
Tenant
├── ClinicalSpecialty[]
├── ClinicalDepartment[]
├── ClinicalProcedure[]
│   └── ClinicalKnowledgePackage[]
│       ├── PackageItem[]
│       │   ├── ConsentForm
│       │   ├── EducationMaterial
│       │   │   └── ComprehensionCheck[]
│       │   ├── RiskDisclosure
│       │   ├── AlternativeTreatment
│       │   └── DecisionRule
│       ├── RequiredParticipant[]
│       ├── PackageVersion[]
│       └── GovernanceEvent[]
├── ConsentForm[]
│   └── ConsentFormSection[]
├── EducationMaterial[]
│   └── ComprehensionCheck[]
├── RiskDisclosure[]
├── AlternativeTreatment[]
└── DecisionRule[]
        └── GovernanceEvent[] (via entityId)
```

---

## 4. Value Objects

### 4.1 KnowledgeAssembly

Produced by the Assembly Service for a specific patient encounter. Not persisted as a knowledge entity; persisted as part of the consent/discharge record.

| Attribute | Type |
|---|---|
| `assemblyId` | UUID |
| `tenantId` | UUID |
| `procedureId` | UUID |
| `packageId` | UUID |
| `packageVersion` | String |
| `consentForms` | ConsentForm[] |
| `educationMaterials` | EducationMaterial[] |
| `riskDisclosures` | RiskDisclosure[] |
| `alternativeTreatments` | AlternativeTreatment[] |
| `requiredParticipants` | RequiredParticipant[] |
| `decisionSupportSuggestions` | Suggestion[] |
| `blockers` | Blocker[] |
| `assembledAt` | Timestamp |

### 4.2 Suggestion

Advisory output from the Decision Rules Engine.

| Attribute | Type |
|---|---|
| `ruleId` | UUID |
| `type` | Enum |
| `severity` | Enum |
| `messageEn` / `messageAr` | String |
| `suggestedContentIds` | UUID[] |

### 4.3 Blocker

Blocking condition preventing package readiness.

| Attribute | Type |
|---|---|
| `key` | String |
| `severity` | Enum (`warning` / `blocking`) |
| `messageEn` / `messageAr` | String |

---

## 5. Localization Strategy

All content-bearing entities store bilingual fields inline (`*En`, `*Ar`). Future locales will be supported via a separate `ContentLocalization` table:

```
ContentLocalization
├── entityType
├── entityId
├── locale
├── fieldName
├── value
└── approvedBy
```

Until additional locales are required, the inline bilingual model keeps queries simple and performant.
