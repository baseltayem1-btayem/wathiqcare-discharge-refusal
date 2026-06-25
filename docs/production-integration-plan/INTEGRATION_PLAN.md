# Production Integration Plan — Content Mapping Engine

## Phase
Phase 45 — Safe production integration plan for the Consent Journey / Content Mapping Service.

## Objective
Enable the production informed-consent workflow to automatically resolve the correct consent form and patient education material from the Approved Forms Library when a physician selects a procedure, while preserving existing WathiqNote functionality and providing a clean rollback path.

## Constraints
- No production code changes in this phase.
- No changes to WathiqNote workflows, OTP/SMS/PDF services, or `main` branch until implementation phase is approved.
- All changes must be gated by the `FEATURE_CONTENT_MAPPING_ENGINE` feature flag.

---

## 1. Production Workflow Overview

The production physician informed-consent workflow is implemented in:

- **Entry page:** `apps/web/src/app/modules/informed-consents/page.tsx`
- **Main component:** `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx`
- **Current steps:** `patientEncounter` → `category` → `template` → `procedure` → `anesthesia` → `education` → `review` → `send`

Today, the workflow already attempts to resolve an IMC-approved package when a procedure name is entered:

```tsx
// PhysicianConsentWorkflow.tsx ~line 853
useEffect(() => {
  async function resolveImcPackage() {
    const response = await fetch(
      `/api/modules/informed-consents/imc-library/resolve?procedure=${encodeURIComponent(procedure)}`
    );
    // ... sets selectedImcPackage + workflow fields
  }
  resolveImcPackage();
}, [workflow.procedureName]);
```

The endpoint `/api/modules/informed-consents/imc-library/resolve` does not yet exist in the codebase. The Content Mapping Service will be implemented behind this endpoint (or a new dedicated endpoint) and consumed by the existing workflow effect.

---

## 2. Integration Point

### Where to call Content Mapping Service

**Primary trigger:** when the physician enters or selects a `procedureName` in the **procedure step** of `PhysicianConsentWorkflow.tsx`.

**Current code location:** `PhysicianConsentWorkflow.tsx` ~line 853, inside the `resolveImcPackage` `useEffect`.

**Proposed change:**
1. Gate the enhanced resolution logic with `FEATURE_CONTENT_MAPPING_ENGINE`.
2. Call the new backend endpoint `GET /api/modules/informed-consents/content-mapping/resolve?procedure=...&tenantId=...`.
3. Use the response to populate:
   - `workflow.templateName`
   - `workflow.consentCategory`
   - `workflow.educationPackage`
   - `workflow.anesthesiaReviewRequired`
   - `selectedImcPackage` / `selectedRuntimeTemplate`
4. Write audit events (see section 6).

### UI behavior

- **Template step (`template`):** `ImcApprovedLibraryCard` already displays the resolved package. No structural change; it consumes the mapping output.
- **Education step (`education`):** show education material review panel if `educationMaterial` is present; otherwise mark the step as "Not Applicable" and skip.
- **Review step (`review`):** include mapping metadata (procedure, specialty, consent form, version, language) in the readiness checklist.

---

## 3. Production API / Service Contract

### Endpoint

```http
GET /api/modules/informed-consents/content-mapping/resolve?procedure={procedureName}&tenantId={tenantId}
```

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `procedure` | string | yes | Procedure name or code entered by the physician. |
| `tenantId` | string | yes | Tenant scope for catalog lookups. |

### Response — 200 OK

```json
{
  "found": true,
  "procedureId": "abdominal-aortic-aneurysm",
  "procedureNameEn": "Abdominal Aortic Aneurysm",
  "procedureNameAr": "تمدد الأبهر البطني",
  "specialty": "Vascular Surgery",
  "department": "Vascular Surgery",
  "categoryCode": "VASCULAR_SURGERY",
  "consentType": "PROCEDURE_CONSENT",
  "language": "bilingual",
  "version": "v1.0",
  "anesthesiaRequired": true,
  "consentForm": {
    "templateId": "tpl-uuid",
    "templateVersionId": "tv-uuid",
    "fileName": "Abdominal Aortic Aneurysm.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm.pdf",
    "titleEn": "Abdominal Aortic Aneurysm",
    "titleAr": "تمدد الأبهر البطني",
    "kind": "CONSENT_FORM"
  },
  "educationMaterial": {
    "educationId": "edu-uuid",
    "assetId": "asset-uuid",
    "fileName": "Abdominal Aortic Aneurysm - Patient Copy.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm%20-%20Patient%20Copy.pdf",
    "titleEn": "Abdominal Aortic Aneurysm — Patient Education",
    "titleAr": "تمدد الأبهر البطني — نسخة المريض",
    "kind": "EDUCATION_MATERIAL",
    "assetType": "PDF"
  }
}
```

### Response — 404 Not Found

```json
{
  "found": false,
  "procedureName": "Unknown Procedure",
  "availableProcedures": ["Abdominal Aortic Aneurysm", "Adenotonsillectomy", ...]
}
```

### Service Layer

Promote the prototype service from:

```
apps/web/src/lib/prototype/content-mapping-service.ts
```

