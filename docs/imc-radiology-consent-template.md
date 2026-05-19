# IMC Radiology & Interventional Imaging Consent Template

> **Status:** `draft_for_review` — preview library only.
> **Production safety:** This template is **NOT** wired into the
> production informed-consent workflow, the `generate-draft` API,
> patient search, RBAC/auth, Prisma schema, TrakCare integration, or
> the production PDF renderer. It is available **only** in the
> internal dynamic-consent preview surface.

---

## Identity

| Field           | Value                                              |
| --------------- | -------------------------------------------------- |
| Template ID     | `IMC-RAD-IMG-CONSENT-001`                          |
| Template code   | `IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT`     |
| Version         | `1.0.0`                                            |
| Status          | `draft_for_review`                                 |
| Module          | `informed-consents`                                |
| Category        | `radiology`                                        |
| Sub-category    | `medical_imaging_interventional_radiology`         |
| Risk level      | `high`                                             |
| Languages       | `en`, `ar` (default `bilingual`)                   |
| Owner           | International Medical Center (IMC) — WathiqCare    |

## Purpose

Captures legally compliant informed consent for radiology and
interventional-imaging procedures (contrast-enhanced studies, image-
guided biopsies, vascular interventions, etc.). Designed to satisfy
PDPL, electronic-evidence, OTP, and witness requirements once
promoted out of preview.

## Sections

1. **Patient & procedure identification** — name, MRN, national ID,
   encounter number, ordering / performing physician.
2. **Procedure explanation** — bilingual description of the imaging
   or interventional procedure.
3. **Contrast screening** — allergies, renal function, prior
   reactions, hydration plan.
4. **Sedation disclosure** — anesthesia/sedation plan, monitoring,
   recovery.
5. **Radiation risks disclosure** — cumulative dose, deterministic
   and stochastic risk language.
6. **Alternatives** — non-contrast / non-ionizing alternatives where
   clinically reasonable.
7. **Risks & complications** — severe reactions, bleeding, infection,
   organ injury, rare mortality.
8. **Declaration & signatures** — patient/guardian, performing
   physician, witness; bilingual.

## Evidence / signing capabilities

| Capability                                | Supported |
| ----------------------------------------- | --------- |
| Evidence ID required                      | ✅         |
| QR verification                           | ✅         |
| OTP support                               | ✅         |
| Electronic signature                      | ✅         |
| Audit hash                                | ✅         |
| Template version stamped                  | ✅         |
| Generated timestamp                       | ✅         |
| Public verify URL pattern                 | `/verify/{evidenceId}` |
| Internal preview verify URL pattern       | `/internal/verify/{evidenceId}?engine=dynamic-preview` |

## Registration

- File: `apps/web/src/modules/consent-engine/templates/imc-radiology-interventional-imaging-consent.ts`
- Registered in: `apps/web/src/modules/consent-engine/templates/index.ts`
  → `DYNAMIC_PREVIEW_TEMPLATE_REGISTRY["IMC-RAD-IMG-CONSENT-001"]`
- Demo entry: `apps/web/src/modules/consent-engine/legal-grade/specialty-demos.ts`
  → `SPECIALTY_DEMOS.radiology`

It is **not** added to the existing experimental `TEMPLATE_REGISTRY`
used by `resolveDynamicConsentTemplate(...)`, so the production
dynamic-consent resolver is unaffected.

## Internal preview URL

```
/internal/dynamic-consent-preview?engine=dynamic-preview&renderer=legal-grade&evidence=true&demo=radiology&language=bilingual
```

Expected UAT identifiers:

- Encounter number: `ENC-UAT-2026-0001`
- Case number: `CASE-2026-0001`
- Patient: `Najib الفلاح` (IMC-2026-02000)

## Rollback

If the template needs to be withdrawn:

1. Remove the `radiology` entry from `SPECIALTY_DEMOS` and the
   `"radiology"` member of `SpecialtyDemoId` in
   `apps/web/src/modules/consent-engine/legal-grade/specialty-demos.ts`.
2. Remove the `IMC-RAD-IMG-CONSENT-001` key from
   `DYNAMIC_PREVIEW_TEMPLATE_REGISTRY` and the re-export in
   `apps/web/src/modules/consent-engine/templates/index.ts`.
3. Delete `apps/web/src/modules/consent-engine/templates/imc-radiology-interventional-imaging-consent.ts`.
4. (Optional) Delete `apps/web/src/modules/consent-engine/templates/types.ts`
   if no other preview template uses it.
5. Re-run `npm run lint` and `npm run build` from `apps/web`.

No database, schema, migration, or production-renderer changes are
required for rollback because none were introduced.
