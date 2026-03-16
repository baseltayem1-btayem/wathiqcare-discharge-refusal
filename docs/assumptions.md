# Assumptions and Known Gaps

## Assumptions Used for This Backend Foundation
- Existing organization and user provisioning exists or is seeded for non-production environments.
- Tenant context is resolved from JWT payload and trusted by the backend.
- Postgres, Redis, and S3-compatible storage are available in all deployment environments.
- Case workflow templates are managed in database entities (`Workflow*`) rather than hardcoded state machines.
- API consumers are internal or trusted clients that can handle role/permission-based denials.

## Known Gaps (Current Iteration)
- No full end-to-end HTTP test harness against a live Nest app + database yet.
- No background job scheduler implemented for SLA escalation automation.
- No dedicated outbound provider adapters (SMS/email/WhatsApp) beyond notification records.
- No persistent refresh-token revocation list.
- No full SIEM integration or tamper-evident chain for audit records.
- No finalized object-store encryption/key-management policy in this iteration.

## Operational Constraints
- Current test suite uses unit/integration-style service tests with in-memory stubs.
- Production secrets management is expected to be handled by deployment environment.
- Multi-region and HA topology decisions are out of scope for this code drop.

## Immediate Next Steps for Go-Live Hardening
1. Add true database-backed integration/e2e tests for critical refusal lifecycle flows.
2. Implement rate limiting and abuse protection for auth and OTP endpoints.
3. Add refresh token rotation/revocation persistence.
4. Implement outbound communication adapters with delivery receipt reconciliation.
5. Add observability package (metrics, tracing, log correlation IDs, alerting SLOs).
