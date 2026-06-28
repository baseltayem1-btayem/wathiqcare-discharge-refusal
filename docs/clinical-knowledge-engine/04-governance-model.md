# Clinical Knowledge Engine — Governance Model

**Sprint:** 1 — Foundation  
**Status:** Architecture Draft  
**Date:** 2026-06-26  

---

## 1. Lifecycle

Every content entity in the Clinical Knowledge Engine follows a formal lifecycle:

```
                    ┌─────────────┐
                    │    DRAFT    │
                    └──────┬──────┘
                           │ Author submits for review
                           ▼
                    ┌─────────────┐
                    │ UNDER_REVIEW│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   REJECTED  │ │MEDICALLY_   │ │   (return   │
    │  (to draft) │ │  APPROVED   │ │   to draft) │
    └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ LEGALLY_    │
                    │  APPROVED   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PUBLISHED  │◄─── only state visible in production
                    └──────┬──────┘
                           │ New version published
                           ▼
                    ┌─────────────┐
                    │ SUPERSEDED  │
                    └──────┬──────┘
                           │ After retention period
                           ▼
                    ┌─────────────┐
                    │  ARCHIVED   │
                    └─────────────┘
```

---

## 2. Roles & Responsibilities

| Role | Authority |
|---|---|
| **Content Author** | Create drafts, edit own drafts, submit for review. |
| **Clinical Reviewer** | Review medical accuracy; approve/reject to `MEDICALLY_APPROVED`. |
| **Legal Reviewer** | Review legal defensibility; approve/reject to `LEGALLY_APPROVED`. |
| **Governance Lead** | Publish approved content, supersede old versions, archive. |
| **Tenant Admin** | Configure role assignments and escalation paths. |
| **System** | Automated transitions (e.g., effective date publish, expiry supersede). |

---

## 3. State Definitions

| State | Meaning | Who Can Transition Into It |
|---|---|---|
| `DRAFT` | Work in progress, not visible to production. | Author, System (on rejection) |
| `UNDER_REVIEW` | Submitted for clinical and legal review. | Author |
| `MEDICALLY_APPROVED` | Clinical reviewer has approved. | Clinical Reviewer |
| `LEGALLY_APPROVED` | Legal reviewer has approved. | Legal Reviewer |
| `PUBLISHED` | Active in production. | Governance Lead, System (on effective date) |
| `SUPERSEDED` | Replaced by a newer version; still readable historically. | System, Governance Lead |
| `ARCHIVED` | No longer readable except for legal hold/audit. | Governance Lead |
| `REJECTED` | Returned to author for revision. | Clinical/Legal Reviewer |

---

## 4. Transition Rules

```
DRAFT ──submit──► UNDER_REVIEW
UNDER_REVIEW ──clinical approve──► MEDICALLY_APPROVED
UNDER_REVIEW ──clinical reject──► REJECTED ──revise──► DRAFT
MEDICALLY_APPROVED ──legal approve──► LEGALLY_APPROVED
MEDICALLY_APPROVED ──legal reject──► REJECTED ──revise──► DRAFT
LEGALLY_APPROVED ──publish──► PUBLISHED
PUBLISHED ──new version──► SUPERSEDED
SUPERSEDED ──retention elapsed──► ARCHIVED
```

### 4.1 Allowed Transitions Matrix

| From → To | Allowed | Conditions |
|---|---|---|
| DRAFT → UNDER_REVIEW | Yes | All mandatory fields populated. |
| UNDER_REVIEW → MEDICALLY_APPROVED | Yes | Clinical reviewer approval event. |
| UNDER_REVIEW → REJECTED | Yes | Clinical or legal reviewer rejection with comment. |
| MEDICALLY_APPROVED → LEGALLY_APPROVED | Yes | Legal reviewer approval event. |
| MEDICALLY_APPROVED → REJECTED | Yes | Legal reviewer rejection with comment. |
| LEGALLY_APPROVED → PUBLISHED | Yes | Governance lead publishes; effective date set. |
| PUBLISHED → SUPERSEDED | Yes | Newer version published or expiry date reached. |
| SUPERSEDED → ARCHIVED | Yes | Retention period elapsed and no legal hold. |
| Any → DRAFT | No | Rejection routes to REJECTED, not DRAFT. |
| PUBLISHED → DRAFT | No | Must supersede and create new version. |

