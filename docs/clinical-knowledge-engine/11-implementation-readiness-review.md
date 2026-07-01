# Clinical Knowledge Engine — Implementation Readiness Review

**Sprint:** 2 Pre-Planning  
**Status:** Ready for Review  
**Date:** 2026-06-26  
**Objective:** Define the minimum viable implementation subset, essential schema, first APIs, integration workflow, feature flags, migration seed, risks, and Sprint 2 build plan.

---

## 1. Minimum Viable Subset (MVP)

The MVP must enable a real physician to select a procedure in the Informed Consent module and receive an assembled consent package (form + education + risks + decision-support suggestions) from the Clinical Knowledge Engine, while the existing static IMC library continues to serve as a safe fallback.

### MVP Scope

| Capability | In MVP | Rationale |
|---|---|---|
| Procedure catalog | ✅ Yes | Must resolve procedure → package. |
| Knowledge package | ✅ Yes | Central aggregate; one package per procedure. |
| Consent form | ✅ Yes | Core output of the engine. |
| Form sections | ✅ Yes | Required to render structured consent. |
| Patient education material | ✅ Yes | Required for the education stage. |
| Risk disclosure | ✅ Yes | Required for physician disclosure. |
| Alternative treatment | ⚠️ Deferred | Can seed a generic placeholder; full library post-MVP. |
| Decision rules engine | ✅ Yes | Required for witness/interpreter/guardian suggestions. |
| Governance workflow | ✅ Yes (simplified) | Auto-publish migrated v1.0.0; manual publish for new drafts. |
| Package versioning | ✅ Yes (basic) | Effective/expiry dates + supersession. |
| Audit chain | ✅ Yes | Every publish/transition is logged. |
| Comprehension checks | ⚠️ Deferred | Education material can exist without quizzes initially. |
| Required participants table | ⚠️ Deferred | Derived at assembly time; persisted later for audit. |
| Package version snapshots | ⚠️ Deferred | Use package entity + governance events initially. |
| Clinical department table | ⚠️ Deferred | Inline department string on procedure initially. |
| Content localization table | ⚠️ Deferred | Inline bilingual fields cover AR/EN. |

### MVP Definition of Done

A physician in the Informed Consent module can:

1. Search/select a procedure.
2. See the resolved knowledge package.
3. View the consent form, education material, and risk disclosures.
4. See decision-support suggestions (witness/interpreter/guardian).
5. Assemble a consent draft that is auditable.
6. Fall back to the existing static library if the CKE flag is off.

---

## 2. Database Tables: Essential vs Deferred

### 2.1 Essential Tables (Sprint 2)

| Table | Purpose | MVP Notes |
|---|---|---|
| `ClinicalSpecialty` | Specialty taxonomy | Small seed set. |
| `ClinicalProcedure` | Canonical procedures | Seeded from IMC library. |
| `ClinicalKnowledgePackage` | Central aggregate | One published package per procedure. |
| `PackageItem` | Package-to-content junction | Links package to forms/education/risks/rules. |
| `ConsentForm` | Legal form templates | Seeded from IMC library. |
| `ConsentFormSection` | Form sections | Minimum: header + acknowledgment. |
| `EducationMaterial` | Patient education assets | Seeded from IMC library patient-copy PDFs. |
| `RiskDisclosure` | Governed risk statements | Seed generic risks per specialty. |
| `DecisionRule` | Configurable rules | Seed 5–10 essential rules. |
| `GovernanceEvent` | Audit chain | Record migration publish + future transitions. |

### 2.2 Deferred Tables (Post-MVP)

| Table | Deferred Reason |
|---|---|
| `ClinicalDepartment` | Can be inlined as a string on `ClinicalProcedure` for MVP. |
| `AlternativeTreatment` | Generic placeholder in form sections is sufficient initially. |
| `ComprehensionCheck` | Education material without quizzes still delivers value. |
| `RequiredParticipant` | Derived at assembly time; persistence adds complexity without MVP value. |
| `PackageVersion` | Package entity + governance events provide enough audit for MVP. |
| `ContentLocalization` | Inline AR/EN covers all current locales. |

