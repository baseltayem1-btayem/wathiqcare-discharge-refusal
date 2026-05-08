# WathiqCare Architecture Freeze Note

Prepared: 2026-05-07  
Baseline commit: `396cda6`  
Status: Production-ready baseline frozen for governance, documentation, monitoring, and controlled rollout activities only.

## Purpose

This note establishes the approved post-production-readiness baseline for WathiqCare following successful production-like validation. The system state at commit `396cda6` is the reference build for governance, UAT signoff, executive demonstration, and controlled operational onboarding.

## Frozen Components

The following components are frozen unless a formally approved exception is granted:

- TrakCare-style clinical UI shell and core case workspace in `apps/web`
- Validated login, session, forced-reset, and role-routing behavior
- Secure patient link workflow and public refusal/acceptance flow
- OTP issuance, resend throttling, replay blocking, and expiry enforcement
- Signature capture, audit persistence, and audit-chain generation
- Arabic and English PDF generation and legal package generation paths
- Production-like release harness and validated runtime assumptions
- Prisma schema and database behavior required for UTF-8 legal artifact persistence

## Allowed Changes

The following changes are permitted without reopening architecture review, provided they are low risk and preserve validated behavior:

- Documentation, SOP, policy, UAT, and governance artifact updates
- Monitoring improvements that do not change business behavior or route contracts
- Operational configuration corrections in deployment environments
- Non-invasive logging, alerting, and observability additions
- Hotfixes for verified production defects with direct rollback plans

## Restricted Changes

The following changes are not allowed under the governance phase without formal approval:

- New product features
- UI redesign or layout refactoring of validated clinical screens
- Route, workflow, schema, or core auth redesign
- Replacing validated OTP, secure-link, audit, or PDF generation architecture
- Broad dependency upgrades not required for a production incident
- Refactoring that changes release-gate assumptions or validated user journeys

## Change Approval Requirement

Any proposed structural or behavioral change affecting authentication, case workflow, signature capture, audit logging, legal package generation, or PDF output requires written approval from:

- Legal Affairs
- Medical Director
- Quality/Compliance
- IT/Application Owner

Operations-only documentation updates do not require cross-functional approval unless they alter production procedure or retention commitments.

## Baseline Evidence

The frozen baseline is supported by the completed production-like validation covering:

- Platform login and public login stability
- Tenant role dashboard access
- Case creation and workspace progression
- OTP lifecycle protections
- Secure-link patient flow
- Signature and audit persistence
- Arabic and English PDF generation
- Legal package generation
- Forced password reset behavior
- Logout and session cleanup

## Governance Rule

Until a new release candidate is formally authorized, all governance artifacts, UAT evidence, monitoring checklists, and executive materials must refer to commit `396cda6` as the approved application baseline.
