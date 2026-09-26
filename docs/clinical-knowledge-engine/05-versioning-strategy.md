# Clinical Knowledge Engine — Versioning Strategy

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Versioning Philosophy

Every publishable entity in the Clinical Knowledge Engine is versioned. A version is an immutable snapshot. Once published, a version cannot be edited; changes create a new version.

Versioning guarantees:

- **Legal defensibility:** A consent record can point to the exact package version used.
- **Auditability:** Full lineage from first draft to current version.
- **Rollback:** A previous version can be re-published if a new version is withdrawn.
- **Backward compatibility:** Existing records continue to reference their original versions.

---

## 2. Semantic Versioning

The engine uses **semantic versioning** (`MAJOR.MINOR.PATCH`):

| Component | When to Increment | Examples |
|---|---|---|
| **MAJOR** | Substantive legal/clinical change that alters patient rights or risks. | New risk disclosure, changed procedure scope, new witness requirement. |
| **MINOR** | Clarification, wording improvement, or non-substantive addition. | Better Arabic translation, added FAQ, reordered sections. |
| **PATCH** | Typo fix, formatting, or metadata correction. | Spelling error, broken PDF link, updated governance owner name. |

### 2.1 Version Examples

| Version | Meaning |
|---|---|
| `1.0.0` | First published package for a procedure. |
| `1.1.0` | Improved patient education wording. |
| `1.1.1` | Fixed typo in Arabic section. |
| `2.0.0` | Added new material risk disclosure. |

---

## 3. Effective and Expiry Dates

Every version has:

- **Effective date:** When the version becomes eligible for use.
- **Expiry date:** When the version ceases to be eligible for new assemblies.

### 3.1 Rules

- A version is only returned by production APIs if:
  - `status = PUBLISHED`
  - `effectiveDate <= NOW()`
  - `expiryDate IS NULL OR expiryDate > NOW()`
- When a new version is published, the previous version's `expiryDate` is set to the new version's `effectiveDate`.
- If `expiryDate` passes without a successor, the package becomes unavailable for new assemblies until governance acts.

### 3.2 Future-Dated Publishing

A governance lead may publish a version with a future `effectiveDate`. The system:

- Stores it as `PUBLISHED`.
- Does not return it in production reads until the effective date.
- Automatically activates it at the effective date (via background job or lazy check).

---

## 4. Version Lineage

Each package version knows its predecessor and successor:

```
v1.0.0 ──► v1.1.0 ──► v1.1.1 ──► v2.0.0 ──► v2.1.0
```

### 4.1 Database Representation

- `ClinicalKnowledgePackage.supersededByPackageId` points to the next version.
- A separate `PackageVersion` table stores an immutable JSON snapshot of each published version for audit.

### 4.2 Lineage API

```http
GET /api/knowledge/packages/:id/lineage
```

Response:

```json
{
  "currentVersionId": "pkg-2-1-0",
  "currentVersion": "2.1.0",
  "versions": [
    { "id": "pkg-1-0-0", "version": "1.0.0", "status": "SUPERSEDED", "effectiveDate": "..." },
    { "id": "pkg-1-1-0", "version": "1.1.0", "status": "SUPERSEDED", "effectiveDate": "..." },
    { "id": "pkg-2-0-0", "version": "2.0.0", "status": "SUPERSEDED", "effectiveDate": "..." },
    { "id": "pkg-2-1-0", "version": "2.1.0", "status": "PUBLISHED", "effectiveDate": "..." }
  ]
}
```

---

## 5. Backward Compatibility

### 5.1 Historical Records

A signed consent record stores:

- `packageId`
- `packageVersion`
- `packageSnapshot` (immutable JSON copy at time of signing)

Even if the package is later superseded or archived, the original record remains legally valid and renderable.

### 5.2 In-Flight Assemblies

If a package is superseded while a physician is composing a consent:

- The current assembly may continue using the version it started with.
- A warning is shown: "A newer version is available.".
- The physician may choose to refresh to the latest version.

### 5.3 API Compatibility

The `ClinicalKnowledgeAPI` always returns the effective published version by default. Clients may explicitly request a specific version:

```http
GET /api/knowledge/procedures/:code/package?version=1.0.0
```

---

## 6. Content Reuse Across Versions

Reusable content entities (`ConsentForm`, `EducationMaterial`, `RiskDisclosure`, `AlternativeTreatment`, `DecisionRule`) are independently versioned. A package version references specific content versions.

Example:

```
Package v2.0.0
├── ConsentForm v3.1.0
├── EducationMaterial v1.2.0
├── RiskDisclosure v2.0.0
└── DecisionRule v1.0.0
```

When a content entity is updated, packages that reference it are **not** automatically updated. A governance user must explicitly create a new package version that references the new content version.

---

## 7. Version Comparison

### 7.1 Diff API

```http
GET /api/knowledge/packages/:id/diff?from=1.0.0&to=2.0.0
```

Returns a structured diff of:

- Added/removed content items.
- Changed sections.
- Changed decision rules.
- Changed required participants.

### 7.2 Diff Use Cases

- Legal review of new versions.
- Physician communication of changes.
- Compliance reporting.

---

## 8. Archival and Deletion

### 8.1 Archival

A version may be archived when:

- It is superseded.
- Its retention period has elapsed.
- No legal hold exists.

Archived versions are hidden from normal reads but remain available for audit and legal export.

### 8.2 Deletion

Hard deletion is prohibited for published content. Draft and rejected content may be hard-deleted after a cooling-off period (e.g., 90 days), subject to tenant policy.

---

## 9. Versioning Governance Events

Each versioning action creates a `GovernanceEvent`:

| Event | Trigger |
|---|---|
| `VERSION_CREATED` | New draft version saved. |
| `VERSION_PUBLISHED` | Version becomes active. |
| `VERSION_SUPERSEDED` | Newer version published. |
| `VERSION_EXPIRED` | Expiry date reached. |
| `VERSION_ARCHIVED` | Retention period elapsed. |
| `VERSION_ROLLBACK` | Older version re-published. |

---

## 10. Migration Versioning

During migration from the IMC library:

1. Each static form becomes `ConsentForm` version `1.0.0`.
2. Each procedure becomes `ClinicalProcedure` with a `ClinicalKnowledgePackage` version `1.0.0`.
3. Migration is recorded as a `GovernanceEvent` with `actorRole = SYSTEM`.
4. All migrated versions are marked `PUBLISHED` with effective date = migration date.

This gives the legacy library a clear version baseline without requiring manual re-approval.
