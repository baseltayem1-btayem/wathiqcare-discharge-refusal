# Conditional Witness Preview Acceptance Report

Branch: `feature/conditional-witness-auth`  
Starting HEAD: `a9e52897a99ceb92f23b5206860f1922b5b45919`  
Report date: 2026-07-14  
Status: **PREVIEW ACCEPTANCE COMPLETE** (conditional-witness integration finalized)

## 1. Scope

This report records the autonomous completion of the conditional-witness preview
acceptance stage for the `feature/conditional-witness-auth` branch. It covers:

- Package A/B/D stabilization (declarations integration, policy profile, migration contract)
- Package C (locally generated preview artifacts)
- Package E (deterministic routine + conditional acceptance tests)
- Validation results against the branch baseline

No push, deploy, remote database connection, real signing, messaging, or real
patient data was used.

## 2. Component path & route status

| Item | Path / Status |
|---|---|
| Patient declarations component | `apps/web/src/components/approved-design/patient/PatientDeclarationsPanel.tsx` |
| Workflow integration | `ApprovedPatientWorkflow` → `PatientSignatureStep` |
| Signing route | `POST /api/public-signing/document/[token]/sign` |
| Body parser / mapper | `apps/web/src/lib/server/public-signing-sign-body.ts` |
| Server validation | `apps/web/src/lib/server/public-signing-signature-service.ts` |
| Page-level `/sign` route | **Absent on this branch** (not introduced; component integration reported separately) |

The seven bilingual declarations are accessible in the UI, required before
submit on the routine electronic path, and validated authoritatively on the
server. Refusal/AMA behaviour bypasses declarations (empty payload) on the
refusal path.

## 3. Policy activation

| Item | Value |
|---|---|
| Template code | `imc-adenotonsillectomy` |
| Form reference | `IMC MR 1168` |
| Approved PDF version | `2018-02` |
| Digital policy version | `1.1.0` |
| Policy source | `GOVERNED_CODE_PROFILE` |
| Effective state | `PREVIEW_ACTIVE` |
| Default witness mode | `CONDITIONAL` |
| Default required witnesses | `0` |
| Required roles (on trigger) | `NURSING_REPRESENTATIVE`, `PATIENT_EXPERIENCE_REPRESENTATIVE` |
| Same person multiple roles | `false` |
| Paper legacy | Unchanged (legacy `requiresWitness` / HIGH/CRITICAL risk still works) |
| Ambiguous version handling | Fail closed (profile not applied) |

Activation is explicit and auditable: `effectiveState = PREVIEW_ACTIVE` and the
`governanceNote` states that production activation requires the normal
clinical-governance approval workflow. The registry does not edit the approved
PDF, does not flip any DB `requiresWitness` flag, and does not create governance
approval records.

## 4. Matrix

| Scenario | Trigger | Evidence | Decision | Witness count | Label selected |
|---|---|---|---|---|---|
| Routine competent patient | none | complete | `CONDITIONAL` | 0 | Electronic authentication |
| Substitute decision maker | `SUBSTITUTE_DECISION_MAKER` | complete | `REQUIRED` | 1 | Human witness |
| Lacks capacity | `LACKS_CAPACITY` | complete | `REQUIRED` | 1 | Human witness |
| Cannot read/use journey | `CANNOT_READ_OR_USE_JOURNEY` | complete | `REQUIRED` | 1 | Human witness |
| Communication barrier | `COMMUNICATION_BARRIER` | complete | `REQUIRED` | 1 | Human witness |
| Disputed/objected | `DISPUTED_OR_OBJECTED` | complete | `REQUIRED` | 1 | Human witness |
| Refusal / AMA | `REFUSAL_OR_AMA` | complete | `REQUIRED` | 1 | Human witness |
| Legacy requiresWitness | n/a | n/a | `REQUIRED` | 1 | Human witness |
| Legacy HIGH/CRITICAL risk | n/a | n/a | `REQUIRED` | 1 | Human witness |

## 5. Migration review

Migration `apps/web/prisma/migrations/0031_conditional_witness_auth.sql`:

