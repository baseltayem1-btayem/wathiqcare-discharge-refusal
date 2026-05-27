# CONSENT TYPE READINESS MATRIX

**Release:** v1.0.1
**Date:** 2026-05-27
**Owner:** Program Operations (with Engineering + Legal + Clinical concurrence)
**Source:** Audit of `apps/web/src/components/modules/informed-consent-issuance/types.ts`, the Saudi consent template library, and the pilot validation evidence (`__smoke_prod_v1_0_1.json`).

This matrix is the authoritative record of which consent types are exposed in the WathiqCare UI during the controlled pilot.

---

## 1. Status Taxonomy

| Status | Meaning | UI Visibility |
|---|---|:--:|
| `pilot-ready` | Validated end-to-end during the controlled pilot. Template, workflow, signing flow, PDF generation, and audit chain all confirmed. | **Visible** |
| `active` | Generally available post-pilot. Reserved for use after pilot graduation. | **Visible** |
| `coming-soon` | Either a template/workflow exists but has not been validated end-to-end, OR the asset is partial/stubbed. | **Hidden** |
| `disabled` | Explicitly turned off. | **Hidden** |

Only `pilot-ready` and `active` types appear in the consent selector. This is enforced in:

- `apps/web/src/components/modules/informed-consent-issuance/types.ts` — `getActiveConsentTypes()`.
- `apps/web/src/components/modules/informed-consent-issuance/InformedConsentIssuancePage.tsx` — `ACTIVE_CONSENT_TYPES` constant computed once at module load.

The hidden count is surfaced as a small "N more coming soon" disclosure pill in the selector so physicians know additional types are planned but not operational.

---

## 2. Readiness Matrix (pilot)

Validation columns reflect what is confirmed in code, seed data, and the v1.0.1 production smoke (`__smoke_prod_v1_0_1.json`).

Legend: ✅ verified · ⚠️ partial · ❌ not present · n/a not applicable

| # | ID | Title (EN) | Risk | Template | Workflow | Signing | PDF | Audit Chain | Education (Phase 2.2) | Legal Review | Pilot Readiness | Production Readiness | Status |
|---|----|------------|:----:|:--------:|:--------:|:-------:|:---:|:-----------:|:---------------------:|:------------:|:---------------:|:--------------------:|:------:|
| 1 | `surgical` | Surgical Procedure Consent | high | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ pending pilot sample sign-off | **READY** | Pending GA decision (Phase D) | `pilot-ready` |
| 2 | `anesthesia` | Anesthesia Consent | high | ✅ seeded | ✅ generic | ✅ generic | ✅ | ✅ | ✅ | ⏳ not yet sampled | NOT READY (awaiting live validation) | NOT READY | `coming-soon` |
| 3 | `blood` | Blood Transfusion Consent | high | ✅ seeded | ✅ generic | ✅ generic | ✅ | ✅ | ✅ | ⏳ not yet sampled | NOT READY | NOT READY | `coming-soon` |
| 4 | `high-risk` | High-Risk Procedure Consent | high | ✅ seeded | ✅ generic | ✅ generic | ✅ | ✅ | ✅ | ⏳ not yet sampled | NOT READY | NOT READY | `coming-soon` |
| 5 | `ama` | Discharge Against Medical Advice | moderate | ✅ seeded (DAMA) | ⚠️ refusal-style only | ✅ generic | ⚠️ default text | ⚠️ partial wiring | ❌ no Phase 2.2 content | ❌ | NOT READY | NOT READY | `coming-soon` |
| 6 | `telemedicine` | Telemedicine Consent | low | ❌ not seeded | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT READY | NOT READY | `coming-soon` |
| 7 | `media` | Clinical Photography / Media Consent | moderate | ❌ not seeded | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT READY | NOT READY | `coming-soon` |
| 8 | `data-sharing` | Data Sharing Consent | moderate | ❌ not seeded | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT READY | NOT READY | `coming-soon` |

