# Clinical Knowledge Engine — Sprint 1 Deliverables

**Mission:** Build the foundation of the Clinical Knowledge Engine that will become the single source of truth for all clinical-legal workflows across WathiqCare.

**Sprint:** 1 — Architecture First  
**Date:** 2026-06-26  
**Status:** Complete  

---

## Core Principle

```
One Procedure
      ↓
One Clinical Knowledge Package
      ↓
One Patient Journey
```

---

## Deliverables

| # | Deliverable | Document |
|---|---|---|
| 1 | System, Domain & Service Architecture | [`01-architecture.md`](01-architecture.md) |
| 2 | Domain Model & Entity Relationships | [`02-domain-model.md`](02-domain-model.md) |
| 3 | Normalized ER Schema (Prisma) | [`03-er-schema.md`](03-er-schema.md) |
| 4 | Governance Lifecycle Model | [`04-governance-model.md`](04-governance-model.md) |
| 5 | Versioning Strategy | [`05-versioning-strategy.md`](05-versioning-strategy.md) |
| 6 | Configurable Decision Rules Engine | [`06-decision-rules-engine.md`](06-decision-rules-engine.md) |
| 7 | REST API Design | [`07-api-design.md`](07-api-design.md) |
| 8 | Migration Strategy from IMC Library | [`08-migration-strategy.md`](08-migration-strategy.md) |
| 9 | Module Integration Contract | [`09-module-integration.md`](09-module-integration.md) |
| 10 | Future Expansion Roadmap | [`10-future-expansion.md`](10-future-expansion.md) |

---

## Key Architectural Decisions

1. **Central aggregate:** `ClinicalKnowledgePackage` is the single contract consumed by all modules.
2. **Multi-tenant by design:** Every entity carries `tenantId`; tenant overlays inherit from a master catalog.
3. **Immutable published versions:** Once published, content is frozen; changes create new versions.
4. **Governance gates:** No unpublished content reaches production. Lifecycle transitions are explicit, auditable API calls.
5. **Configurable rules:** Decision rules are stored as JSON ASTs and evaluated at assembly time without code changes.
6. **Additive migration:** Existing IMC library and production workflows remain untouched during migration.
7. **Module integration:** All modules call `POST /api/v1/knowledge/assembly`; no module queries knowledge tables directly.
8. **Future-proof:** New verticals (clinical trials, telemedicine, vaccination, radiology) reuse the same schema with new enum values and rules.

---

## Schema Summary

New tables (additive):

- `ClinicalSpecialty`
- `ClinicalDepartment`
- `ClinicalProcedure`
- `ClinicalKnowledgePackage`
- `PackageItem`
- `ConsentForm`
- `ConsentFormSection`
- `EducationMaterial`
- `ComprehensionCheck`
- `RiskDisclosure`
- `AlternativeTreatment`
- `DecisionRule`
- `RequiredParticipant`
- `PackageVersion`
- `GovernanceEvent`
- `ContentLocalization` (future)

No existing tables are modified or deleted.

---

## Governance Lifecycle

```
DRAFT → UNDER_REVIEW → MEDICALLY_APPROVED → LEGALLY_APPROVED → PUBLISHED → SUPERSEDED → ARCHIVED
            ↓                ↓                      ↓
        REJECTED ─────────► DRAFT (revision loop)
```

---

## Migration Timeline

| Phase | Duration | Downtime |
|---|---|---|
| Schema preparation | 1 week | None |
| Seed from IMC Library | 1 week | None |
| Side-by-side operation | 2 weeks | None |
| Shadow reads | 2 weeks | None |
| Controlled cutover | 2–4 weeks | None |
| Static library decommission | Future (6–12 months) | Planned maintenance |

---

## Constraints Respected

- ✅ No production modification.
- ✅ No deployment.
- ✅ No merge to main.
- ✅ No existing APIs removed.
- ✅ No breaking database changes.
- ✅ Everything is additive.

---

## Next Sprints

- **Sprint 2:** Implement Prisma schema and migration adapter.
- **Sprint 3:** Build governance workflow and approval UI.
- **Sprint 4:** Implement rules engine and assembly service.
- **Sprint 5:** Build API layer and client SDK.
- **Sprint 6:** Shadow-read validation and production cutover planning.
