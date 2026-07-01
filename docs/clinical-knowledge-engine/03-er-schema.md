# Clinical Knowledge Engine — ER Schema

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Design Goals

- **Normalized:** No duplicate content. Reusable entities (forms, risks, education) are referenced, not copied.
- **Multi-tenant:** Every table has `tenantId` with composite unique constraints.
- **Versioned:** Packages and content entities carry semantic versions and effective/expiry dates.
- **Governed:** Lifecycle states and approval events are first-class tables.
- **Auditable:** Append-only `GovernanceEvent` chain with hash linking.
- **Localized:** Bilingual fields inline; extensible to additional locales.
- **Additive:** New tables coexist with existing production schema. No destructive migrations.

---

## 2. Table Inventory

| Table | Purpose |
|---|---|
| `ClinicalSpecialty` | Medical specialties |
| `ClinicalDepartment` | Hospital departments |
| `ClinicalProcedure` | Canonical procedures |
| `ClinicalKnowledgePackage` | Central package aggregate |
| `PackageItem` | Package-to-content junction |
| `ConsentForm` | Legal form templates |
| `ConsentFormSection` | Form sections |
| `EducationMaterial` | Patient education assets |
| `ComprehensionCheck` | Education quizzes |
| `RiskDisclosure` | Governed risk statements |
| `AlternativeTreatment` | Governed alternative statements |
| `DecisionRule` | Configurable rules |
| `RequiredParticipant` | Derived participant requirements |
| `PackageVersion` | Immutable publish snapshots |
| `GovernanceEvent` | Append-only audit chain |
| `ContentLocalization` | Future additional locales |

---

## 3. Entity-Relationship Diagram

```
┌────────────────────┐       ┌────────────────────────┐
│ ClinicalSpecialty  │◄──────┤    ClinicalProcedure   │
└────────────────────┘       └───────────┬────────────┘
                                         │
┌────────────────────┐       ┌───────────▼────────────┐
│ ClinicalDepartment │◄──────┤ ClinicalKnowledgePackage│
└────────────────────┘       └───────────┬────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
┌──────────▼──────────┐    ┌────────────▼────────────┐   ┌────────────▼────────────┐
│     PackageItem     │    │   RequiredParticipant   │   │    PackageVersion       │
└──────────┬──────────┘    └─────────────────────────┘   └─────────────────────────┘
           │
           ├──────────────► ConsentForm
           ├──────────────► EducationMaterial ──► ComprehensionCheck
           ├──────────────► RiskDisclosure
           ├──────────────► AlternativeTreatment
           └──────────────► DecisionRule

GovernanceEvent ─────────────► all entities (polymorphic by entityType + entityId)
```

---

## 4. Prisma Schema

This schema is additive. Existing tables are not modified.

