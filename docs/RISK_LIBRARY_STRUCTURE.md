# Risk Library Structure

## Design Goal

The experimental risk library provides a reusable bilingual catalog for consent generation so specialties can reuse governed wording instead of duplicating clinical risk statements across templates.

## Current Risk Fields

- `id`: internal risk record identifier.
- `code`: canonical risk code.
- `titleAr` and `titleEn`: short risk labels.
- `descriptionAr` and `descriptionEn`: bilingual explanatory wording.
- `severity`: `low`, `medium`, `high`, or `critical`.
- `specialtyTags`: specialties where the risk is applicable.
- `category`: grouping key such as `procedural`, `cardiac`, `anesthesia`, or `medication`.

## Resolution Rules

- If a payload supplies explicit risk codes, the engine resolves only those risks.
- Otherwise, the template default risk codes are used.
- If no specialty-specific template is found, the general template acts as fallback.

## Current Coverage

- General procedural bleeding and infection.
- Allergy and material reaction.
- Sedation and anesthesia complications.
- Cardiology-specific arrhythmia and vascular injury.

## Planned Governance

- Specialty committee ownership per risk category.
- Immutable wording versions and retirement dates.
- Cross-template impact analysis before risk wording changes.
- Future evidence of which wording version was rendered into each consent artifact.