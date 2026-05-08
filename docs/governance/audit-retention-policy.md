# WathiqCare Audit Retention Policy

## Policy Statement

Audit records supporting authentication, workflow actions, secure-link decisions, signature milestones, PDF issuance, and legal package generation are system-of-record artifacts and must be retained to support compliance, traceability, and post-incident review.

## Mandatory Retention

- Core audit logs: retain permanently unless a superseding legal policy is approved
- Audit-chain records: retain permanently
- Release and deployment records: retain for a minimum of 7 years
- Monitoring incident records tied to audit integrity concerns: retain for a minimum of 7 years

## Covered Events

- Authentication and session state changes
- Password reset and forced-reset enforcement events
- OTP issuance, resend throttling, expiry, replay blocking, and verification events
- Secure-link creation, revocation, public access rejection monitoring, and public decision submission events
- Signature and attestation events
- PDF generation and generation failure events
- Legal package export, generation, signature, and court-bundle events
- Audit write and audit-chain append failure events

## Handling Rules

- Audit records must not be modified outside approved system behavior.
- Manual deletion of audit records is prohibited.
- Access to raw audit data must be limited to authorized personnel.
- Any audit corruption, loss, or continuity gap is a compliance incident.

## Storage Expectations

- Audit records must remain in durable storage covered by backup policy.
- Backup restoration procedures must preserve event ordering and event timestamps where possible.
- Audit exports used for review must be treated as controlled copies, not authoritative sources.

## Review Cadence

- Quarterly review by IT and Quality/Compliance
- Immediate review after any production incident affecting logging, signatures, PDFs, or legal package generation
