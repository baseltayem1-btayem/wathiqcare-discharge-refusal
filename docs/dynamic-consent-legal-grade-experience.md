# Dynamic Consent — Legal-Grade Visual Experience

> **Phase 3 of the Dynamic Consent Engine.**
> Visual + legal + UX maturity layer for the **internal preview only**.
> Does **not** replace the production renderer or any existing consent workflow.

---

## 1. Scope

Phase 3 introduces a medico-legal-grade visual experience for the dynamic consent
engine. All artifacts are **additive, isolated, and feature-gated**. Nothing in the
existing production informed-consent workflow is modified.

What this phase delivers:

- An enterprise-grade design system (typography, spacing, colors, print, RTL, branding)
- A new HTML renderer (`legal-grade-renderer.ts`) parallel to the production renderer
- Risk visualization with severity tiers (LOW / MODERATE / HIGH / CRITICAL)
- Signature zones (Patient, Physician, Interpreter, Witness) with timestamp placeholders
- An audit / QR-placeholder footer (evidence ID, template version, audit hash, fingerprint)
- Six specialty demo presets (Cardiology, General Surgery, Orthopedics, Anesthesia, DAMA, Blood Transfusion)
- An enhanced internal preview page with renderer / specialty / language switches and print

What this phase explicitly does **not** do:

- Does **not** modify the production renderer (`renderers/html-renderer.ts`)
- Does **not** modify the production informed-consent API or workflow
- Does **not** modify the consent payload schema or types
- Does **not** generate real QR codes (placeholder only)
- Does **not** persist documents, write to the database, or alter any patient record
- Does **not** appear in production navigation

---

## 2. Feature gating

The preview surface remains gated exactly as in Phase 2:

- Environment flag: `ENABLE_DYNAMIC_CONSENT_ENGINE=true`, **or**
- Per-request override: `?engine=dynamic-preview`

If neither is present, the API returns `403`.

The legal-grade renderer is **opt-in** even when the feature flag is active:

- `?renderer=legal-grade` → use the new enterprise renderer
- `?renderer=default` (or omitted) → use the existing baseline renderer

This preserves Phase 2 behavior byte-for-byte when callers do not opt in.

---

## 3. File layout

```
apps/web/src/modules/consent-engine/
├── design-system/                  # NEW — pure token modules
│   ├── branding.ts
│   ├── colors.ts
│   ├── index.ts
│   ├── print.ts
│   ├── rtl.ts
│   ├── spacing.ts
│   └── typography.ts
├── legal-grade/                    # NEW — renderer + visual modules
│   ├── audit-footer.ts
│   ├── escape.ts
│   ├── index.ts
│   ├── legal-grade-renderer.ts
│   ├── risk-visualization.ts
│   ├── signature-block.ts
│   ├── specialty-demos.ts
│   └── stylesheet.ts
└── renderers/
    └── html-renderer.ts            # UNCHANGED — production renderer
```

```
apps/web/app/
├── api/internal/dynamic-consent/preview/route.ts   # extended (additive)
└── internal/dynamic-consent-preview/page.tsx       # enhanced UI
```

---

## 4. Design system tokens

All tokens are **pure constants**; nothing executes at import time.

| File             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
| `typography.ts`  | Latin / Arabic / serif / mono font stacks; size hierarchy            |
| `spacing.ts`     | Grid spacing, signature block dimensions, shell padding              |
| `colors.ts`      | Print-safe palette; severity tiers; audit footer surface             |
| `print.ts`       | A4 page size, margins, page-break rules, footer reserve              |
| `rtl.ts`         | Direction resolvers, bilingual grid helper                           |
| `branding.ts`    | WathiqCare™ + IMC branding strings + inline SVG logo mark            |

The inline SVG logo mark eliminates external network dependencies for the
preview HTML (per the "do not hardcode unstable assets" rule).

---

## 5. Legal-grade renderer

`legal-grade-renderer.ts` consumes the existing `DynamicConsentBuildResult` shape
(template, payload, sections, risks, alternatives, warnings, audit, generatedAt)
and returns a fully self-contained HTML document with:

1. **Branded medico-legal header**
   - WathiqCare™ logo + IMC partner label
   - Classification banner (`MEDICO-LEGAL DOCUMENT` / `وثيقة طبية قانونية`)
   - Consent-type / specialty / version badges

2. **Title block**
   - Bilingual document title (EN + AR) with serif legal typography
   - Patient / MRN / case / encounter / department / diagnosis / procedure / physician
     metadata grid

3. **Sections (§01, §02, …)**
   - Layered (informational / decisional / declarative) with mono section markers
   - Bilingual side-by-side when `language === "bilingual"`, single-column otherwise
   - `page-break-inside: avoid` on every section

4. **Anesthesia plan** (rendered only when `payload.anesthesia.required === true`)

5. **Material risks**
   - Sorted CRITICAL → HIGH → MODERATE → LOW
   - Severity-tier styling with print-safe colors
   - Bilingual title + description per risk

6. **Treatment alternatives**
   - Numbered legal-list styling (`§01 § …`)