### 2.3 Schema Additions Beyond Sprint 1 Architecture

For MVP simplicity, add these optional fields to essential tables:

- `ClinicalProcedure.departmentName` (String) — defers `ClinicalDepartment` table.
- `ClinicalKnowledgePackage.requiredParticipantsSnapshot` (JSON) — defers `RequiredParticipant` table.
- `ClinicalKnowledgePackage.packageSnapshot` (JSON) — defers `PackageVersion` table.

These fields are additive and can be migrated to dedicated tables later without data loss.

---

## 3. First API Endpoints Required for Real Use

### 3.1 Read Endpoints (Essential)

```http
GET  /api/v1/knowledge/procedures              # Search procedures
GET  /api/v1/knowledge/procedures/:id          # Get procedure detail
GET  /api/v1/knowledge/procedures/:code/package # Resolve effective package
GET  /api/v1/knowledge/forms/:id               # Get consent form
GET  /api/v1/knowledge/education/:id           # Get education material
GET  /api/v1/knowledge/risks                   # List risk disclosures
```

### 3.2 Assembly Endpoint (Essential)

```http
POST /api/v1/knowledge/assembly
```

This is the single endpoint the Informed Consent module calls.

### 3.3 Governance Endpoints (Simplified MVP)

```http
POST /api/v1/knowledge/packages/:id/submit-for-review
POST /api/v1/knowledge/packages/:id/approve-medically
POST /api/v1/knowledge/packages/:id/approve-legally
POST /api/v1/knowledge/packages/:id/publish
GET  /api/v1/knowledge/audit?entityType=PACKAGE&entityId=:id
```

### 3.4 Defer to Post-MVP

```http
POST /api/v1/knowledge/rules/evaluate        # Can be internal to assembly initially
GET  /api/v1/knowledge/packages/:id/versions # Nice-to-have for UI
GET  /api/v1/knowledge/packages/:id/diff     # Governance UI enhancement
POST /api/v1/knowledge/education/:id/evaluate # Comprehension checks deferred
```

---

## 4. First Workflow: Informed Consent Integration

### 4.1 Target User Flow

```
Physician opens Informed Consent module
        ↓
System checks FF_ENABLE_CLINICAL_KNOWLEDGE_ENGINE
        ↓
If OFF: use existing static library workflow (unchanged)
        ↓
If ON:  render new "Procedure Search" experience
        ↓
Physician types/selects procedure (e.g., "Appendectomy")
        ↓
Frontend calls POST /api/v1/knowledge/assembly
        ↓
Engine resolves effective package
        ↓
Engine evaluates decision rules against patient context
        ↓
Engine returns KnowledgeAssembly
        ↓
Physician reviews form + education + risks + suggestions
        ↓
Physician resolves blockers (e.g., add guardian)
        ↓
System stores assembly reference on consent draft
        ↓
Existing signing/PDF workflows take over
```

### 4.2 Fallback Behavior

If the assembly endpoint returns:

- `found: false` → prompt physician to use manual form selection.
- `blockers[]` → show blockers; prevent dispatch until resolved.
- `error` → log incident; fall back to static library.

### 4.3 Data Stored on Consent Record

When a consent is created from a CKE assembly, store:

- `knowledgeAssemblyId`
- `knowledgePackageId`
- `knowledgePackageVersion`
- `knowledgePackageSnapshot` (JSON)

This preserves legal defensibility even if the package is later superseded.

### 4.4 UI Integration Points

Modify only behind feature flag:

- Replace or augment procedure selector in `PhysicianConsentWorkflow`.
- Add "Knowledge Package" preview panel.
- Add decision-support suggestion cards.
- Add blocker alerts.

---

## 5. Feature Flags

### 5.1 Master Flag

| Flag | Env Var | Default | Purpose |
|---|---|---|---|
| `ENABLE_CLINICAL_KNOWLEDGE_ENGINE` | `FF_ENABLE_CLINICAL_KNOWLEDGE_ENGINE` | `false` | Master on/off for the entire engine. |

### 5.2 Capability Flags

