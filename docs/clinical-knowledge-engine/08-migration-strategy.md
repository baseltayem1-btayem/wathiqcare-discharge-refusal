# Clinical Knowledge Engine — Migration Strategy

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Migration Goal

Transform the existing static IMC Approved Consent Library into a governed, versioned Clinical Knowledge Engine without production downtime, data loss, or disruption to current workflows.

---

## 2. Source Inventory

| Source | Format | Current Use |
|---|---|---|
| `imcApprovedConsentLibrary.generated.ts` | Static TypeScript array | Content Mapping Engine, PhysicianConsentWorkflow |
| `ConsentProcedureCatalog` (Prisma) | Database table | Procedure catalog lookups |
| `ConsentTemplate` / `ConsentDocument` | Database tables | Production informed consent records |
| `apps/web/src/app/api/modules/informed-consents/forms/route.ts` | Static API | Approved forms listing |
| Existing PDF assets | Object storage / public folder | Patient-facing PDFs |

---

## 3. Target Inventory

| Target | Type | Purpose |
|---|---|---|
| `ClinicalSpecialty` | New DB table | Canonical specialties |
| `ClinicalDepartment` | New DB table | Canonical departments |
| `ClinicalProcedure` | New DB table | Canonical procedures |
| `ClinicalKnowledgePackage` | New DB table | Versioned procedure packages |
| `PackageItem` | New DB table | Package content references |
| `ConsentForm` | New DB table | Versioned form templates |
| `ConsentFormSection` | New DB table | Form sections |
| `EducationMaterial` | New DB table | Education assets |
| `ComprehensionCheck` | New DB table | Comprehension quizzes |
| `RiskDisclosure` | New DB table | Risk library |
| `AlternativeTreatment` | New DB table | Alternative library |
| `DecisionRule` | New DB table | Configurable rules |
| `GovernanceEvent` | New DB table | Audit chain |

---

## 4. Migration Phases

### Phase 0 — Schema Preparation (No Downtime)

1. Create all new CKE tables via additive Prisma migration.
2. Run migration in staging and production.
3. Verify no impact on existing APIs.

### Phase 1 — Seed from IMC Library (No Downtime)

1. Run a migration adapter script:
   - Map each unique specialty in IMC library to `ClinicalSpecialty`.
   - Map each unique department to `ClinicalDepartment`.
   - Map each library entry to `ClinicalProcedure`.
   - Create `ConsentForm` version `1.0.0` for each PDF.
   - Create `EducationMaterial` version `1.0.0` for each patient-education PDF.
   - Create standard `RiskDisclosure` and `AlternativeTreatment` entries.
   - Create `ClinicalKnowledgePackage` version `1.0.0` linking procedure to form/education/risks/alternatives.
   - Create `GovernanceEvent` records with `actorRole = SYSTEM` and `eventType = PUBLISHED`.
2. Validate row counts and referential integrity.

### Phase 2 — Side-by-Side Operation (No Downtime)

1. Existing production workflows continue using static library.
2. CKE is available behind feature flags for testing.
3. Content teams begin using governance UI to create draft versions.
4. No patient-facing changes.

### Phase 3 — Shadow Reads (No Downtime)

1. Enable feature flag for a single pilot tenant.
2. New V2 workspace calls CKE APIs.
3. System logs comparisons between static library results and CKE results.
4. Discrepancies are triaged and fixed.

### Phase 4 — Controlled Cutover (No Downtime)

1. For pilot tenant, route reads from static library to CKE.
2. Monitor error rates, completion rates, and audit integrity.
3. Expand to additional tenants one by one.

### Phase 5 — Static Library Decommission (Future)

1. After 6–12 months of stable CKE operation, mark static library as deprecated.
2. Remove static library code and data in a dedicated cleanup sprint.

---

## 5. Migration Adapter Logic

### 5.1 Specialty Mapping

```typescript
function deriveSpecialty(item: ImcLibraryItem): string {
  // Use item.specialty, normalize known variants.
  return normalizeSpecialty(item.specialty);
}
```

### 5.2 Department Mapping

```typescript
function deriveDepartment(item: ImcLibraryItem): string {
  return item.department || deriveDepartmentFromSpecialty(item.specialty);
}
```

### 5.3 Procedure Code Generation

```typescript
function deriveProcedureCode(item: ImcLibraryItem): string {
  // Prefer existing categoryCode; fallback to slugified title.
  return item.categoryCode || slugify(item.titleEn).toUpperCase();
}
```

### 5.4 Form Versioning

Each IMC library entry becomes:

- One `ConsentForm` version `1.0.0`.
- One `EducationMaterial` version `1.0.0` (if patient-education PDF exists).
- One `ClinicalKnowledgePackage` version `1.0.0`.

### 5.5 Risk & Alternative Defaults

For each procedure, seed:

- A generic risk disclosure (bleeding, infection, anesthesia).
- A generic alternative disclosure (non-surgical management, observation).

These defaults are flagged for clinical review and replacement with procedure-specific content over time.

---

## 6. Data Quality Checks

### 6.1 Pre-Migration

- Count rows in source library.
- Identify duplicates or missing fields.
- Map all unique specialty/department values.

### 6.2 Post-Migration

- Verify `ClinicalProcedure` count ≥ source procedure count.
- Verify every `PUBLISHED` package has at least one consent form.
- Verify `GovernanceEvent` exists for every published entity.
- Run audit-chain integrity check.

### 6.3 Validation Queries

```sql
-- Count published packages per procedure
SELECT procedure_id, COUNT(*) 
FROM "ClinicalKnowledgePackage" 
WHERE status = 'PUBLISHED' 
GROUP BY procedure_id 
HAVING COUNT(*) > 1;

-- Packages without items
SELECT p.id 
FROM "ClinicalKnowledgePackage" p
LEFT JOIN "PackageItem" i ON p.id = i.package_id
WHERE i.id IS NULL;

-- Governance coverage
SELECT entity_type, entity_id, COUNT(*) 
FROM "GovernanceEvent" 
GROUP BY entity_type, entity_id;
```

---

## 7. Rollback Plan

At any point before Phase 5:

1. Disable CKE feature flags.
2. Production reverts to static library.
3. CKE tables remain populated but unused.
4. No data loss; no patient impact.

After Phase 5, rollback requires data migration back to static format and is therefore avoided.

---

## 8. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Mapping errors | Shadow-read phase catches discrepancies before cutover. |
| Missing procedures | Fallback to manual form selection remains available. |
| Governance bottleneck | Migrated content is auto-published as v1.0.0; edits follow normal workflow. |
| Performance degradation | Indexes and caching; pilot tenant monitors latency. |
| Tenant isolation leak | All migration rows tagged with tenantId; queries always scoped. |

---

## 9. Timeline Estimate

| Phase | Duration |
|---|---|
| Phase 0 — Schema prep | 1 week |
| Phase 1 — Seed from IMC | 1 week |
| Phase 2 — Side-by-side | 2 weeks |
| Phase 3 — Shadow reads | 2 weeks |
| Phase 4 — Controlled cutover | 2–4 weeks |
| Phase 5 — Decommission | Future sprint (6–12 months) |

Total to production cutover: **8–12 weeks**.