7. **Patient declaration block** (bilingual acknowledgment language)

8. **Signature zones** — derived from `payload.signatures` flags:
   - Patient / SDM (default required)
   - Treating physician (default required)
   - Interpreter (when `interpreterRequired`)
   - Independent witness (when `witnessRequired`)
   - Each block contains role label (EN + AR), name + identifier (when available),
     signature line, date / time stamp placeholders.

9. **Audit footer**
   - Evidence ID (derived from payload fingerprint when none supplied)
   - Template ID + version
   - Generated-at ISO timestamp
   - Audit hash + payload fingerprint (monospace)
   - **QR placeholder** (dashed-bordered box; no QR library used yet)
   - Bilingual evidence-strip footer line

10. **Validation warnings panel** (preview-only; hidden when printing via `.lg-no-print`)

The renderer is a **pure function**. It performs no I/O and emits a deterministic
HTML string for a given input.

---

## 6. Print behavior

The renderer embeds an `@page A4` rule with `18mm/16mm/22mm/16mm` margins and uses
`page-break-inside: avoid` on every section, risk row, signature block, declaration,
and audit footer. Preview chrome (validation warnings panel) is hidden with the
`.lg-no-print` class under `@media print`.

The preview UI renders the HTML inside an `iframe` (`sandbox="allow-same-origin
allow-modals"`) so that printing isolates document styles from the app shell.

---

## 7. Preview API contract

### GET `/api/internal/dynamic-consent/preview`

| Query param      | Type                                       | Default            | Description                                  |
|------------------|--------------------------------------------|--------------------|----------------------------------------------|
| `engine`         | `"dynamic-preview"`                        | —                  | Per-request feature-flag override            |
| `renderer`       | `"default" \| "legal-grade"`               | `"default"`        | Renderer selector                            |
| `demo`           | `cardiology \| general-surgery \| orthopedics \| anesthesia \| dama \| blood-transfusion` | — | Use a specialty demo preset payload          |
| `language`       | `"en" \| "ar" \| "bilingual"`              | preset / `"bilingual"` | Force document language                  |
| `patientName`, `patientMrn`, `caseNumber`, `encounterNo`, `diagnosis`, `procedureName`, `specialty`, `physicianName` | string | — | Override individual payload fields |

### Response (success)

```jsonc
{
  "success": true,
  "engine": "dynamic-consent-preview",
  "renderer": "legal-grade",
  "demo": "cardiology",
  "templateId": "…",
  "templateVersion": "…",
  "html": "<!DOCTYPE html>…",
  "titleAr": "…",
  "titleEn": "…",
  "warnings": [],
  "audit": {
    "hash": "…",
    "generatedAt": "2026-…",
    "payloadFingerprint": "…",
    "templateId": "…",
    "templateVersion": "…"
  },
  "metadata": { /* patient / case / encounter / specialty / language */ },
  "availableDemos": [
    { "id": "cardiology", "labelEn": "…", "labelAr": "…" },
    …
  ]
}
```

### POST `/api/internal/dynamic-consent/preview`

Body: `{ "useDefaults": true }` or `{ "payload": DynamicConsentPayload }`.
Honors the same `?renderer=legal-grade` query param. Default behavior unchanged
from Phase 2.

---

## 8. Internal preview page

Route: `/internal/dynamic-consent-preview`

New controls:

- **Renderer** — `Legal-Grade (new)` / `Default (baseline)`
- **Specialty Demo** — six presets, populated from `availableDemos`
- **Language** — `Bilingual` / `English only` / `العربية فقط`
- **Print preview** — invokes `iframe.contentWindow.print()`
- **Audit** — toggleable panel showing template ID/version, audit hash,
  payload fingerprint, generated-at, demo preset, and validation warnings.

The HTML is rendered into a sandboxed `iframe` for style isolation and clean
printing. No production navigation is exposed.

---

## 9. Safety / non-breaking guarantees

- The production renderer (`renderers/html-renderer.ts`) is unchanged.
- The production informed-consent API and workflow are unchanged.
- Prisma schema, migrations, and audit/evidence chain are unchanged.
- `ENABLE_DYNAMIC_CONSENT_ENGINE` remains `false` by default.
- Without `?renderer=legal-grade`, the preview response is byte-equivalent to Phase 2.
- All new files live under `design-system/` and `legal-grade/`; nothing under
  `apps/web/app/api/informed-consents/` was modified.

---

## 10. Manual UAT checklist

1. Set the feature flag (or use `?engine=dynamic-preview`).
2. Visit `/internal/dynamic-consent-preview`.
3. Cycle through all six specialty demos; verify metadata + risks change accordingly.
4. Toggle `Renderer` between default and legal-grade; confirm visual escalation.
5. Toggle `Language` to `en`, `ar`, `bilingual`; verify text + direction.
6. Click `Print preview`; confirm A4 layout, no broken signature blocks, no preview-only chrome printed.
7. Open the `Audit` panel; verify hash + fingerprint + template version populated.
8. Verify the production routes (`/app/informed-consents/*`) behave exactly as before.