| Flag | Env Var | Default | Purpose |
|---|---|---|---|
| `ENABLE_CKE_PROCEDURE_CATALOG` | `FF_ENABLE_CKE_PROCEDURE_CATALOG` | `false` | Use CKE for procedure lookups. |
| `ENABLE_CKE_PACKAGE_ASSEMBLY` | `FF_ENABLE_CKE_PACKAGE_ASSEMBLY` | `false` | Use CKE assembly endpoint. |
| `ENABLE_CKE_DECISION_RULES` | `FF_ENABLE_CKE_DECISION_RULES` | `false` | Evaluate decision rules in assembly. |
| `ENABLE_CKE_INFORMED_CONSENT_UI` | `FF_ENABLE_CKE_INFORMED_CONSENT_UI` | `false` | Show new procedure search/assembly UI. |
| `ENABLE_CKE_GOVERNANCE_UI` | `FF_ENABLE_CKE_GOVERNANCE_UI` | `false` | Show governance approval UI. |

### 5.3 Flag Resolution

All flags resolve via the existing `tenant-flag-service` hierarchy:

1. Module override
2. Tenant override
3. Global override
4. Environment default

### 5.4 Recommended Pilot Configuration

For the IMC pilot tenant in a non-production environment:

```bash
FF_ENABLE_CLINICAL_KNOWLEDGE_ENGINE=true
FF_ENABLE_CKE_PROCEDURE_CATALOG=true
FF_ENABLE_CKE_PACKAGE_ASSEMBLY=true
FF_ENABLE_CKE_DECISION_RULES=true
FF_ENABLE_CKE_INFORMED_CONSENT_UI=true
FF_ENABLE_CKE_GOVERNANCE_UI=false   # Manual DB/API governance for MVP
```

---

## 6. Migration Seed Source

### 6.1 Source

`apps/web/src/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated.ts`

Each entry has:

```typescript
{
  id: string;
  titleEn: string;
  titleAr: string;
  specialty: string;
  department: string;
  categoryCode: string;
  consentType: string;
  version: string;
  language: "bilingual";
  anesthesiaRequired: boolean;
  educationMaterialAvailable: boolean;
  hospitalPdfFilename: string;
  patientEducationPdfFilename: string;
  keywords: string[];
}
```

### 6.2 Mapping to MVP Schema

| IMC Field | MVP Entity / Field |
|---|---|
| `titleEn` / `titleAr` | `ClinicalProcedure.nameEn` / `nameAr` |
| `specialty` | `ClinicalSpecialty.nameEn` (normalized) |
| `department` | `ClinicalProcedure.departmentName` |
| `categoryCode` | `ClinicalProcedure.categoryCode` |
| `consentType` | `ConsentForm.formType` |
| `anesthesiaRequired` | `ClinicalProcedure.anesthesiaRequired` |
| `keywords` | `ClinicalProcedure.keywords` |
| `hospitalPdfFilename` | `ConsentForm.pdfTemplateUrl` |
| `patientEducationPdfFilename` | `EducationMaterial.assetUrl` |
| `version` | All seeded entities get version `1.0.0` |

### 6.3 Seed Rules

1. Each unique `specialty` becomes one `ClinicalSpecialty`.
2. Each IMC entry becomes one `ClinicalProcedure`.
3. Each IMC entry becomes one `ConsentForm` version `1.0.0`.
4. Each IMC entry with a patient-education PDF becomes one `EducationMaterial` version `1.0.0`.
5. Each IMC entry gets one generic `RiskDisclosure` per specialty.
6. Each procedure gets one `ClinicalKnowledgePackage` version `1.0.0` linking the above.
7. All seeded entities are auto-published with a `GovernanceEvent`.

### 6.4 Specialty Normalization

Known IMC specialty values must be normalized:

| Raw IMC Specialty | Normalized Specialty Code |
|---|---|
| `General / Other` | `GENERAL_SURGERY` |
| `ENT` | `ENT` |
| `Anesthesia` | `ANESTHESIA` |
| `Radiology / Interventional Radiology` | `RADIOLOGY` |
| `Gastroenterology` | `GASTROENTEROLOGY` |