**Notes on the "generic" workflow column:** the platform routes every consent through a single public signing workflow (`/sign/[token]/workflow` → `PublicSigningWorkflow`). Workflow correctness for types 2–4 has been verified architecturally but not exercised end-to-end with live pilot patients. They are held in `coming-soon` until each is independently validated through the smoke harness and a legal evidence-sample sign-off (`PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §3).

---

## 3. UI Restriction — Validation Rules

A consent type may **only** appear in the selector if it satisfies **all** of the following at code-review time:

| # | Rule | Verified by |
|---|------|-------------|
| R1 | Template exists in the Saudi consent template library (or DB registry) with status ∈ {`APPROVED`, `ACTIVE`}. | `informed-consents-template-catalog.ts` query, seed inspection. |
| R2 | A workflow renderer is reachable (current architecture: `PublicSigningWorkflow`). | Route `/sign/[token]/workflow` resolves. |
| R3 | Signing flow gates (Education → Decision → OTP → Signature) are wired and gate-enforced server-side. | Production smoke gates `educationIsFirstNotOtp`, `signatureProtectedBeforeOtp`, `otpGatedBeforeDecision`. |
| R4 | PDF generation produces a final document with a SHA-256 hash matching the audit row. | `pdfHash` present + recomputable; `LEGAL_EVIDENCE_SPECIFICATION.md` §5. |
| R5 | Audit chain emits the canonical 7-event order documented in `LEGAL_EVIDENCE_SPECIFICATION.md` §2. | Evidence review sample. |
| R6 | Legal sample-based sign-off for the specific type during pilot. | `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §3 + §8 weekly sign-off. |

Any type missing **one or more** of R1–R6 is held in `coming-soon` (or `disabled` if intentionally turned off).

---

## 4. Promotion Procedure (`coming-soon` → `pilot-ready`)

A type may be flipped to `pilot-ready` only after **all** of the following are done:

1. Engineering confirms R1–R5 in a written validation note stored under `/pilot-evidence/<date>-<type>-validation.md`.
2. A targeted smoke run executes the full Education → Decision → OTP → Signature → PDF → audit-chain sequence against the type. Output stored alongside the validation note.
3. Legal Reviewer signs off on at least one fully executed sample of that type (R6).
4. IMC Governance Lead authorizes promotion (written acknowledgement).
5. The status flip in `types.ts` is made via a small, isolated commit (no other behavioural change in the same commit).
6. The matrix in this document is updated in the same commit.
7. Production smoke `__smoke_stabilization.cjs` continues to return 11/11 PASS.

A type may be flipped to `disabled` at any time by Program Operations + Engineering On-Call, with the same level of documentation. Demotions take effect immediately on the next deploy.

---

## 5. Currently Exposed Types (snapshot)

At v1.0.1 the following types are exposed in the UI selector:

- `surgical` — Surgical Procedure Consent.

All other catalogued types are hidden behind the `coming-soon` status. The selector displays a "7 more coming soon" disclosure pill so physicians remain aware that the catalogue will grow as types are validated.

---

## 6. Implementation Pointers

- Type registry & status field: `apps/web/src/components/modules/informed-consent-issuance/types.ts`.
- Filter helper: `getActiveConsentTypes()` in the same file.
- Selector render: `apps/web/src/components/modules/informed-consent-issuance/InformedConsentIssuancePage.tsx` (uses `ACTIVE_CONSENT_TYPES`).
- Selector component: `apps/web/src/components/modules/informed-consent-issuance/ConsentTypeSelector.tsx` (accepts `consentTypes` + `hiddenCount`).
- Existing pilot allowlists for users/specialties (parallel mechanism, unchanged): `apps/web/src/modules/consent-engine/pilot/`.
- Template catalogue + DB status filter (already enforces `APPROVED`/`ACTIVE`): `apps/web/src/lib/server/informed-consents-template-catalog.ts`.

No production-risk architectural refactor was undertaken. The change is UI-side filtering plus a normative matrix; server contracts and database schema are unchanged.

---

## 7. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-27 | Initial matrix. `surgical` set to `pilot-ready`; all others `coming-soon`. Aligned with the v1.0.1 production smoke evidence. | Program Operations |
