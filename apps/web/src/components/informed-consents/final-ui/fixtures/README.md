# Final-UI Fixtures (Phase 40 Controlled Port)

This directory contains the **mock data** powering the localhost-OneDrive Vite
UI that was ported into the Next.js app under
`apps/web/src/components/informed-consents/final-ui/`.

These fixtures are visible to the bundler at build time but **MUST NOT** ship
records that look like real patient identities. Each fixture file documents
the API endpoint that will replace it once the visual UI is approved for
production wiring.

| Fixture file              | Consumed by                       | Replaces with                                                             |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `patient-search.ts`       | `PatientSearch.tsx`               | `GET /api/modules/informed-consents/patients/search` + encounters fetch   |
| `consent-builder.ts`      | `ConsentBuilder.tsx`              | Per-template validation manifest + server-side completeness check         |
| `status-tracking.ts`      | `StatusTracking.tsx`              | `GET /api/modules/informed-consents/documents` + secure-signing workflow  |

## Remaining inline mock data (not yet extracted)

For Phase 40 the following components still hold inline mock literals (mostly
content fixtures rather than patient identities). They are intentionally left
inline at this stage because they are tightly interleaved with JSX:

- `PhysicianDashboard.tsx` — case-list cards (Cataract Surgery / ERCP / etc.)
- `steps/StepProcedure.tsx` — sample procedure catalog
- `steps/StepAnesthesia.tsx` — anesthesia option catalog
- `steps/StepEducation.tsx` — `educationSections`, `beforeAfter`
- `steps/StepDisclosures.tsx` — sample disclosure text
- `steps/StepPreview.tsx` — sample patient view + PDF metadata
- `steps/StepSend.tsx` — hardcoded contact details

These will be extracted in a follow-up step once the visual UI is approved.
Until then, **no part of `final-ui/` may be exposed to authenticated production
users without isolating these remaining literals or wiring them to real data**.
