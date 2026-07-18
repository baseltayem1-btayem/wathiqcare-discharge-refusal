# ADR-001: Deterministic-First, Agentic-Fallback Calibration Architecture

## Status

Accepted — Phase 1 implementation complete.

## Context

WathiqCare must onboard 228 IMC-approved consent PDF forms. Each form contains PHI fields, clinical procedure fields, and legally binding signatures. Manually coding coordinates for every form is slow, error-prone, and hard to maintain. We need an automated calibration engine that:

- Maps canonical ontology keys to fields on each PDF.
- Produces normalised rectangles suitable for overlay rendering at any DPI.
- Validates itself before a human reviewer sees it.
- Does not rely solely on generative AI, which can hallucinate field names or coordinates.

## Decision

Build a **deterministic-first, agentic-fallback** hybrid engine.

### Why deterministic first?

- Coordinates, page counts, and structural features (text blocks, AcroForm widgets, writing lines, checkboxes, signature regions) are directly measurable.
- Ontology aliases provide a governed, explainable mapping from detected labels to canonical keys.
- Deterministic logic is fast, reproducible, and does not require API credentials or rate limits.
- Legal-grade signatures and PHI must never be mapped purely by a black-box model.

### Why agentic fallback?

- Some forms use non-standard labels or abbreviations not in the alias index.
- An LLM can propose candidate matches from a closed set of allowed field names and ontology keys.
- Agent output is parsed as JSON and validated by guardrails; failures are ignored.
- Agentic matches are stored as low-confidence `PARTIAL` mappings for human review.

### Why not end-to-end AI?

- No guaranteed JSON schema adherence without expensive post-validation.
- Risk of inventing fields or shifting rectangles by small but legally significant amounts.
- Harder to audit and reproduce.

## Consequences

### Positive

- **Auditable.** Every mapping has evidence, confidence, and a deterministic chain.
- **Safe.** Signature and PHI mappings below threshold require human confirmation.
- **Extensible.** New layout families and aliases can be added without retraining a model.
- **Testable.** The pipeline can be run offline on blank forms with synthetic data.

### Negative

- **Initial alias curation.** The ontology alias index must be maintained as new forms arrive.
- **Family coverage.** Unknown or highly unusual layouts may fall back to `MANUAL_CALIBRATION_REQUIRED`.
- **Agent dependency optional.** If LLM is unavailable, the engine still works but may leave more fields unmapped.

## Alternatives considered

| Approach | Rejected because |
|---|---|
| Fully manual coordinate mapping | Does not scale to 228 forms and repeated PDF revisions. |
| Pure LLM coordinate prediction | No guaranteed bounds, no reproducibility, high legal risk. |
| Computer-vision only | Still requires a labelled training set; less explainable than geometry. |
| AcroForm name matching only | Many approved PDFs use inconsistent field names or no fields at all. |

## Implementation notes

- Deterministic modules live under `apps/web/src/lib/server/form-auto-calibration/`.
- Agent provider is abstracted behind `LLMProvider`; tests use `NoopLLMProvider`.
- Guardrails validate JSON structure, allowed ontology keys, and allowed field names.
- Quality gate aggregates all checks and assigns a review status.
- Prisma schema additions persist jobs, candidates, manifests, and review decisions.
