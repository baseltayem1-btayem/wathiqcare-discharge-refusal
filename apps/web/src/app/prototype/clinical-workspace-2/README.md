# Clinical Workspace 2.0 Prototype

Isolated interactive prototype for a redesigned physician informed-consent workspace. This route is **not production code** and uses only mock, in-memory data.

## Route

Open in local dev: `http://localhost:3000/prototype/clinical-workspace-2`

## Design rationale

The current enterprise workflow (`PhysicianConsentWorkflow.tsx`) is an 8-step linear wizard with an estimated 24 clicks and 14 explicit physician decisions to dispatch a consent. The prototype tests a **cognitive-workflow-first** redesign built around four anchors:

1. **Patient**
2. **Encounter**
3. **Procedure**
4. **Clinical Knowledge Package (CKP)**

Instead of forcing the physician through category → template → procedure → anesthesia → education → review → send, the workspace auto-resolves everything the system can infer and surfaces only the items that need clinical judgment.

## Auto-resolution rules

| Item | Current workflow | Workspace 2.0 |
|------|------------------|---------------|
| Consent category | Manual dropdown | Inferred from procedure `categoryCode` |
| IMC/template | Read-only confirmation step | Resolved directly from CKP consent form |
| Anesthesia | 5 manual cards | Defaulted from procedure catalog; override only when needed |
| Education | Manual checkbox + dropdown | Auto-attached when CKP returns materials; togglable |
| Witness / interpreter / guardian | Not surfaced until send | Derived from patient capacity + language + risk + anesthesia |
| Blockers | Discovered late in send step | Surfaced immediately after procedure selection |

## Mock data

Three deterministic scenarios are seeded:

1. **Ahmad Hassan** — adult Arabic-speaking male, laparoscopic appendectomy, anesthesia required.
2. **Sara Al-Qahtani** — pediatric bilingual female, tonsillectomy, guardian + witness required (blocked until guardian documented).
3. **Robert Smith** — adult English-speaking male, high-risk coronary angiography, interpreter + witness required.

## Interactive task simulator

The right sidebar includes a live comparison panel. It records:

- Clicks
- Explicit decisions
- Task duration (from page load to send)
- Blockers hit

Baseline values are derived from the code audit of the current 8-step workflow:

- **Clicks:** 24
- **Decisions:** 14
- **Estimated time:** 145 s
- **Blockers hit:** 3

You can export the metrics as JSON evidence for the sprint report.

## Expected improvements (target)

| Metric | Baseline | Target | Primary driver |
|--------|----------|--------|----------------|
| Clicks | 24 | 6–10 | Single-screen layout, auto-resolution, collapsed steps |
| Decisions | 14 | 3–5 | Remove category/template/anesthesia/education manual selections |
| Time | ~145 s | ≤90 s | Fewer steps + auto-generated draft |
| Blockers discovered | Late | Immediate | CKE assembly evaluated on procedure selection |

## Evidence from automated smoke run

An end-to-end Playwright walkthrough (Ahmad Hassan → laparoscopic appendectomy → approve → send) produced:

- **Clicks:** 4 (vs. 24 baseline) — 83% reduction
- **Decisions:** 4 (vs. 14 baseline) — 71% reduction
- **Blockers hit:** 0 (vs. 3 baseline) — 100% reduction
- **Completion time:** sub-second in the automated script; human target remains ≤90 s.

Screenshots:

- `qa-screenshots/clinical-workspace-2-initial.png` — initial workspace state.
- `qa-screenshots/clinical-workspace-2-flow-complete.png` — completed consent with simulator comparison.

## Constraints respected

- No production code modified.
- No deploy, merge, or WathiqNote/OTP/SMS/PDF pipeline changes.
- No real patient data; all mock data is synthetic.
- Route is isolated under `/prototype`.

## Sprint 5 — Cognitive workflow audit

### Physician workflow findings
| Pain point | Current state | Intelligent-journey response |
|---|---|---|
| Default landing mid-workflow with demo data | Step 5 of 8 pre-selected | Workspace starts at first unresolved item with empty context |
| Mandatory read-only template step | Physician must click through a non-action | Template resolved silently from CKP; only surfaced if ambiguous |
| Manual category dropdown | 5 options selected by hand | Inferred from procedure `categoryCode` |
| Manual anesthesia cards | 5 pathway choices every time | Defaulted from procedure catalog; override only if clinical need |
| Education checkbox + dropdown | Generic packages, manual selection | Auto-attached from CKP; togglable |
| Blockers discovered at send | Physician reaches final step then finds guardian/OTP issues | Rules evaluated on procedure selection; blockers shown immediately |
| Duplicate readiness panels | Same checklist in step, sidebar, and audit page | One always-visible readiness sidebar |
| Decorative buttons | Save draft / request anesthesia review are non-functional | Every action is wired or hidden |

### Patient journey findings
| Pain point | Current state | Intelligent-journey response |
|---|---|---|
| Long legal text dumped on one screen | Patient must scroll dense consent text | Layered disclosure: summary → risks → benefits → alternatives → instructions |
| No comprehension check | Patient can proceed without demonstrating understanding | Optional scored understanding check before decision |
| No way to ask questions | Static FAQ only | Patient question panel with physician notification |
| Repeated mobile/OTP steps | Manual OTP re-entry | Identity verified once; OTP step tracked as audit event |
| Language toggled deep in flow | Language not obvious | Persistent language control + Arabic/English side-by-side |
| Accessibility not explicit | No text-size or contrast controls | Accessibility controls: font size, high-contrast, RTL |
| Guardian/interpreter flows not guided | Role selection unclear | Dedicated guardian and interpreter panels with attestations |

### Clinical decision-support gaps
| Gap | Current state | Prototype response |
|---|---|---|
| Expired package | Silently filtered | Blocker with explicit expiry warning |
| Updated guideline | `supersededByPackageId` unused | Warning when a newer published package exists |
| Patient-specific alerts | Allergies/comorbidities/medications not in rules | Allergy, comorbidity, and medication alert rules |
| High-risk warning | Only adds witness suggestion | Explicit high-risk warning with procedure-specific messaging |

## File map

- `page.tsx` — workspace composition
- `components/` — isolated UI sections (physician, patient, timeline, decision-support)
- `hooks/` — workspace state, patient journey state, and metrics comparison
- `lib/` — mock data, CKE resolver, patient journey data, enhanced rules
- `types/` — local type mirrors of production shapes
