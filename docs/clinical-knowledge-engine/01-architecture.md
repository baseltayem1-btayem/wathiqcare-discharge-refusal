# Clinical Knowledge Engine — Architecture

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Vision

The Clinical Knowledge Engine (CKE) is the authoritative source of truth for all clinical-legal content across WathiqCare. It transforms static approved-form libraries into a living, versioned, governable knowledge graph:

```
One Procedure
      ↓
One Clinical Knowledge Package
      ↓
One Patient Journey
```

Every future module — Informed Consent, WathiqNote, Discharge Refusal, Home Healthcare, Clinical Trials, Telemedicine — consumes the same engine. No duplicated logic. No orphaned content. No unpublished content in production.

---

## 2. Design Principles

| Principle | Implication |
|---|---|
| **Single source of truth** | A procedure exists once. Its package, forms, education, risks, and rules are derived from that record. |
| **Multi-tenancy by design** | Every entity carries `tenantId`. Hospital-specific customizations are tenant-scoped overlays, not forks. |
| **Versioning is native** | Every published package is immutable. New versions supersede old ones with explicit effective/expiry dates. |
| **Governance gates** | Content cannot reach production without medical + legal approval. Lifecycle states are enforced at the API layer. |
| **Configurable rules** | Decision rules are data, not code. Clinical governance updates rules without engineering deployment. |
| **Localization built-in** | Arabic, English, and bilingual content are first-class citizens with explicit locale and fallback chains. |
| **Audit everything** | Every create, update, approval, publish, and supersede event is append-only and cryptographically traceable. |
| **Additive to production** | Existing IMC library, OTP/SMS/PDF engines, and APIs remain untouched. Migration is gradual and reversible. |

---

## 3. System Architecture

### 3.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  Doctor Workspace V2    Patient Portal    Admin Panel    External EMR       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Clinical Knowledge API                               │
│  /api/knowledge/packages    /api/knowledge/procedures                        │
│  /api/knowledge/forms       /api/knowledge/education                         │
│  /api/knowledge/rules       /api/knowledge/assembly                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Clinical Knowledge Engine                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  Procedure  │  │   Package    │  │    Rules    │  │   Assembly      │   │
│  │   Service   │  │   Service    │  │   Engine    │  │   Orchestrator  │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Form      │  │  Education   │  │    Risk     │  │   Governance    │   │
│  │   Service   │  │   Service    │  │   Service   │  │   Service       │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
│  PostgreSQL (Prisma)  ──  Versioned entities, audit log, governance state   │
│  Object Storage       ──  PDFs, videos, interactive education assets        │
│  Search Index         ──  Procedure/form full-text search (future)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Bounded Contexts

| Context | Responsibility | Stability |
|---|---|---|
| **Procedure Catalog** | Canonical list of clinical procedures, specialties, departments, codes. | High |
| **Knowledge Packaging** | Bundles procedure → forms + education + risks + alternatives + rules. | High |
| **Consent Forms** | Approved legal forms with sections, localization, and version lineage. | Medium |
| **Patient Education** | Education materials and comprehension checks. | Medium |
| **Risk & Alternatives** | Governed disclosure libraries. | High |
| **Decision Rules** | Clinical-legal business rules. | Medium |
| **Governance** | Approval workflows, lifecycle state machine, audit. | High |
| **Assembly** | Composes a context-specific consent package for a patient encounter. | Medium |

### 3.3 Non-Functional Requirements

- **Availability:** 99.9% for read APIs; governance writes are asynchronous to patient-facing flows.
- **Latency:** P95 read < 200ms for package resolution; assembly < 500ms.
- **Consistency:** Strong consistency for governance state; eventual consistency for search index.
- **Security:** Tenant isolation at the query layer; PII never in knowledge content.
- **Compliance:** Append-only audit; version lineage; legal hold support.

---

## 4. Domain Architecture

### 4.1 Core Aggregate: Clinical Knowledge Package

A `ClinicalKnowledgePackage` is the central aggregate. It is the only entity a consuming module needs to reference:

```
ClinicalKnowledgePackage
├── procedureId
├── version (semantic: major.minor)
├── effectiveDate
├── expiryDate
├── status (draft → review → approved → published → superseded → archived)
├── governanceSnapshot
├── packageItems
│   ├── ConsentFormReference
│   ├── EducationMaterialReference
│   ├── RiskDisclosureReference
│   ├── AlternativeTreatmentReference
│   └── DecisionRuleReference
└── requiredParticipants
```

### 4.2 Entity Relationships

```
ClinicalSpecialty 1──* ClinicalProcedure
ClinicalProcedure 1──* ClinicalKnowledgePackage
ClinicalKnowledgePackage *──* ConsentForm
ClinicalKnowledgePackage *──* EducationMaterial
ClinicalKnowledgePackage *──* RiskDisclosure
ClinicalKnowledgePackage *──* AlternativeTreatment
ClinicalKnowledgePackage *──* DecisionRule
ClinicalKnowledgePackage 1──* RequiredParticipant
ClinicalKnowledgePackage 1──* PackageVersion
ClinicalKnowledgePackage 1──* GovernanceEvent
```

### 4.3 Domain Invariants

