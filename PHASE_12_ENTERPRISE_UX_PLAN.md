# Phase 12 — Enterprise Clinical SaaS UX Hardening

> Status: **In progress.** Phase 12.1 (foundation + evidence panel architecture) — shipping.

## Goals

Convert WathiqCare's UI into a dense enterprise clinical workflow surface
inspired by Epic, Cerner, and TrakCare, raise the legal-evidence
architecture to pilot-grade, and prepare the platform visually and
operationally for the IMC controlled rollout.

Priority order (per stakeholder):
1. Stability
2. Physician usability
3. Legal-grade evidence integrity
4. PDF quality
5. Operational monitoring
6. Enterprise UX polish

## Scope Anchors

- Backward compatibility: **all existing routes, props, and runtime
  behavior preserved**. New work lands as additive components and
  preview routes; integration into production routes is gated and
  performed in later sub-phases.
- No production data schema changes in Phase 12.
- Pilot anchor workflow: **Informed Consent Signing**.
- Design system: **Tailwind + existing tokens** extended with a
  dedicated enterprise density layer.

## Sub-Phases

### 12.1 — Foundation + Evidence Panel Architecture (this commit)

**Adds (no existing files modified except trackers):**

- [apps/web/src/styles/enterprise-density.css](apps/web/src/styles/enterprise-density.css) — enterprise density CSS variables and utility classes (sidebar widths, ribbon height, dense row spacing, evidence card grid).
- `apps/web/src/components/enterprise/` — additive shell primitives:
  - `EnterpriseShell.tsx` — sidebar + ribbon + main grid.
  - `EnterpriseSidebar.tsx` — hierarchical navigation (sections, items, badges).
  - `EnterpriseRibbon.tsx` — quick-action ribbon under header.
  - `EnterpriseHeader.tsx` — patient/case context bar.
  - `EnterpriseSectionHeader.tsx` — dense section heading with status pill + actions.
  - `EnterpriseStatusPill.tsx`, `EnterpriseCard.tsx` — atomic primitives.
- `apps/web/src/components/evidence/` — evidence panel architecture (placeholder data, no server wiring):
  - `EvidencePanel.tsx` — container with tabbed sections.
  - `SignerEvidenceCard.tsx` — accepts `SignatureState`-shaped data.
  - `OtpLogCard.tsx` — OTP attempts timeline placeholder.
  - `AuditTrailCard.tsx` — wraps `WorkflowAuditTrail` for evidence context.
  - `QrVerificationCard.tsx` — QR rendered via `qrcode` package.
  - `ForensicMetadataCard.tsx` — placeholder fields (IP, user agent, geo, signature hash, manifest hash).
- [apps/web/app/internal/enterprise-ux/page.tsx](apps/web/app/internal/enterprise-ux/page.tsx) — internal-only preview route rendering the shell + evidence panel with mock data.
- [apps/web/tests/phase-12-enterprise-ux.spec.ts](apps/web/tests/phase-12-enterprise-ux.spec.ts) — Playwright spec capturing EN + AR screenshots into `uat-results/phase-12/12.1-foundation/`.

**Out of scope for 12.1:**
- Wiring evidence panel into real signing route.
- PDF rendering changes.
- Operational monitoring dashboard.
- Mobile/tablet specific tuning beyond responsive defaults.

### 12.2 — Tablet & Physician Usability (planned)

- Dense table layouts for the case queue.
- Larger tap targets, sticky ribbon, keyboard shortcut hints.
- Touch-friendly signature pad refinements (compose with existing `TabletSignaturePad`).

### 12.3 — Legal-grade PDF Rendering Upgrade (planned)

- Bilingual paragraph alignment audit (existing pdf-engine).
- Legal footer template (hospital, ref, timestamp, page x/y).
- Evidence timeline section appended to consent PDFs.
- PDPL data-processing section.
- Watermark architecture (DRAFT / SIGNED / COPY / VOID overlays).

### 12.4 — Tenant Operational Monitoring Placeholders (planned)

New tenant-admin route `apps/web/app/[lang]/admin/operations/` with
placeholder cards for:
- OTP failures (last 24h / 7d)
- Unsigned consents older than X hours
- Renderer failures (pdf-engine error rate)
- Audit alerts (suspicious access patterns)

### 12.5 — Wiring (planned)

Replace `SignatureEvidenceSummary` in the production signing route
with `EvidencePanel` once the new evidence model is approved.
Migration is opt-in via feature flag.

## Acceptance Evidence

Every sub-phase commits:
- Code under additive paths.
- Playwright spec + PNG screenshots under
  `uat-results/phase-12/<sub-phase>/<step>/`.
- Updated entry in this tracker with the commit SHA.

## Backward Compatibility Guardrails

- No edits to existing component props or exports without a follow-up
  shim file in `apps/web/src/types/`.
- No changes to Prisma schema.
- No changes to production-route handlers.
- No changes to `next.config.js` or `vercel.json` beyond what 0a1b6cb shipped.
- `tsc` and `next build` (Turbopack) must remain clean.

## Commit Log

| Sub-phase | Commit | Date | Notes |
|-----------|--------|------|-------|
| 12.1 | (pending) | 2026-05-19 | Foundation + evidence architecture scaffolding |