- Additive only: `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
- No destructive statements.
- Tenant-scoped unique constraints/indexes.
- CHECK constraints for roles and status.
- FK `ON DELETE RESTRICT` protects signature evidence.
- Bootstrap DDL in `documents/route.ts` mirrors migration SQL.
- Contract test `migration-0031-contract.test.ts` passes without database access.

## 6. Integration results

- `PatientDeclarationsPanel` is wired through `ApprovedPatientWorkflow` and
  `PatientSignatureStep` to the public-signing sign route.
- `mapPublicSignRequestBody` forwards `declarations` to the signature service.
- The server validates the seven declaration keys authoritatively; incomplete
  sets are rejected.
- Refusal path sends an empty declarations payload.
- No executable import/dynamic import/JSX reference remains to the deleted
  `PublicSigningWorkflow.tsx`.
- `PublicSigningWorkflowPayload` type was not renamed.

## 7. Artifact paths & hashes

Generated under `apps/web/test-output/` (git-ignored):

| Artifact | File | SHA-256 |
|---|---|---|
| Preview PDF | `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.pdf` | `ca4dae8753f7f94d68cb128f8b96acb8bf866e76487d0d7133fdf5ad771c6be4` |
| Page 2 PNG | `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY_PAGE_2.png` | `d34fa0b93881b32c7f1b48bd427f5cc25f6a64e7db140b4adaeb8028dba33e31` |
| Manifest | `IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.manifest.json` | `2fd2668dd450b491090b05c0768adc52595880da6239427e5afda68a1ffd1be0` |

Source PDF: `apps/web/public/approved-consent-forms/adenotonsillectomy.pdf`
(sha256 `64a91e732171d3a4da1c1b6149e37d06618ddc2c1069cb55356dcff626a01029`).

The page-2 PNG is a genuine composed raster of the final generated PDF page 2
(rendered at 2× source scale), not a transparency-only overlay. All artifacts
are marked `TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE`.

## 8. Dimensions & rectangles

| Property | Value |
|---|---|
| Source PDF page size | 612 × 792 pt (US Letter) |
| Generated PDF page count | 2 (unchanged from source) |
| Raster scale | 2× source |
| Page 2 PNG raster | 1224 × 1584 px |
| Overlay viewport | 1190 × 1684 px |
| Overlay scaleX | 0.5142857142857142 |
| Overlay scaleY | 0.47030878859857483 |
| Aspect-ratio-safe scale | 0.47030878859857483 (`min(scaleX, scaleY)`) |
| Bilingual divider | x = 0.5 |
| Safety inset | 0.02 |
| Witness region | x=0.04, y=0.6, w=0.92, h=0.34 |
| English column | x=0.04, w=0.44 |
| Arabic column | x=0.52, w=0.44 |
| Label height | 0.13 |
| Min / max font | 6 pt / 9 pt |
| Protected regions | treating_physician_signature, guardian_signature (page 2) |

Label rectangles are contained in the witness region, clear the divider, do not
overlap protected regions, and the Arabic rectangle is centered in the Arabic
column. The overlay is uniformly scaled and centered on the source page; no
non-uniform stretching is applied.

## 9. Tests & baseline

Focused test run:

- `conditional-witness-acceptance.test.ts`: 17/17 pass
- `conditional-witness-preview.test.ts`: 15/15 pass
- `witness-policy-profiles.test.ts`: all pass
- `witness-policy-service.test.ts`: all pass
- `patient-declarations-panel.test.ts`: all pass
- `migration-0031-contract.test.ts`: all pass

Full suite (`npm test`): **382 tests, 379 pass, 3 fail**.

Baseline failures (verified at `a9e52897`):

1. `demo-account-access.test.ts` — expected `promissory-notes` in visible modules.
2. `modules-catalog-routing.test.ts` — expected `promissory-notes`, got `wathiqnote`.
3. `package1-idempotency.test.ts` — unique idempotency index partial-on-non-null assertion.

No new failures were introduced.

## 10. Quality gates

| Gate | Result |
|---|---|
| `git diff --check` | Clean |
| `prisma validate` (with `DATABASE_URL=postgresql://dummy`) | Valid |
| `prisma format` | No content change |
| TypeScript touched files | Zero new errors |
| ESLint touched files | Zero errors (pre-existing warnings only) |
| Migration-applying build | Not run (per safety rule) |

## 11. Blockers & production prerequisites

No blockers remain for preview acceptance.

Production prerequisites:

1. Clinical-governance approval to move the IMC MR 1168 profile from
   `PREVIEW_ACTIVE` to `PRODUCTION_APPROVED`.
2. Apply migration `0031` via the normal build-time migration runner (not
   `prisma migrate deploy`).
3. `prisma generate` after schema change.
4. No new environment variables.

## 12. Safety confirmation

- No push, deploy, Vercel, or remote rendering.
- No remote database connection or mutation; `prisma migrate deploy` / `prisma db push` not run.
- No real signing, SMS, email, WhatsApp, or messaging.
- No real patient data used.
- No `.env`/secrets changes.
- No main-branch work or history rewrite.
- No software downloaded or installed outside the working directory.
- All evidence is synthetic and visibly marked `TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE`.
