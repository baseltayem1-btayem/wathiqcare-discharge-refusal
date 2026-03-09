# Security Assessment

Date: 2026-03-09
Scope: authentication, authorization, tenant isolation, basic launch hardening

## Controls Reviewed
- JWT-based authentication with expiration
- Password hashing via bcrypt (`passlib`)
- API bearer token dependency checks
- Role-based access control guard (`require_roles`)
- Tenant context propagation in token payload

## Validation Evidence
- Doctor/Nurse/Legal login tokens were successfully issued in UAT simulation.
- Unauthorized operation attempts were blocked (`403` observed for nurse action outside role scope).
- Launch status check confirms authentication secret configured (not default `change-me`) for current runtime.

## Findings
- Medium: Default fallback JWT secret exists in code (`change-me`) and is safe only if environment override is guaranteed.
- Medium: Some workflow endpoints return business validation errors (`400`) that are expected by state machine but can be misread as security failures without clear operator guidance.
- Low: Nafath remains unavailable in environment; this is operational rather than a direct security defect.

## Recommendations
- Enforce startup guard: fail boot if `JWT_SECRET_KEY` is unset or equals `change-me`.
- Add explicit API error catalog for workflow precondition failures to improve triage.
- Add periodic RBAC regression tests per role matrix (Doctor, Nurse, Legal Officer, Admin).

## Conclusion
Security baseline is acceptable for internal soft launch with medium-priority hardening actions tracked before wider rollout.
