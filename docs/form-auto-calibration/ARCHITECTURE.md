# Form Auto-Calibration Engine — Phase 1 Architecture

## Objective

Onboard, map, calibrate, test, and review the 228 IMC-approved consent PDF forms without manually coding every coordinate. The engine is a **deterministic-first, agentically-assisted** pipeline. Human review is mandatory for any mapping that affects legal-grade signatures or PHI.

## Core principles

1. **Deterministic geometry first.** Every field rectangle must be derivable from measurable PDF structure: text blocks, AcroForm widgets, writing lines, checkboxes, and signature regions.
2. **Agentic assistance, not autonomy.** LLMs may propose matches for ambiguous labels, but guardrails enforce allowed field/ontology sets and all proposals are stored as low-confidence candidates.
3. **Quality gates before review.** A candidate must pass page-count, layout-family, required-field, collision, overflow, and signature-region checks before it can be approved automatically.
4. **Confidence is conservative.** Deterministic signals are weighted higher than agentic signals. Any PHI or signature mapping below threshold requires human confirmation.
5. **Registry and audit.** Every calibration job, candidate, and review decision is persisted with full mappings and quality reports.

## Module map

```
apps/web/src/lib/server/form-auto-calibration/
├── ontology/               # Canonical consent field ontology
│   ├── consent-field-ontology.ts
│   ├── ontology-aliases.ts
│   └── default-ontology.ts
├── intake/                 # Blank PDF inspection and validation
│   └── inspect-pdf.ts
├── fingerprint/            # Layout family classification
│   ├── layout-fingerprint.ts
│   └── layout-family-classifier.ts
├── extraction/             # Structural feature extraction
│   ├── extract-text-blocks.ts
│   ├── detect-writing-lines.ts
│   ├── detect-checkboxes.ts
│   ├── detect-signature-regions.ts
│   ├── detect-page-columns.ts
│   └── pdf-field-extractor.ts
├── anchors/                # Label-anchor detection and geometry
│   ├── find-label-anchors.ts
│   ├── anchor-types.ts
│   └── anchor-relative-geometry.ts
├── geometry/               # Rectangle constraints and protected regions
│   ├── candidate-rectangle-generator.ts
│   ├── rectangle-normalization.ts
│   ├── rectangle-constraints.ts
│   └── protected-region-builder.ts
├── mapping/                # Deterministic and semantic field mapping
│   ├── semantic-field-mapper.ts
│   ├── field-mapper.ts
│   ├── mapping-confidence.ts
│   └── mapping-schema.ts
├── agents/                 # Guarded LLM provider and orchestrator
│   ├── llm-provider.ts
│   ├── agent-orchestrator.ts
│   ├── prompts.ts
│   └── guardrails.ts
├── confidence/             # Confidence aggregation
│   └── confidence-aggregation.ts
├── correction/             # Deterministic correction loop
│   └── correction-engine.ts
├── validation/             # Quality gates
│   ├── calibration-quality-gate.ts
│   ├── pixel-collision-validator.ts
│   ├── overflow-validator.ts
│   ├── signature-region-validator.ts
│   └── page-count-validator.ts
├── synthetic/              # Offline pilot data and rendering
│   ├── synthetic-data-generator.ts
│   └── synthetic-render-adapter.ts
├── registry/               # Candidate/job/manifest persistence
│   ├── candidate-registry.ts
│   └── prisma-candidate-registry.ts
└── engine/                 # End-to-end orchestration
    └── calibration-engine.ts
```

## Pipeline

1. **Intake** — `inspectBlankPdf` validates the PDF, rejects encrypted files, and runs structural extraction.
2. **Fingerprint** — `computeLayoutFingerprint` summarises page count, columns, writing lines, checkboxes, signature regions, and text blocks. `classifyLayoutFamily` assigns a family with conservative confidence.
3. **Anchor detection** — `findLabelAnchors` matches extracted text against the ontology alias index.
4. **Geometry** — `generateCandidateMappings` turns anchors into normalised rectangles constrained by field type (text, date, checkbox, signature).
5. **Semantic mapping** — `mapSemanticFields` produces proposals and identifies unmapped required keys per layout family.
6. **Correction** — `applyDeterministicCorrections` separates collisions and downgrades low-confidence mappings.
7. **Agent fallback** — `AgentOrchestrator.proposeMatches` is invoked only for unmapped required keys; output is validated by guardrails.
8. **Confidence** — per-field and per-candidate scores are aggregated deterministically.
9. **Quality gate** — `runCalibrationQualityGate` produces a score and review status.
10. **Synthetic render** — a blank form is filled with synthetic data for visual regression comparison.
11. **Registry** — the candidate is stored with mappings, quality report, and confidence.

## Review states

- `AUTO_REVIEW_CANDIDATE` — score ≥ 90, all required fields mapped, no collisions/overflows.
- `ASSISTED_REVIEW` — score 60–89 or minor issues; human reviewer decides.
- `MANUAL_CALIBRATION_REQUIRED` — score < 60 or missing required fields/collisions.

## Data model

See `prisma/schema.prisma` additions:

- `FormCalibrationManifest` — list of source form IDs to calibrate.
- `FormCalibrationJob` — batch run metadata and counts.
- `FormCalibrationCandidate` — per-form mappings, quality report, confidence, and review decision.

## API surface

Internal admin routes under `/api/admin/form-calibration/`:

- `POST /run` — start a batch dry-run from a manifest or form ID list.
- `GET/POST /jobs` — list and create jobs.
- `GET/POST /manifests` — list and create manifests.
- `GET /candidates` — list candidates, optionally filtered by status.
- `GET /candidates/[id]` — candidate detail.
- `POST /candidates/[id]/review` — approve/reject/request-manual.

## Future work (Phase 2)

- Visual regression diffing against synthetic renders.
- Per-family geometry overrides stored in the manifest.
- Active learning from reviewer decisions to improve alias index.
- LLM provider warm-up and caching.
