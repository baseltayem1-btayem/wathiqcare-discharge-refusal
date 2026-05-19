# Dynamic Consent — QA Screenshot Manifest

This folder is the canonical home for manual visual evidence captures
collected during the Phase 6 validation pass for the **internal
dynamic-consent legal-grade preview**.

> Internal-only. Preview pipeline. Production renderer, production
> informed-consent workflow, Prisma schema, and TrakCare integration
> are NOT touched by Phase 6 work.

## What is and is not in this folder

- `manifest.json` — committed. Enumerates the visual captures the QA
  team must collect. Generated from
  `apps/web/src/modules/consent-engine/validation/screenshot-manifest.ts`.
- `README.md` — this file.
- **No PNG/PDF binaries are committed.** Browser rendering varies by
  platform (Windows Chromium PDF vs macOS Safari vs Linux Chromium) and
  by font availability for Arabic glyphs, so the artifacts are captured
  per-environment by the operator running validation, not stored in
  source control. This is consistent with the rule that no PDF
  documents are generated, persisted, or stored from the preview path.

## How to capture

1. Start the dev server: `cd apps/web && npm run dev`.
2. Visit `http://localhost:3000/internal/dynamic-consent-preview?engine=dynamic-preview`.
3. For each entry in `manifest.json`:
   - Select the corresponding **Specialty Demo** in the page controls.
   - Select the corresponding **Language**.
   - Use one of the following capture methods:
     - **Full document / header / signature zone / audit footer**:
       browser screenshot of the iframe area.
     - **Print preview**: click the page's "Print / Save as PDF" button,
       or visit
       `/api/internal/dynamic-consent/pdf-preview?engine=dynamic-preview&renderer=legal-grade&evidence=true&demo=<demo>&language=<language>`
       (returns the deterministic binary preview if the renderer
       capability is available; otherwise falls back to print-to-PDF).
4. Save the screenshot using the `suggestedFilename` from the manifest.
5. Attach captures to the validation report ticket; do **not** commit
   them to this folder.

## Validation linkage

The structural and deterministic validators in
`apps/web/src/modules/consent-engine/validation/` exercise the engine
and the legal-grade renderer on the same set of specialty demos
referenced by this manifest. Run them via the internal validation API:

```
GET /api/internal/dynamic-consent/validation?engine=dynamic-preview&demo=<demo>&language=<language>
```

Or from the in-page **Run Validation** button on
`/internal/dynamic-consent-preview`.

## Browser limitation note

Phase 6 does **not** perform automated cross-browser comparison
(Chrome vs Edge vs Safari). The validation suite is static and
deterministic against the rendered HTML only. The operator is expected
to spot-check the captures listed in `manifest.json` in at least
Chromium and one secondary browser before promoting the preview to a
production-adjacent UAT environment.