---

## 5. Approval Workflow

### 5.1 Parallel vs. Sequential Review

Default workflow is **sequential**:

1. Clinical review first.
2. Legal review second.

Optionally, tenants may enable **parallel review** where clinical and legal review happen simultaneously and both must approve before publish.

### 5.2 Approval Evidence

Each approval event records:

- `actorUserId`
- `actorRole`
- `comment` (mandatory for rejection, optional for approval)
- `metadata` (e.g., attached documents, review checklist answers)
- `createdAt`
- `eventHash` linking to previous governance event

### 5.3 Rejection Handling

A rejection:

- Moves entity to `REJECTED`.
- Requires a mandatory comment.
- Notifies the original author.
- Preserves the rejection event in the audit chain.
- Allows the author to create a new draft version addressing feedback.

---

## 6. Publishing Controls

### 6.1 Pre-Publish Checklist

Before an entity can be published, the system verifies:

- [ ] Status is `LEGALLY_APPROVED`.
- [ ] All linked content items are also `PUBLISHED` (for packages).
- [ ] Effective date is set and not in the distant future.
- [ ] No duplicate `PUBLISHED` version exists for the same procedure (packages only).
- [ ] Required sections/fields are populated.
- [ ] Governance lead authorization is present.

### 6.2 Supersession

When a new version is published:

1. Previous `PUBLISHED` version moves to `SUPERSEDED`.
2. `supersededByPackageId` is set on the old version.
3. A `SUPERSEDED` governance event is recorded.
4. Existing consent records reference the old version for audit; new assemblies use the new version.

---

## 7. Audit & Compliance

### 7.1 Governance Event Chain

Every lifecycle transition creates a `GovernanceEvent` with:

- SHA-256 hash of the event payload.
- `previousHash` linking to the prior event for the same entity.
- Tamper-evident verification endpoint.

### 7.2 Legal Hold

A governance lead may place a `LEGAL_HOLD` on any entity. While on hold:

- The entity cannot be archived.
- The entity cannot be deleted.
- A hold reason and expiry are recorded.

### 7.3 Retention

| Entity State | Retention Policy |
|---|---|
| `PUBLISHED` | Until superseded + legal review period. |
| `SUPERSEDED` | Configurable (default 7 years). |
| `ARCHIVED` | Permanent or per hospital policy. |
| `REJECTED` | 1 year, then hard delete or anonymize. |

---

## 8. Notifications

| Event | Recipients |
|---|---|
| Submitted for review | Clinical reviewers, governance lead |
| Medically approved | Legal reviewers, author |
| Medically rejected | Author |
| Legally approved | Governance lead, author |
| Legally rejected | Author, clinical reviewer |
| Published | All subscribers of the package |
| Superseded | Compliance team |
| Archived | Compliance team |

---

## 9. Multi-Tenant Governance

- Each tenant has its own content namespace.
- A tenant may inherit content from a shared "master" tenant (e.g., IMC baseline) and create tenant-specific overlays.
- Governance approvals are tenant-scoped. A master-tenant approval does not automatically publish in a child tenant.
- Tenant admins configure reviewer assignments per specialty/department.

---

## 10. API Semantics

All governance transitions are explicit API calls, not generic "update status":

```http
POST /api/knowledge/packages/:id/submit-for-review
POST /api/knowledge/packages/:id/approve-medically
POST /api/knowledge/packages/:id/approve-legally
POST /api/knowledge/packages/:id/publish
POST /api/knowledge/packages/:id/reject
POST /api/knowledge/packages/:id/supersede
POST /api/knowledge/packages/:id/archive
```

Each endpoint validates role, current state, and preconditions before transitioning and emitting a `GovernanceEvent`.
