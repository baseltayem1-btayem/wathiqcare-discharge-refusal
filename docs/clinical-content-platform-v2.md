# WathiqCare Clinical Content Platform V2

**Status:** Enterprise Sprint Delivery  
**Branch:** `feature/enterprise-sprint-clinical-content-platform`  
**Last Updated:** 2026-06-26  

---

## 1. Overview

The Clinical Content Platform V2 is the next-generation content layer for WathiqCare. It provides a governed, versioned, searchable registry of clinical content and powers the next-generation physician workspace without modifying the existing production consent, OTP, SMS, or PDF workflows.

All capabilities are isolated behind feature flags and default to **off**.

### Modules Delivered

1. **Approved Forms V2** — versioned, governable consent form registry.
2. **Doctor Workspace V2** — next-generation physician UI shell.
3. **Clinical Content Engine** — structured clinical content model and registry.
4. **Procedure Mapping Engine** — procedure → forms + education + risks + alternatives.
5. **Patient Education Engine** — education material retrieval and comprehension checks.
6. **Dynamic Consent Generator** — consent package assembly from clinical content.
7. **Clinical Decision Support** — advisory risk scoring and missing-disclosure detection.
8. **Production Integration** — tenant-scoped feature flags and non-destructive UI wiring.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Doctor Workspace V2 UI                          │
│  /modules/informed-consents/v2/workspace                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                         Clinical Content APIs                           │
│  /api/modules/clinical-content/forms                                   │
│  /api/modules/clinical-content/procedures                              │
│  /api/modules/clinical-content/education                               │
│  /api/modules/clinical-content/assemble                                │
│  /api/modules/clinical-content/decision-support                        │
│  /api/modules/clinical-content/feature-flag                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                      Clinical Content Engines                           │
│  Registry │ Procedure Mapping │ Education │ Dynamic Consent │ CDS       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                      Sources (additive)                                 │
│  IMC Approved Consent Library (static)                                  │
│  ConsentProcedureCatalog (Prisma, optional fallback)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Flags

All flags are read from environment variables and can be overridden per tenant/module via `FeatureFlagOverride`.

| Flag | Env Variable | Default | Scope |
|---|---|---|---|
| Master | `FF_ENABLE_CLINICAL_CONTENT_PLATFORM_V2` | `false` | Global / tenant / module |
| Approved Forms V2 | `FF_ENABLE_APPROVED_FORMS_V2` | `false` | Global / tenant / module |
| Doctor Workspace V2 | `FF_ENABLE_DOCTOR_WORKSPACE_V2` | `false` | Global / tenant / module |
| Clinical Content Engine | `FF_ENABLE_CLINICAL_CONTENT_ENGINE` | `false` | Global / tenant / module |
| Procedure Mapping Engine | `FF_ENABLE_PROCEDURE_MAPPING_ENGINE_V2` | `false` | Global / tenant / module |
| Patient Education Engine | `FF_ENABLE_PATIENT_EDUCATION_ENGINE` | `false` | Global / tenant / module |
| Dynamic Consent Generator | `FF_ENABLE_DYNAMIC_CONSENT_GENERATOR` | `false` | Global / tenant / module |
| Clinical Decision Support | `FF_ENABLE_CLINICAL_DECISION_SUPPORT` | `false` | Global / tenant / module |

### Enabling for Development

Add to `.env` (root) or `apps/web/.env.local`:

```bash
FF_ENABLE_CLINICAL_CONTENT_PLATFORM_V2=true
FF_ENABLE_APPROVED_FORMS_V2=true
FF_ENABLE_DOCTOR_WORKSPACE_V2=true
FF_ENABLE_CLINICAL_CONTENT_ENGINE=true
FF_ENABLE_PROCEDURE_MAPPING_ENGINE_V2=true
FF_ENABLE_PATIENT_EDUCATION_ENGINE=true
FF_ENABLE_DYNAMIC_CONSENT_GENERATOR=true
FF_ENABLE_CLINICAL_DECISION_SUPPORT=true
```

### Enabling for a Specific Tenant

Use the existing `FeatureFlagOverride` mechanism or the admin panel. The APIs resolve flags in this order:

1. Module override
2. Tenant override
3. Global override
4. Environment default

---

## 4. API Reference

### 4.1 Feature Flags

```http
GET /api/modules/clinical-content/feature-flag?tenantId={tenantId}
```

Returns the resolved state of all Clinical Content Platform V2 flags.

### 4.2 Approved Forms V2

```http
GET /api/modules/clinical-content/forms?tenantId={tenantId}&q={query}&category={category}&specialty={specialty}&riskLevel={riskLevel}
```

Returns approved consent forms with search and facet filters.

### 4.3 Procedure Mapping