1. A `ClinicalKnowledgePackage` must reference exactly one `ClinicalProcedure`.
2. A package in `PUBLISHED` state must have at least one consent form.
3. A package cannot be published without medical and legal approval events.
4. Only one package per procedure may be `PUBLISHED` at a time within a tenant.
5. Superseded packages remain readable for historical consent lookups.
6. Decision rules must reference only `PUBLISHED` packages or global libraries.
7. Unpublished content is never returned by production read APIs.

---

## 5. Service Architecture

### 5.1 Service Layer

| Service | Responsibility | Key Methods |
|---|---|---|
| `ProcedureCatalogService` | CRUD for procedures, specialties, departments; code mapping. | `createProcedure`, `resolveProcedure`, `searchProcedures` |
| `PackageService` | Lifecycle and resolution of knowledge packages. | `createPackage`, `publishPackage`, `resolvePackage`, `getPackageHistory` |
| `ConsentFormService` | Form versioning, section management, localization. | `createForm`, `publishForm`, `renderForm`, `getFormLineage` |
| `EducationService` | Education materials and comprehension checks. | `createMaterial`, `evaluateComprehension`, `getMaterialForProcedure` |
| `RiskLibraryService` | Risk and alternative disclosure management. | `createRisk`, `createAlternative`, `getRisksForProcedure` |
| `DecisionRuleService` | Rule authoring, validation, execution. | `createRule`, `evaluateRules`, `getActiveRules` |
| `GovernanceService` | Approval workflows, state transitions, audit. | `submitForReview`, `approveMedically`, `approveLegally`, `publish`, `supersede` |
| `AssemblyService` | Context-aware package composition. | `assemblePackage`, `validateAssembly`, `listBlockers` |
| `AuditService` | Append-only event logging. | `logEvent`, `verifyChain`, `getHistory` |

### 5.2 Dependency Direction

```
AssemblyService
  ├── PackageService
  │     ├── ProcedureCatalogService
  │     ├── ConsentFormService
  │     ├── EducationService
  │     ├── RiskLibraryService
  │     └── DecisionRuleService
  └── GovernanceService
        └── AuditService
```

### 5.3 API Gateway Pattern

All client modules call a single `ClinicalKnowledgeAPI` facade. The facade:

- Enforces tenant context.
- Resolves the effective package version for a procedure.
- Applies decision rules to patient context.
- Returns a normalized `KnowledgeAssembly` DTO.

Consuming modules (Informed Consent, WathiqNote, Discharge Refusal, Home Healthcare) never query knowledge tables directly.

---

## 6. Integration with Existing WathiqCare

### 6.1 Coexistence Strategy

```
Existing Production
├── IMC Approved Library (static)  ←── current source
├── Content Mapping Engine         ←── current feature flag
└── Physician Consent Workflow     ←── current UI

Clinical Knowledge Engine
├── Procedure Catalog              ←── new authoritative source
├── Knowledge Packages             ←── new authoritative source
└── Migration Adapter              ←── reads IMC library, writes CKE entities
```

### 6.2 Migration Path

1. **Phase A — Side-by-side:** CKE is populated from the IMC library. Existing workflows continue using static data.
2. **Phase B — Shadow reads:** Production workflows call both static library and CKE; results are compared and logged.
3. **Phase C — Cutover:** Feature flag routes reads to CKE. Static library becomes read-only backup.
4. **Phase D — Decommission:** Static library removed after 6–12 months of stable CKE operation.

### 6.3 Production Safety

- Existing APIs remain unchanged.
- Existing database tables are not altered.
- New tables are additive and prefixed with `ClinicalKnowledge`.
- Feature flags gate every CKE capability.
- Rollback is a single flag flip to the static library.

---

## 7. Future Expansion

The engine is designed to absorb new verticals without schema redesign:

| Future Module | How It Fits |
|---|---|
| **Clinical Trials** | New `consentType = RESEARCH_CONSENT`; adds `ResearchProtocol` and `IRBApproval` entities. |
| **Telemedicine** | New `encounterType = TELEMEDICINE`; rules engine adds `virtual-consent-required` rule. |
| **Blood Transfusion** | Existing `BLOOD_TRANSFUSION_CONSENT` type; package includes transfusion-specific risks. |
| **Vaccination** | New procedure category; package uses short-form consent and education. |
| **Radiology** | Existing `DIAGNOSTIC_IMAGING_CONSENT`; package adds contrast-agent risks. |
| **Surgery** | Core use case already supported via `PROCEDURE_CONSENT`. |
| **Research** | Adds `DataUseAgreement` and `BiobankConsent` form types. |

All additions reuse `ClinicalProcedure`, `ClinicalKnowledgePackage`, `DecisionRule`, and `GovernanceEvent`.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Package resolution correctness | ≥ 99% match rate vs. static library |
| Governance cycle time | ≤ 5 business days from draft to published |
| Rule change lead time | Same-day configuration, no deployment |
| Audit completeness | 100% of lifecycle transitions logged |
| Tenant isolation defects | 0 |
| Downtime during migration | 0 |

---

## 9. Next Sprints

- **Sprint 2:** Prisma schema implementation and migration adapter.
- **Sprint 3:** Governance workflow and approval UI.
- **Sprint 4:** Rules engine and assembly service.
- **Sprint 5:** API layer and client SDK.
- **Sprint 6:** Shadow-read validation and production cutover planning.
