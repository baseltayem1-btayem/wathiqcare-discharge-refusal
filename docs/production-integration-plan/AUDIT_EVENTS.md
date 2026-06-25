# Content Mapping Audit Events

## Writer
All events are written via `writeConsentAudit` in `apps/web/src/lib/server/consent-library-service.ts`, which records to:

- `ConsentAuditEvent`
- `AuditLog`
- `AuditChainEvent`
- `ConsentTimelineEvent` (when `consentDocumentId` is known)

## Required Events

### `education_material_loaded`
- **When:** The Content Mapping Service returns an education material for a procedure.
- **Actor:** System (on behalf of the requesting physician).
- **Metadata:**
  - `procedureNameEn`
  - `procedureNameAr`
  - `educationAssetId`
  - `educationId`
  - `fileName`
  - `assetType`
  - `language`

### `education_material_viewed`
- **When:** The Education step is rendered and acknowledged by the physician or patient.
- **Actor:** Physician or patient user.
- **Metadata:**
  - `procedureNameEn`
  - `educationAssetId`
  - `viewedBy` (`PHYSICIAN` | `PATIENT`)
  - `viewedAt`

### `education_not_available`
- **When:** A procedure is found in the catalog but has no linked education material.
- **Actor:** System.
- **Metadata:**
  - `procedureNameEn`
  - `procedureCatalogId`
  - `specialty`

### `consent_form_loaded_from_library`
- **When:** The Content Mapping Service returns a consent form/template for a procedure.
- **Actor:** System.
- **Metadata:**
  - `procedureNameEn`
  - `templateId`
  - `templateVersionId`
  - `templateCode`
  - `version`
  - `language`

### `consent_ready_for_signature`
- **When:** The physician completes the Consent Preview step and marks the document ready for signature.
- **Actor:** Physician.
- **Metadata:**
  - `procedureNameEn`
  - `consentDocumentId`
  - `templateVersionId`
  - `educationAssetId` (if applicable)
  - `language`

## Supporting Events

### `content_mapping_requested`
- **When:** The `/content-mapping/resolve` endpoint is invoked.
- **Actor:** Physician.
- **Metadata:**
  - `procedure`
  - `tenantId`
  - `preferredLanguage`

### `content_mapping_not_found`
- **When:** The requested procedure is not found in the catalog.
- **Actor:** System.
- **Metadata:**
  - `procedure`
  - `tenantId`

### `content_mapping_fallback_used`
- **When:** The workflow falls back to manual category/template selection (flag off or mapping failed).
- **Actor:** Physician.
- **Metadata:**
  - `procedure`
  - `reason` (`FLAG_DISABLED` | `NOT_FOUND` | `ERROR`)

## Example Audit Payload

```ts
await writeConsentAudit({
  tenantId: "tenant-uuid",
  auth: { userId: "physician-uuid", role: "PHYSICIAN" },
  action: "consent_form_loaded_from_library",
  summary: "Consent form resolved for Abdominal Aortic Aneurysm",
  source: "content-mapping-service",
  caseId: "case-uuid",
  metadata: {
    procedureNameEn: "Abdominal Aortic Aneurysm",
    templateId: "tpl-uuid",
    templateVersionId: "tv-uuid",
    templateCode: "SURGICAL_PROCEDURE_CONSENT",
    version: "v1.0",
    language: "bilingual",
  },
});
```
