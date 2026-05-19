# Dynamic Informed Consent Template Engine

## Overview

The Dynamic Informed Consent Template Engine is an isolated, feature-flagged module that provides next-generation rendering capabilities for bilingual medical consent forms. It operates independently from the existing production consent workflow and is disabled by default.

## Architecture

### Structure

```
apps/web/src/modules/consent-engine/
├── core/
│   └── feature-gates.ts          # Feature flag controls
├── engine/
│   ├── types.ts                  # Core TypeScript types
│   └── feature-gates.ts          # Feature gating logic
├── templates/
│   ├── index.ts                  # Template registry
│   ├── surgery-medical-procedure-consent.ts
│   ├── cardiology-consent.ts
│   └── general-consent.ts
├── validators/
│   ├── payload-validator.ts      # Basic payload validation
│   ├── signature-validator.ts    # Signature requirements
│   ├── substitute-decision-maker.ts  # SDM logic
│   ├── translator-validator.ts   # Translator requirements
│   ├── mandatory-disclosures.ts  # Legal disclosures
│   ├── validity-validator.ts     # Consent validity periods
│   └── comprehensive-validator.ts    # Full validation
├── builders/
│   ├── dynamic-consent-builder.ts    # Main consent builder
│   └── comprehensive-builder.ts      # Build + validate together
├── renderers/
│   └── html-renderer.ts          # HTML output generation
├── pdf/
│   ├── dynamic-consent-pdf.ts    # PDF document structure
│   └── pdf-payload-builder.ts    # PDF rendering payload
├── audit/
│   └── dynamic-consent-audit.ts  # Cryptographic audit trail
├── adapters/
│   ├── dynamic-consent-adapter.ts    # Engine adapter
│   └── raw-template-adapter.ts       # Fallback adapter
├── i18n/
│   └── copy.ts                   # Bilingual copy & defaults
├── risk-library/
│   └── catalog.ts                # Medical risk definitions
├── specialty-modules/
│   ├── index.ts
│   ├── general.ts
│   └── cardiology.ts
├── tests/
│   ├── validators.test.ts
│   └── feature-gates.test.ts
├── service.ts                    # Engine service layer
└── index.ts                      # Public API exports
```

## Feature Flag

### Activation

The engine is controlled by: `ENABLE_DYNAMIC_CONSENT_ENGINE`

**Default:** `false` (disabled)

### Environment Setup

```bash
# .env.development.local
ENABLE_DYNAMIC_CONSENT_ENGINE=true

# .env.production
ENABLE_DYNAMIC_CONSENT_ENGINE=false
```

### Runtime Override

Query parameter: `?engine=dynamic`

When this parameter is present, the dynamic engine is used regardless of the flag state.

## Usage

### Basic Usage

```typescript
import { buildDynamicConsentDocument } from "@/modules/consent-engine/builders/dynamic-consent-builder";
import { resolveDynamicConsentTemplate } from "@/modules/consent-engine/templates";

const template = resolveDynamicConsentTemplate({
  specialty: "CARDIOLOGY",
  consentType: "PROCEDURE_SPECIFIC_CONSENT",
});

const result = buildDynamicConsentDocument({
  template,
  payload: {
    patient: { name: "Jane Doe", id: "P123" },
    physician: { name: "Dr. Smith", identifier: "LIC-2024" },
    encounter: { caseNumber: "ENC-001" },
    diagnosis: "Coronary Artery Disease",
    procedure: "Percutaneous Coronary Intervention",
    specialty: "CARDIOLOGY",
    language: "bilingual",
    risks: [],
    alternatives: [],
    legalStatements: [],
  },
});

// result.rendered.html → HTML output
// result.audit → Cryptographic audit trail
// result.rendered.pdfFileName → Filename for PDF
```

### With Validation

```typescript
import { buildAndValidateConsent } from "@/modules/consent-engine/builders/comprehensive-builder";

const { buildResult, validation, isProductionReady } = buildAndValidateConsent(
  template,
  payload
);

if (!isProductionReady) {
  console.error("Validation errors:", validation.errors);
  console.warn("Warnings:", validation.warnings);
}
```

### Feature Flag Check

```typescript
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine/engine/feature-gates";

if (isDynamicConsentEngineEnabled()) {
  // Use dynamic engine
} else {
  // Use existing production renderer
}
```

## Templates

### Available Templates

1. **General Consent** (`GENERAL_MEDICINE`)
   - Default template
   - Covers general procedures
   - Base risks: Infection, Bleeding, Allergic Reaction

2. **Cardiology Consent** (`CARDIOLOGY`)
   - Cardiac-specific procedures
   - Specialty risks: Arrhythmia, Vessel Injury, Sedation Complications

3. **Surgery/Medical Procedure Consent** (`SURGERY_MEDICAL_PROCEDURE`)
   - Complex surgical procedures
   - Witness support
   - Substitute Decision Maker logic

### Custom Templates

To register a new template:

```typescript
// 1. Define the template
const MY_TEMPLATE: DynamicConsentTemplateDefinition = {
  id: "my-consent",
  slug: "my-consent",
  consentType: "PROCEDURE_SPECIFIC_CONSENT",
  specialty: "SPECIALTY_NAME",
  language: "bilingual",
  version: "1.0.0",
  displayNameAr: "...",
  displayNameEn: "...",
  defaultRiskCodes: [],
  requiredFields: ["diagnosis", "procedure", "specialty"],
  sectionBlueprints: [
    // ... sections
  ],
};

// 2. Add to template registry in templates/index.ts
const TEMPLATE_REGISTRY = [
  // ... existing templates
  MY_TEMPLATE,
];
```

