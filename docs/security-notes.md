# Security Notes

## Authentication
- JWT-based auth with access and refresh token flows.
- Access token validation via Passport JWT strategy.
- User must be active and belong to the expected tenant context.

## Authorization
- Endpoint permission checks use `@Permissions(...)` and `PermissionsGuard`.
- Super-admin bypass exists for cross-cutting operations.
- Domain services apply tenant-scoped lookups to avoid cross-tenant data access.

## Input and API Hardening
- Global validation pipe enforces:
  - whitelist mode
  - non-whitelisted field rejection
  - DTO transformation
- Helmet middleware for common HTTP hardening headers.
- Compression middleware for response efficiency.
- Global exception filter normalizes error outputs.

## Sensitive Operations
- Discharge decision write path checks clinical role unless explicit override/super-admin context.
- OTP service includes expiry windows, retry caps, and lock behavior.
- Legal hold logic prevents forbidden document deletion.

## Data and Secret Handling
- Runtime secrets are environment-driven (`JWT_*`, DB, Redis, S3 credentials).
- No hardcoded production credentials should exist in source control.
- Signed URL generation is abstracted through document storage service.

## Auditability
- Critical actions are logged with actor identity and metadata.
- Case-level audit retrieval endpoint exists for legal/compliance review.

## Recommended Next Hardening Steps
- Add refresh token rotation and revocation persistence.
- Add rate limiting and IP-based abuse controls for auth and OTP endpoints.
- Enforce stricter password policy and optional MFA.
- Add at-rest encryption strategy for highly sensitive attachment metadata.
- Add security-focused e2e tests (token misuse, tenant boundary attempts, OTP brute-force).
