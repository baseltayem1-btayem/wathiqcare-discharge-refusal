# Rollback Notes (AUTH-CONSENT-RC1)

Date: 2026-05-15
Scope: Login, informed-consent RBAC, MRN fallback, consent-template schema alignment, persisted documents, and PDF generation updates.

## Rollback Triggers
- Elevated login failure rate after deploy.
- RBAC regression allowing unauthorized workflow action.
- Consent-template workflow schema mismatch errors.
- PDF generation or signing failure above agreed pilot threshold.

## Rollback Strategy
1. Application rollback
- Revert to last known stable release artifact.
- Restore frontend and backend deployment targets to previous version.

2. Feature containment
- Disable informed-consent workflow entry points if partial rollback is needed.
- Keep read-only access available for active case visibility.

3. Database safety
- Avoid destructive schema rollback unless explicitly required.
- If needed, run audited reverse migration scripts approved by database owner.
- Preserve legal/audit artifacts and immutable event chains.

4. Operational validation post-rollback
- Confirm login success path.
- Confirm role enforcement for doctor/legal/observer.
- Confirm case read paths and MRN fallback behavior.
- Confirm PDF retrieval for previously generated documents.

## Data and Compliance Notes
- Do not delete persisted consent records during rollback.
- Preserve audit trail continuity for legal defensibility.
- Record exact rollback time, operator, and affected versions.

## Communication Template
- Incident summary: trigger and blast radius.
- Action taken: rollback target and timestamp.
- Current state: restored services and remaining degradations.
- Next update: owner and ETA for re-release.
