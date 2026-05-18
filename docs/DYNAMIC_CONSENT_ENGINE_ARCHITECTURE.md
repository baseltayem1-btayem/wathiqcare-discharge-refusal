# Dynamic Consent Engine Architecture

## Purpose

This document describes the experimental WathiqCare Dynamic Smart Consent Engine added in an isolated, feature-flagged path. The current informed consent production workflow remains the source of truth. The experimental engine exists to validate a parallel architecture for richer specialty-aware, bilingual, layered consent composition.

## Isolation Rules

- Activation is controlled only by `ENABLE_DYNAMIC_CONSENT_ENGINE`.
- The existing informed consent APIs, PDF routes, Prisma schema, and signing workflows remain unchanged.
- The new engine is additive and currently renders only a server-side preview block when the feature flag is enabled.
- The preview consumes static demo payloads and does not write data or alter production document generation.

## Module Layout

- `engine/`: shared types and feature gating.
- `templates/`: specialty-aware template registry and blueprint sections.
- `risk-library/`: reusable bilingual risk catalog with specialty tags.
- `specialty-modules/`: specialty-level default risk mapping.
- `validators/`: payload normalization and issue detection.
- `builders/`: orchestration that resolves template, sections, alternatives, and risks.
- `renderers/`: HTML composition for a future PDF pipeline.
- `pdf/`: rendered-document metadata and file naming.
- `audit/`: deterministic audit snapshot and payload fingerprinting.
- `service.ts`: facade used by the adapter and preview surface.

## Current Build Pipeline

1. Normalize and validate incoming payload.
2. Resolve a template by specialty and consent type.
3. Expand template blueprints into concrete bilingual sections.
4. Resolve risks from the risk library.
5. Merge alternatives and legal statements.
6. Render experimental HTML.
7. Generate audit snapshot with SHA-256 hash.
8. Return a build result with sections, risks, render output, and audit metadata.

## Safe Next Steps

- Add more specialty modules without touching existing routes.
- Add a server-only experimental route for internal reviewers.
- Introduce governed template authoring around the blueprint model.
- Add AI suggestion layers as non-authoritative inputs only after governance approval.