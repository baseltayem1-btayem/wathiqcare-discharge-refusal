# Content Mapping API Contract

## Endpoint

```http
GET /api/modules/informed-consents/content-mapping/resolve
```

## Purpose
Resolve a clinical procedure to its approved consent form and optional patient education material using the production catalog data.

## Authentication & Authorization
- Requires authenticated session (existing Next.js auth middleware).
- User must have access to the `informed-consents` module (reuse existing `canAccessModule` check).
- Tenant scoping via `tenantId` query parameter or session claim.

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `procedure` | `string` | yes | Procedure name (English) or `procedureCode`. Max 255 chars. |
| `tenantId` | `string` | yes | Tenant UUID. |
| `language` | `string` | no | Preferred language (`en`, `ar`, `bilingual`). Default `bilingual`. |

## Response — 200 OK

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
    "templateId": "uuid",
    "templateVersionId": "uuid",
    "templateCode": "SURGICAL_PROCEDURE_CONSENT",
    "fileName": "Abdominal Aortic Aneurysm.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm.pdf",
    "titleEn": "Abdominal Aortic Aneurysm",
    "titleAr": "تمدد الأبهر البطني",
    "kind": "CONSENT_FORM",
    "status": "APPROVED"
  },
  "educationMaterial": {
    "educationId": "uuid",
    "assetId": "uuid",
    "fileName": "Abdominal Aortic Aneurysm - Patient Copy.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm%20-%20Patient%20Copy.pdf",
    "titleEn": "Abdominal Aortic Aneurysm — Patient Education",
    "titleAr": "تمدد الأبهر البطني — نسخة المريض",
    "kind": "EDUCATION_MATERIAL",
    "assetType": "PDF",
    "durationMinutes": null
  }
}
```

## Response — 404 Not Found

```json
{
  "found": false,
  "procedureName": "Unknown Procedure",
  "availableProcedures": [
    "Abdominal Aortic Aneurysm",
    "Adenotonsillectomy",
    "Appendicectomy - Open"
  ]
}
```

## Response — 400 Bad Request

```json
{
  "error": "Missing required parameter: procedure"
}
```

## Response — 403 Forbidden

```json
{
  "error": "Access denied to informed-consents module"
}
```

## Service Function Interface

```ts
// apps/web/src/lib/server/content-mapping-service.ts

export type ContentMappingInput = {
  procedure: string;
  tenantId: string;
  preferredLanguage?: "en" | "ar" | "bilingual";
  request?: NextRequest; // for audit logging
};

export type ContentMappingOutput =
  | {
      found: true;
      procedureId: string;
      procedureNameEn: string;
      procedureNameAr: string;
      specialty: string;
      department: string;
      categoryCode: string;
      consentType: string;
      language: string;
      version: string;
      anesthesiaRequired: boolean;
      consentForm: MappedConsentForm;
      educationMaterial: MappedEducationMaterial | null;
    }
  | {
      found: false;
      procedureName: string;
      availableProcedures: string[];
    };

export async function resolveContentMapping(
  input: ContentMappingInput
): Promise<ContentMappingOutput>;
```

## Data Sources

| Output field | Source model(s) |
|--------------|-----------------|
| `procedureId`, `procedureNameEn/Ar`, `specialty`, `department` | `ConsentProcedureCatalog` |
| `categoryCode`, `consentType` | `ConsentTemplate` |
| `consentForm.templateId/VersionId` | `ConsentTemplate` → `ConsentTemplateVersion` |
| `consentForm.fileName/publicPath` | `ConsentTemplateVersion` localization or asset store |
| `educationMaterial.*` | `ProcedureEducation` → `ProcedureEducationAsset` |

## Error Handling

| Error | HTTP | Behavior |
|-------|------|----------|
| Missing parameter | 400 | Return error; UI keeps existing manual flow. |
| Unauthorized | 401/403 | Existing auth behavior. |
| Procedure not found | 404 | UI allows manual selection; audit `content_mapping_not_found`. |
| Consent template missing | 500 | Audit `content_mapping_error`; fallback to manual. |