to:

```
apps/web/src/lib/server/content-mapping-service.ts
```

The production implementation must query Prisma instead of the static generated array:

1. Look up `ConsentProcedureCatalog` by `nameEn` or `procedureCode` (tenant-scoped, `isActive = true`).
2. Resolve the active `ConsentTemplate` + `ConsentTemplateVersion` linked to the procedure catalog (via a new join table or deterministic lookup by `templateCode`).
3. Resolve active `ProcedureEducation` + `ProcedureEducationAsset` (type `PDF`/`VIDEO`) linked to the procedure catalog.
4. Return the structured result above.

If no procedure catalog entry exists but a matching `ConsentTemplate` exists, fall back to the template alone with `educationMaterial: null`.

---

## 4. Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| Procedure found with both consent form and education material | Show all 5 steps: Procedure → Mapping → Education → Consent Preview → Ready for Signature. |
| Procedure found with consent form only | Skip Education step; stepper labels it "Not Applicable". Proceed directly to Consent Preview. |
| Procedure found with education material only | Return error; a consent form is mandatory. |
| Procedure not found | Show "Not found" message; allow manual category/template selection as today (fallback to current workflow). |
| Feature flag off | Keep current workflow unchanged; do not call the new endpoint. |

---

## 5. Feature Flag

### Name
`FEATURE_CONTENT_MAPPING_ENGINE`

### Definition
Add to `apps/web/src/lib/config/feature-flags.ts`:

```ts
export const FEATURE_CONTENT_MAPPING_ENGINE = envBool("FF_FEATURE_CONTENT_MAPPING_ENGINE", false);
```

### Gating strategy
- **Server-side:** check flag in the API route handler before invoking `content-mapping-service.ts`.
- **Client-side:** check flag in `PhysicianConsentWorkflow.tsx` before calling the new endpoint; if off, keep existing `resolveImcPackage` behavior.
- **Tenant override:** register the flag key in `tenant-flag-service.ts` so it can be enabled per tenant/module without a deploy.

---

## 6. Audit Events

All audit events must be written via the existing `writeConsentAudit` helper in `apps/web/src/lib/server/consent-library-service.ts`, which records to:

- `ConsentAuditEvent`
- `AuditLog`
- `AuditChainEvent`
- `ConsentTimelineEvent` (when a `consentDocumentId` is available)

### Required audit events

| Event | When | Metadata |
|-------|------|----------|
| `education_material_loaded` | Mapping service returns an education material. | `procedureName`, `educationAssetId`, `fileName`, `assetType` |
| `education_material_viewed` | Physician/patient reaches the Education step. | `procedureName`, `educationAssetId`, `viewedBy` |
| `education_not_available` | Mapping service returns no education material for a found procedure. | `procedureName`, `procedureCatalogId` |
| `consent_form_loaded_from_library` | Mapping service returns a consent form/template. | `procedureName`, `templateId`, `templateVersionId`, `templateCode` |
| `consent_ready_for_signature` | Physician completes Consent Preview and clicks "Ready for Signature". | `procedureName`, `consentDocumentId`, `templateVersionId` |

### Suggested additional events

| Event | When |
|-------|------|
| `content_mapping_requested` | The resolve endpoint is called. |
| `content_mapping_not_found` | Procedure not found in catalog. |
| `content_mapping_fallback_used` | Manual template selection used because mapping failed or flag was off. |

---

## 7. Implementation Sequence

1. **Database** — add linking between `ConsentProcedureCatalog` and `ConsentTemplate` if not present (likely a new relation table `ConsentProcedureCatalogTemplate`).
2. **Feature flag** — add `FEATURE_CONTENT_MAPPING_ENGINE` to feature-flags config and tenant flag registry.
3. **Service** — implement `apps/web/src/lib/server/content-mapping-service.ts` with Prisma lookups.
4. **API route** — add `apps/web/src/app/api/modules/informed-consents/content-mapping/resolve/route.ts`.
5. **UI integration** — modify `PhysicianConsentWorkflow.tsx` to call the new endpoint when the flag is on.
6. **Audit wiring** — add the five required audit events in service + UI.
7. **QA / rollback test** — verify flag-off behavior is unchanged; verify rollback.

---

## 8. Risk Assessment

See `RISK_ASSESSMENT.md` for full details. Summary:

| Risk | Severity | Mitigation |
|------|----------|------------|
| Workflow regression | High | Feature flag off by default; existing `resolveImcPackage` path preserved. |
| Missing catalog data | Medium | Fallback to manual selection; audit event logged. |
| Audit log volume | Low | Reuse existing `writeConsentAudit`; events are small. |
| Database schema change | Medium | Add only a relation table; no migrations to existing consent documents. |
| Performance | Low | Resolver is a small Prisma query; can be cached per tenant/procedure. |

---

## 9. Rollback Plan

1. Set `FF_FEATURE_CONTENT_MAPPING_ENGINE=false` (env) or disable tenant/module override.
2. Restart Next.js app.
3. Workflow reverts to current behavior.
4. No database rollback needed for the feature flag; relation table can remain unused.

See `ROLLBACK_PLAN.md` for the detailed runbook.
