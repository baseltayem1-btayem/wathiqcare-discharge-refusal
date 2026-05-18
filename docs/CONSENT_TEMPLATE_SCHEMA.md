# Consent Template Schema

## Template Definition

Each dynamic consent template currently includes:

- `id`: immutable internal template identifier.
- `slug`: human-readable key.
- `consentType`: consent family classification.
- `specialty`: default specialty scope.
- `language`: rendering scope, currently bilingual.
- `version`: experimental semantic version.
- `displayNameAr` and `displayNameEn`: clinician/reviewer-facing names.
- `defaultRiskCodes`: baseline risk set resolved through the shared risk library.
- `requiredFields`: payload fields that must exist for safe composition.
- `sectionBlueprints`: ordered section definitions used to build final sections.

## Section Blueprint

Each blueprint defines:

- `id` and `key`: stable identifiers.
- `kind`: semantic section type such as `intro`, `risks`, `alternatives`, or `legal`.
- `titleAr` and `titleEn`: bilingual headings.
- `bodyArTemplate` and `bodyEnTemplate`: placeholder-based content templates.
- `required`: whether the section must appear.
- `layer`: patient disclosure layer from 1 to 3.
- `order`: deterministic final ordering.

## Payload Binding

The current interpolation model supports:

- `{{patientName}}`
- `{{physicianName}}`
- `{{diagnosis}}`
- `{{procedure}}`
- `{{specialty}}`

The schema is intentionally narrow in this phase. Expansion should remain explicit and governed.

## Governance Notes

- Template blueprints are not yet tenant-editable.
- Production consents do not currently depend on this schema.
- Any future authoring layer should preserve versioning, committee approval, and rollback.