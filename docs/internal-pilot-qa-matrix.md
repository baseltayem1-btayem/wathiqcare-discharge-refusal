# Internal Pilot QA Matrix — Dynamic Consent

> **Status:** Internal preview QA tracking only. Not a production
> readiness sign-off.

Each row is one specialty × language × renderer × evidence
configuration. Fill in the result columns per pilot session.

## Legend

- **Validation:** Overall status from
  `/api/internal/dynamic-consent/validation` — `PASS`, `WARNING`, or
  `FAIL`.
- **PDF preview:** `200`, `501 fallback`, or `error`.
- **Verification preview:** `OK` if the
  `/internal/verify/<EV-…>?engine=dynamic-preview` page renders all
  fields with `PREVIEW_ONLY` status; otherwise note the defect.
- **Physician sign-off / Legal sign-off:** initials + date.
- **Status:** ✅ pass · ⚠ partial · ❌ blocked · ⏳ pending.

## Matrix

| # | Specialty | Language | Renderer | Evidence | Validation | PDF preview | Verification preview | Physician sign-off | Legal sign-off | Status |
| - | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cardiology | Bilingual (EN + AR) | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 2 | General Surgery | Bilingual (EN + AR) | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 3 | Orthopedics | Arabic | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 4 | Anesthesia | Bilingual (EN + AR) | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 5 | DAMA | Arabic | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 6 | Blood Transfusion | Bilingual (EN + AR) | Legal-grade | ON | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

## Per-row data capture

For each row, the pilot operator should also record:

- **Evidence ID:** `EV-…`
- **Audit hash:** `…`
- **Payload fingerprint:** `…`
- **Template hash:** `…`
- **Determinism drifts (N=3 run):** expected `0`
- **Validation overall status timestamp:** `…`
- **PDF endpoint reason** (when 501): `…`
- **Verification preview screenshot taken?** yes / no
- **Print preview screenshot taken?** yes / no
- **Observed defects:** free text
- **Browser + version:** `…`
- **Operating system:** `…`

## Go criteria for Phase 8 sign-off

All six rows must reach **✅ pass** with:

- `Validation` ∈ {`PASS`, `WARNING`} (no `FAIL`).
- `PDF preview` ∈ {`200`, `501 fallback`} (controlled 501 acceptable).
- `Verification preview` = `OK`.
- Physician sign-off recorded.
- Legal sign-off recorded.
- Zero determinism drifts.

Any `❌ blocked` row holds Phase 8 sign-off until resolved. **Phase 8
sign-off does not authorize production activation.**