A mapping dictionary must be maintained and reviewed with clinical governance.

---

## 7. Implementation Risks

### 7.1 High Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Procedure mapping mismatch** | Physician selects a procedure and gets the wrong package. | Medium | Shadow-read comparison against static library; manual mapping review for top 50 procedures. |
| **Governance bottleneck** | New content cannot be published quickly. | Medium | Auto-publish migrated v1.0.0; simplify MVP governance to medical + legal approval only. |
| **Performance regression** | Assembly latency > 500ms. | Low | In-memory rule cache; indexed package lookups; load testing. |
| **Tenant isolation defect** | Cross-tenant content leak. | Low | Tenant ID enforced on every query; automated integration tests. |

### 7.2 Medium Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Data quality issues in IMC library** | Missing Arabic titles, inconsistent specialties. | High | Pre-seed validation report; manual remediation workflow. |
| **Rule evaluation edge cases** | Rules conflict or produce incorrect requirements. | Medium | Rule priority system; unit tests for each rule; clinical review. |
| **User adoption** | Physicians prefer existing static workflow. | Medium | Feature-flag rollout; training materials; measure task completion time. |
| **Schema drift** | MVP shortcuts (inlined department, JSON snapshots) become permanent. | Medium | Document technical debt; schedule cleanup in Sprint 4/5. |

### 7.3 Low Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Database migration failure** | New tables fail to apply. | Low | Test migration in staging; use Prisma migrate; additive-only changes. |
| **PDF asset path changes** | Seeded forms point to missing PDFs. | Low | Validate asset URLs during seed; fallback to static library. |

---

## 8. Sprint 2 Build Plan

### 8.1 Sprint Goal

Implement the MVP Clinical Knowledge Engine schema, seed it from the IMC library, expose the first APIs, and integrate the Informed Consent workflow behind feature flags.

### 8.2 Tasks

#### Task 1 — Prisma Schema & Migration

**Owner:** Backend engineer  
**Files:**

- `prisma/schema.prisma` — add MVP tables.
- `prisma/migrations/2026xxxx_add_clinical_knowledge_engine/` — migration.

**Validation:**

- [ ] `npx prisma migrate dev` applies cleanly.
- [ ] `npx prisma generate` succeeds.
- [ ] No existing tables altered.

#### Task 2 — Migration Seed Adapter

**Owner:** Backend engineer  
**Files:**

- `apps/web/src/lib/server/clinical-knowledge/migration/seed-from-imc.ts`
- `apps/web/src/lib/server/clinical-knowledge/migration/specialty-normalization.ts`
- `apps/web/scripts/seed-clinical-knowledge.ts`

**Validation:**

- [ ] Seed script runs without errors.
- [ ] Row counts match expected counts.
- [ ] Every `PUBLISHED` package has ≥1 consent form.
- [ ] Governance events exist for every published entity.

#### Task 3 — Core Services

**Owner:** Backend engineer  
**Files:**

- `apps/web/src/lib/server/clinical-knowledge/services/procedure-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/package-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/form-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/education-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/risk-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/rule-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/assembly-service.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/governance-service.ts`

**Validation:**

- [ ] Unit tests for each service pass.
- [ ] Service integration tests pass.

#### Task 4 — Decision Rules Engine

**Owner:** Backend engineer  
**Files:**

- `apps/web/src/lib/server/clinical-knowledge/rules/rule-evaluator.ts`
- `apps/web/src/lib/server/clinical-knowledge/rules/default-rules.ts`

**Validation:**

- [ ] All default rules evaluate correctly against sample contexts.
- [ ] Rule priority ordering works.
- [ ] No rule produces false blockers for competent adults.

#### Task 5 — API Routes

**Owner:** Backend engineer  
**Files:**