```prisma
// ── Enums ─────────────────────────────────────────────────────────────────

enum ClinicalKnowledgeStatus {
  DRAFT
  UNDER_REVIEW
  MEDICALLY_APPROVED
  LEGALLY_APPROVED
  PUBLISHED
  SUPERSEDED
  ARCHIVED
  REJECTED
}

enum ClinicalProcedureStatus {
  DRAFT
  ACTIVE
  INACTIVE
}

enum PackageItemType {
  CONSENT_FORM
  EDUCATION_MATERIAL
  RISK_DISCLOSURE
  ALTERNATIVE_TREATMENT
  DECISION_RULE
}

enum ConsentFormType {
  PROCEDURE_CONSENT
  ANESTHESIA_CONSENT
  BLOOD_TRANSFUSION_CONSENT
  HIGH_RISK_PROCEDURE_CONSENT
  DIAGNOSTIC_IMAGING_CONSENT
  RESEARCH_CLINICAL_TRIAL_CONSENT
  TELEMEDICINE_CONSENT
  VACCINATION_CONSENT
  DATA_USE_AGREEMENT
  BIOBANK_CONSENT
}

enum RiskLevel {
  STANDARD
  MEDIUM
  HIGH
  CRITICAL
}

enum EducationAssetType {
  PDF
  VIDEO
  INTERACTIVE
  TEXT
}

enum DecisionRuleStatus {
  DRAFT
  ACTIVE
  INACTIVE
}

enum ParticipantType {
  WITNESS
  INTERPRETER
  GUARDIAN
  ANESTHESIOLOGIST
  SECOND_PHYSICIAN
}

enum GovernanceEventType {
  CREATED
  SUBMITTED_FOR_REVIEW
  MEDICALLY_APPROVED
  LEGALLY_APPROVED
  PUBLISHED
  SUPERSEDED
  ARCHIVED
  REJECTED
  MODIFIED
}

enum GovernanceEntityType {
  PROCEDURE
  PACKAGE
  FORM
  EDUCATION
  RISK
  ALTERNATIVE
  RULE
}

// ── Clinical Specialty & Department ────────────────────────────────────────

model ClinicalSpecialty {
  id          String   @id @default(uuid())
  tenantId    String
  code        String
  nameEn      String
  nameAr      String
  parentId    String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  procedures  ClinicalProcedure[]

  @@unique([tenantId, code])
  @@index([tenantId, status])
}

model ClinicalDepartment {
  id          String   @id @default(uuid())
  tenantId    String
  code        String
  nameEn      String
  nameAr      String
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateDate @updatedAt

  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  procedures   ClinicalProcedure[]
  specialties  ClinicalSpecialty[] @relation("DepartmentSpecialties")

  @@unique([tenantId, code])
  @@index([tenantId, status])
}

// ── Clinical Procedure ─────────────────────────────────────────────────────

model ClinicalProcedure {
  id                      String   @id @default(uuid())
  tenantId                String
  code                    String
  nameEn                  String
  nameAr                  String
  shortNameEn             String?
  shortNameAr             String?
  specialtyId             String
  departmentId            String
  categoryCode            String
  typicalDurationMinutes  Int?
  anesthesiaRequired      Boolean  @default(false)
  keywords                String[] @default([])
  externalMappings        Json?    // { icd10: [...], cpt: [...], snomed: [...] }
  status                  String   @default("draft")
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  specialty    ClinicalSpecialty @relation(fields: [specialtyId], references: [id])
  department   ClinicalDepartment @relation(fields: [departmentId], references: [id])
  packages     ClinicalKnowledgePackage[]

  @@unique([tenantId, code])
  @@index([tenantId, status])
  @@index([tenantId, specialtyId])
}

// ── Clinical Knowledge Package ─────────────────────────────────────────────

model ClinicalKnowledgePackage {
  id                    String                  @id @default(uuid())
  tenantId              String
  procedureId           String
  version               String
  versionMajor          Int
  versionMinor          Int
  versionPatch          Int
  effectiveDate         DateTime
  expiryDate            DateTime?
  status                ClinicalKnowledgeStatus @default(DRAFT)
  governanceSnapshot    Json?                   // { medicalApproval: {...}, legalApproval: {...} }
  requiredParticipantIds String[]               @default([])
  supersededByPackageId String?
  createdByUserId       String
  publishedByUserId     String?
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  tenant              Tenant    @relation(fields: [tenantId], references: [id])
  procedure           ClinicalProcedure @relation(fields: [procedureId], references: [id])
  items               PackageItem[]
  requiredParticipants RequiredParticipant[]
  versionSnapshots    PackageVersion[]
  governanceEvents    GovernanceEvent[]

  @@unique([tenantId, procedureId, version])
  @@index([tenantId, procedureId, status])
  @@index([tenantId, status, effectiveDate, expiryDate])
}

model PackageItem {
  id                String          @id @default(uuid())
  tenantId          String
  packageId         String
  itemType          PackageItemType
  itemId            String
  orderIndex        Int             @default(0)
  isRequired        Boolean         @default(true)
  packageOverrides  Json?           // tenant-specific wording overrides

  package ClinicalKnowledgePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@index([tenantId, packageId])
  @@index([tenantId, itemType, itemId])
}

// ── Consent Form ───────────────────────────────────────────────────────────

model ConsentForm {
  id                  String                  @id @default(uuid())
  tenantId            String
  code                String
  titleEn             String
  titleAr             String
  formType            ConsentFormType
  riskLevel           RiskLevel               @default(STANDARD)
  status              ClinicalKnowledgeStatus @default(DRAFT)
  version             String
  effectiveDate       DateTime
  expiryDate          DateTime?
  governanceSnapshot  Json?
  pdfTemplateUrl      String?
  requiresWitness     Boolean                 @default(false)
  requiresInterpreter Boolean                 @default(false)
  createdByUserId     String
  publishedByUserId   String?
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt

  tenant     Tenant    @relation(fields: [tenantId], references: [id])
  sections   ConsentFormSection[]
  items      PackageItem[]

  @@unique([tenantId, code, version])
  @@index([tenantId, status])
  @@index([tenantId, formType, status])
}

model ConsentFormSection {
  id                  String   @id @default(uuid())
  tenantId            String
  formId              String
  type                String   // header | disclosure | risk | benefit | alternative | acknowledgment | signature
  orderIndex          Int
  titleEn             String?
  titleAr             String?
  contentEn           String?
  contentAr           String?
  isRequired          Boolean  @default(true)
  isEditableByPhysician Boolean @default(false)

  form ConsentForm @relation(fields: [formId], references: [id], onDelete: Cascade)

  @@index([tenantId, formId, orderIndex])
}

// ── Education Material ─────────────────────────────────────────────────────

model EducationMaterial {
  id                String                  @id @default(uuid())
  tenantId          String
  code              String
  titleEn           String
  titleAr           String
  assetType         EducationAssetType
  assetUrl          String
  durationMinutes   Int?
  status            ClinicalKnowledgeStatus @default(DRAFT)
  version           String
  effectiveDate     DateTime
  expiryDate        DateTime?
  governanceSnapshot Json?
  createdByUserId   String
  publishedByUserId String?
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt

  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  comprehensionChecks ComprehensionCheck[]
  items             PackageItem[]

  @@unique([tenantId, code, version])
  @@index([tenantId, status])
}

model ComprehensionCheck {
  id              String   @id @default(uuid())
  tenantId        String
  educationMaterialId String
  questionEn      String
  questionAr      String
  options         Json     // [{ id, labelEn, labelAr }]
  correctOptionId String
  explanationEn   String
  explanationAr   String
  passingScore    Int      @default(80)

  educationMaterial EducationMaterial @relation(fields: [educationMaterialId], references: [id], onDelete: Cascade)

  @@index([tenantId, educationMaterialId])
}

// ── Risk & Alternatives ────────────────────────────────────────────────────

model RiskDisclosure {
  id              String                  @id @default(uuid())
  tenantId        String
  code            String
  titleEn         String
  titleAr         String
  descriptionEn   String
  descriptionAr   String
  riskLevel       RiskLevel               @default(STANDARD)
  incidenceRate   String?
  specialtyIds    String[]                @default([])
  status          ClinicalKnowledgeStatus @default(DRAFT)
  version         String
  effectiveDate   DateTime
  expiryDate      DateTime?
  governanceSnapshot Json?
  createdByUserId String
  publishedByUserId String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  items  PackageItem[]

  @@unique([tenantId, code, version])
  @@index([tenantId, status])
  @@index([tenantId, specialtyIds])
}

model AlternativeTreatment {
  id              String                  @id @default(uuid())
  tenantId        String
  code            String
  titleEn         String
  titleAr         String
  descriptionEn   String
  descriptionAr   String
  specialtyIds    String[]                @default([])
  status          ClinicalKnowledgeStatus @default(DRAFT)
  version         String
  effectiveDate   DateTime
  expiryDate      DateTime?
  governanceSnapshot Json?
  createdByUserId String
  publishedByUserId String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  items  PackageItem[]

  @@unique([tenantId, code, version])
  @@index([tenantId, status])
}

// ── Decision Rules ─────────────────────────────────────────────────────────

model DecisionRule {
  id            String              @id @default(uuid())
  tenantId      String
  code          String
  nameEn        String
  nameAr        String
  description   String?
  priority      Int                 @default(0)
  condition     Json                // rule condition AST
  action        Json                // rule action AST
  status        DecisionRuleStatus  @default(DRAFT)
  effectiveDate DateTime
  expiryDate    DateTime?
  createdByUserId String
  approvedByUserId String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  items  PackageItem[]

  @@unique([tenantId, code])
  @@index([tenantId, status])
}

// ── Required Participants ──────────────────────────────────────────────────

model RequiredParticipant {
  id              String          @id @default(uuid())
  tenantId        String
  packageId       String
  participantType ParticipantType
  trigger         Json            // { ruleIds: [...], reason: "..." }
  isMandatory     Boolean         @default(true)

  package ClinicalKnowledgePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@index([tenantId, packageId])
}

// ── Package Version Snapshots ──────────────────────────────────────────────

model PackageVersion {
  id            String   @id @default(uuid())
  tenantId      String
  packageId     String
  version       String
  snapshot      Json     // full immutable snapshot
  createdByUserId String
  createdAt     DateTime @default(now())

  package ClinicalKnowledgePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@unique([tenantId, packageId, version])
}

// ── Governance Audit Chain ─────────────────────────────────────────────────

model GovernanceEvent {
  id            String              @id @default(uuid())
  tenantId      String
  entityType    GovernanceEntityType
  entityId      String
  eventType     GovernanceEventType
  actorUserId   String
  actorRole     String
  comment       String?
  metadata      Json?
  previousHash  String?
  eventHash     String
  createdAt     DateTime            @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, entityType, entityId])
  @@index([tenantId, entityType, entityId, createdAt])
}

// ── Future: Additional Locales ─────────────────────────────────────────────

model ContentLocalization {
  id          String   @id @default(uuid())
  tenantId    String
  entityType  String
  entityId    String
  locale      String
  fieldName   String
  value       String
  approvedBy  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([tenantId, entityType, entityId, locale, fieldName])
  @@index([tenantId, entityType, entityId])
}
```

---

## 5. Key Constraints

| Constraint | Implementation |
|---|---|
| One published package per procedure | Partial unique index: `[tenantId, procedureId]` where `status = PUBLISHED` |
| Immutable published package | Application-level enforcement + `PackageVersion` snapshot |
| Unpublished content hidden | All read APIs filter `status = PUBLISHED` |
| Tenant isolation | Every query includes `tenantId` filter |
| Approval required | State machine enforces `MEDICALLY_APPROVED` and `LEGALLY_APPROVED` before `PUBLISHED` |

---

## 6. Indexing Strategy

- **Tenant + status** on every content table for list queries.
- **Tenant + procedureId + status** on `ClinicalKnowledgePackage` for package resolution.
- **Tenant + packageId** on `PackageItem` for package expansion.
- **Tenant + entityType + entityId + createdAt** on `GovernanceEvent` for audit history.
- **GIN index** on `keywords` arrays for full-text search (PostgreSQL).

---

## 7. Migration Notes

This schema is purely additive. Existing tables such as `ConsentTemplate`, `ConsentDocument`, `ConsentProcedureCatalog`, and user tables are untouched. The migration adapter will populate these new tables from the existing IMC approved library and current consent templates.