## Validators

### Validation Pipeline

```
1. Payload Validator → Core field validation
2. Signature Validator → Signature requirements
3. Physician Declaration → Physician credentials
4. Substitute Decision Maker → Guardian requirements
5. Translator → Language accommodation
6. Mandatory Disclosures → Legal requirements
7. Validity Period → Consent expiration
```

### Using Validators

```typescript
import {
  performComprehensiveValidation,
} from "@/modules/consent-engine/validators/comprehensive-validator";

const validation = performComprehensiveValidation(payload, {
  validateSignatures: true,
  validateSDM: true,
  validateTranslator: true,
  validateDisclosures: true,
});

console.log(validation.isValid);        // boolean
console.log(validation.errors);         // string[]
console.log(validation.warnings);       // string[]
console.log(validation.validationDetails); // object
```

## Rendering

### HTML Rendering

The engine produces enterprise-grade HTML output with:

- RTL/LTR aware bilingual layouts
- Print-optimized styling
- Signature zones
- Witness zones
- Medical terminology
- Compliance footers

```typescript
import { renderDynamicConsentHtml } from "@/modules/consent-engine/renderers/html-renderer";

const html = renderDynamicConsentHtml({
  template,
  sections,
  risks,
  alternatives,
  generatedAt: new Date().toISOString(),
});

// HTML string ready for PDF rendering or display
```

### PDF Generation

```typescript
import { buildConsentPdfPayload } from "@/modules/consent-engine/pdf/pdf-payload-builder";

const pdfPayload = buildConsentPdfPayload(buildResult, true); // true = Arabic

// Use with Puppeteer or similar PDF renderer
const page = await browser.newPage();
await page.setContent(pdfPayload.html);
const pdf = await page.pdf({
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", right: "10mm", bottom: "16mm", left: "10mm" },
});
```

## Audit Trail

The engine generates cryptographic audit trails for each consent:

```typescript
const audit = buildResult.audit;

// {
//   hash: "sha256_hash_of_content",
//   generatedAt: "2024-01-15T10:30:00Z",
//   templateId: "surgery-medical-procedure-consent",
//   templateVersion: "1.0.0",
//   payloadFingerprint: "sha256_hash_of_payload"
// }
```

## Backward Compatibility

### Non-Breaking Design

✅ **Completely isolated** - No modifications to existing code
✅ **Feature-flagged** - Disabled by default
✅ **Adapter-based** - Can be called optionally
✅ **No side effects** - Zero impact on imports
✅ **Reversible** - Can be removed by deleting the `consent-engine` folder

### Production Safety

When `ENABLE_DYNAMIC_CONSENT_ENGINE=false`:

- Existing consent workflow unchanged
- Existing PDF renderer unaffected
- Existing APIs unchanged
- Existing permissions unaffected
- No database migrations required

## Testing

### Run Tests

```bash
npm run test -- src/modules/consent-engine/tests
```

### Test Coverage

- ✅ Payload validation
- ✅ Signature requirements
- ✅ SDM logic
- ✅ Translator requirements
- ✅ Feature flag behavior
- ✅ HTML rendering
- ✅ Bilingual output
- ✅ RTL support

## Integration Points

### Existing System Integration

The engine can integrate optionally with:

1. **Informed Consents Module**
   - `POST /api/modules/informed-consents/generate-draft`
   - Add `?engine=dynamic` to use new engine

2. **Template Selection**
   - New templates available in dropdown
   - Legacy templates unchanged

3. **PDF Generation**
   - `/api/modules/informed-consents/documents/[id]/pdf?engine=dynamic`

## Rollback Instructions

If any issues occur:

```bash
# 1. Disable the feature flag
ENABLE_DYNAMIC_CONSENT_ENGINE=false

# 2. OR remove the engine folder entirely
rm -rf apps/web/src/modules/consent-engine

# 3. Rebuild
npm run build

# 4. Old system continues unchanged
```

## Configuration Reference

| Setting | Value | Default | Description |
|---------|-------|---------|-------------|
| `ENABLE_DYNAMIC_CONSENT_ENGINE` | true/false | false | Master feature flag |
| Query Param | `?engine=dynamic` | N/A | Runtime override |
| Template Validity | Days | 30 | Consent expiration |
| Witness Count | Number | 2 | Surgery/complex procedures |

## Compliance

The Dynamic Consent Engine is designed for:

- ✅ Saudi PDPL compliance
- ✅ Bilingual Arabic/English
- ✅ Hospital-grade security
- ✅ Legal defensibility
- ✅ Medico-legal standards
- ✅ Patient safety

## Support & Troubleshooting

### Common Issues

**Issue**: Engine not activating
- Check: `ENABLE_DYNAMIC_CONSENT_ENGINE=true` in environment
- Check: `?engine=dynamic` query parameter present

**Issue**: Validation errors
- Check: All required fields present in payload
- Check: Physician credentials included
- Check: Language setting correct

**Issue**: HTML rendering issues
- Check: RTL elements properly tagged
- Check: Bilingual sections both present
- Check: Special characters properly escaped

## License & Attribution

This engine is built following medical consent best practices and complies with:
- KFDA (Saudi FDA) guidelines
- Ministry of Health informed consent standards
- International medico-legal standards