- `apps/web/src/app/api/v1/knowledge/procedures/route.ts`
- `apps/web/src/app/api/v1/knowledge/procedures/[code]/package/route.ts`
- `apps/web/src/app/api/v1/knowledge/forms/[id]/route.ts`
- `apps/web/src/app/api/v1/knowledge/education/[id]/route.ts`
- `apps/web/src/app/api/v1/knowledge/risks/route.ts`
- `apps/web/src/app/api/v1/knowledge/assembly/route.ts`
- `apps/web/src/app/api/v1/knowledge/packages/[id]/publish/route.ts`
- `apps/web/src/app/api/v1/knowledge/audit/route.ts`

**Validation:**

- [ ] Each endpoint returns expected shape.
- [ ] Tenant isolation verified.
- [ ] Feature flag gating verified.

#### Task 6 — Feature Flags

**Owner:** Backend engineer  
**Files:**

- `apps/web/src/lib/config/feature-flags.ts` — add CKE flags.
- `.env.example` — add CKE env vars.

**Validation:**

- [ ] Flags default to `false`.
- [ ] Flags resolve via tenant-flag-service.
- [ ] APIs return 403 or fallback when flag is off.

#### Task 7 — Informed Consent UI Integration

**Owner:** Frontend engineer  
**Files:**

- `apps/web/src/components/clinical-knowledge/ProcedureSearch.tsx`
- `apps/web/src/components/clinical-knowledge/KnowledgePackagePreview.tsx`
- `apps/web/src/components/clinical-knowledge/DecisionSupportPanel.tsx`
- `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx` — gated changes only.

**Validation:**

- [ ] UI only appears when `FF_ENABLE_CKE_INFORMED_CONSENT_UI` is on.
- [ ] Procedure search resolves packages.
- [ ] Blockers prevent dispatch.
- [ ] Existing UI works when flag is off.

#### Task 8 — Tests

**Owner:** QA / Backend engineer  
**Files:**

- `apps/web/src/lib/server/clinical-knowledge/**/*.test.ts`
- `apps/web/tests/clinical-knowledge-api.test.ts`

**Validation:**

- [ ] Unit tests pass.
- [ ] API integration tests pass.
- [ ] Tenant isolation tests pass.
- [ ] Feature flag on/off tests pass.

#### Task 9 — Documentation

**Owner:** Architect / Tech lead  
**Files:**

- `docs/clinical-knowledge-engine/12-sprint-2-plan.md`
- `docs/clinical-knowledge-engine/13-runbook.md`

**Validation:**

- [ ] Seed runbook reviewed by DevOps.
- [ ] API contracts updated.

### 8.3 Sprint Schedule

| Week | Focus |
|---|---|
| Week 1 | Schema, migration adapter, core services |
| Week 2 | Rules engine, APIs, feature flags |
| Week 3 | Informed Consent UI integration, tests |
| Week 4 | Shadow-read validation, bug fixes, documentation |

### 8.4 Definition of Done for Sprint 2

- [ ] MVP schema migrated in staging.
- [ ] IMC library seeded into CKE tables.
- [ ] `/api/v1/knowledge/assembly` returns valid packages for top 50 procedures.
- [ ] Informed Consent module can use CKE when flags are on.
- [ ] Existing workflows unaffected when flags are off.
- [ ] All tests pass.
- [ ] No P1/P2 security or isolation issues.
- [ ] Documentation complete.

---

## 9. Deferred for Post-MVP

| Item | Target Sprint |
|---|---|
| Full governance UI | Sprint 3 |
| Package versioning UI | Sprint 3 |
| Comprehension checks | Sprint 3 |
| Alternative treatment library | Sprint 3 |
| `ClinicalDepartment` table | Sprint 4 |
| `RequiredParticipant` table | Sprint 4 |
| `PackageVersion` snapshots | Sprint 4 |
| Multi-module integration (WathiqNote, Discharge Refusal, Home Healthcare) | Sprint 5 |
| Static library decommission | Sprint 6+ |

---

## 10. Recommendation

**Proceed with Sprint 2 as planned.** The architecture is sufficiently detailed, the MVP subset is well-bounded, and the migration path is low-risk because all changes are additive and feature-flagged.

The highest-priority pre-implementation actions are:

1. Validate the specialty normalization mapping with clinical governance.
2. Confirm the top 50 procedures for shadow-read comparison.
3. Approve the 5–10 default decision rules.