```http
GET /api/modules/clinical-content/procedures?tenantId={tenantId}
GET /api/modules/clinical-content/procedures?tenantId={tenantId}&procedure={procedureName}
```

Lists procedures or resolves a specific procedure to its mapped content.

### 4.4 Patient Education

```http
GET /api/modules/clinical-content/education?tenantId={tenantId}&materialId={id}
POST /api/modules/clinical-content/education?tenantId={tenantId}
```

POST body:

```json
{
  "materialId": "...",
  "answers": { "q1": "b" },
  "durationSeconds": 120,
  "attempts": 1
}
```

### 4.5 Dynamic Consent Assembly

```http
POST /api/modules/clinical-content/assemble?tenantId={tenantId}
```

POST body:

```json
{
  "procedureName": "Abdominoplasty",
  "patientContext": {
    "capacityStatus": "competent",
    "languagePreference": "bilingual"
  },
  "physicianContext": {
    "physicianId": "doc-1",
    "name": "Dr. Example",
    "licenseNumber": "L-123",
    "specialty": "General Surgery",
    "department": "Surgery"
  },
  "preferredLanguage": "bilingual",
  "includeEducation": true,
  "includeDecisionSupport": true
}
```

### 4.6 Clinical Decision Support

```http
POST /api/modules/clinical-content/decision-support?tenantId={tenantId}
```

POST body:

```json
{
  "procedureName": "Adenotonsillectomy",
  "patientContext": {
    "capacityStatus": "competent",
    "languagePreference": "bilingual"
  },
  "disclosedRiskIds": [],
  "disclosedAlternativeIds": [],
  "includeEducation": true
}
```

---

## 5. UI Components

| Component | Path |
|---|---|
| Doctor Workspace V2 | `apps/web/src/components/clinical-content/doctor-workspace/DoctorWorkspaceV2.tsx` |
| Procedure Mapping Panel | `apps/web/src/components/clinical-content/doctor-workspace/ProcedureMappingPanel.tsx` |
| Consent Assembly Panel | `apps/web/src/components/clinical-content/doctor-workspace/ConsentAssemblyPanel.tsx` |
| Approved Forms V2 Panel | `apps/web/src/components/clinical-content/approved-forms/ApprovedFormsV2Panel.tsx` |
| Feature Flags Hook | `apps/web/src/components/clinical-content/shared/useClinicalContentFlags.ts` |

### Route

`/modules/informed-consents/v2/workspace`

When the master flag is enabled, a banner appears on the existing Informed Consents module linking to the V2 workspace.

---

## 6. Server Services

| Service | Path |
|---|---|
| Clinical Content Registry | `apps/web/src/lib/server/clinical-content/registry.ts` |
| Procedure Mapping Engine | `apps/web/src/lib/server/clinical-content/procedure-mapping.ts` |
| Patient Education Engine | `apps/web/src/lib/server/clinical-content/education.ts` |
| Dynamic Consent Generator | `apps/web/src/lib/server/clinical-content/dynamic-consent.ts` |
| Clinical Decision Support | `apps/web/src/lib/server/clinical-content/decision-support.ts` |
| Shared Types | `apps/web/src/lib/clinical-content/types.ts` |

---

## 7. Production Safety

- **No destructive migrations.** All data is sourced from existing static libraries or additive in-memory registries.
- **No OTP/SMS/PDF engine changes.** The platform produces structured assembly payloads; PDF generation remains untouched.
- **No production API removal.** Existing `/api/modules/informed-consents/**` routes continue to work.
- **All flags default to false.** The platform is invisible until explicitly enabled.
- **Tenant isolation preserved.** All APIs require tenant context and use existing auth guards.

---

## 8. Testing

Run the engine tests:

```bash
cd apps/web
npx tsx --test src/lib/server/clinical-content/clinical-content.test.ts
```

Current coverage:

- Registry seeding from IMC library
- Procedure mapping resolution and fallback
- Approved form search
- Education comprehension scoring
- Dynamic consent assembly (happy path + guardian blocker)
- Clinical decision support (anesthesia / high-risk pathway)

---

## 9. Next Steps

1. **Controlled UAT** — enable flags in a non-production tenant and validate end-to-end workflows.
2. **Prisma persistence** — optionally migrate registry content to database tables when governance requires edits without code changes.
3. **PDF integration** — wire the Dynamic Consent Generator output to the existing PDF engine via feature flag.
4. **EMR connector** — feed patient/encounter context from TrakCare/Epic into the assembly request.
5. **Governance workflow** — add approval gates for new content versions.

---

## 10. Related Documents

- `docs/product-roadmap-v1.0.md`
- `pilot-package/PILOT_READINESS_MASTER.md`
- `docs/FUTURE_AI_INTEGRATION.md`
- `apps/web/src/lib/config/feature-flags.ts`
