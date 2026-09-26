# 06 — Production Logging Policy

## 1. Purpose

Ensure WathiqCare logs are operationally useful, privacy-safe, and legally
compliant across all environments.

## 2. Scope

Applies to:

- Application logs (Next.js server, browser client)
- API logs (Python FastAPI)
- Audit logs (hash-chained compliance events)
- Error / exception logs
- Authentication and authorization logs
- OTP, SMS, email, PDF, and CKE/content-mapping logs
- Background job and scheduler logs

## 3. Principles

1. **No PHI/PII in operational logs.** Patient names, MRNs, national IDs,
   phone numbers, emails, diagnoses, clinical notes, signatures, and OTPs must
   never appear in plain text.
2. **No secrets in logs.** Passwords, tokens, API keys, connection strings,
   private keys, and session cookies must be redacted.
3. **Structured by default.** All production logs must be JSON or an equivalent
   structured format.
4. **Traceable.** Every log must include a correlation ID and request ID where
   applicable.
5. **Append-only.** Audit logs must never be updated or deleted.

## 4. Sensitive Field Inventory

| Category | Fields |
|----------|--------|
| Patient identity | `patientName`, `fullName`, `firstName`, `lastName`, `mrn`, `nationalId`, `iqama`, `idNumber`, `dob`, `gender`, `address` |
| Contact | `email`, `phone`, `mobile`, `msisdn` |
| Clinical | `diagnosis`, `clinicalNotes`, `medicalHistory`, `allergies`, `medication`, `treatment`, `procedure` |
| Authentication | `password`, `otp`, `token`, `session`, `cookie`, `authorization`, `apiKey`, `secret` |
| Cryptographic | `signature`, `signatureDataUrl`, `privateKey`, `connectionString`, `databaseUrl` |

## 5. Redaction and Masking Rules

| Field type | Rule |
|------------|------|
| PHI/PII string | Replace with `[REDACTED]` |
| Email | Mask as `ab****@do****.com` |
| Phone/mobile | Mask as `050****67` |
| User ID / `sub` | Hash with SHA-256, prefix `u_` |
| Tenant ID | Hash with SHA-256, prefix `t_` |
| Secrets | Replace with `[REDACTED]` |
| Long strings | Truncate at 1000 characters |

## 6. Required Log Fields

Every production log should include where applicable:

- `timestamp`
- `level` / `severity`
- `service`
- `module`
- `operation`
- `event`
- `requestId`
- `runtimeCorrelationId`
- `userId` (hashed)
- `tenantId` (hashed)
- `durationMs`
- `errorCode`

## 7. Retention

| Log type | Retention | Rationale |
|----------|-----------|-----------|
| Operational logs | 30 days | Debugging and monitoring |
| Security/auth logs | 90 days | Incident investigation |
| Audit logs | 7+ years | Medico-legal and regulatory compliance |
| Error logs | 60 days | Trend analysis and RCA |

Retention must be enforced automatically by the log sink (SIEM / cloud logging).

## 8. Access Control

- Operational logs: Platform SRE and security team.
- Audit logs: Compliance officer, legal officer, and authorized auditors.
- Error logs: Engineering on-call and SRE.
- No developer may access production logs containing tenant/user identifiers
  without a ticketed reason.

## 9. Operational Ownership

| Responsibility | Owner |
|----------------|-------|
| Logging infrastructure and shipping | Platform SRE |
| Redaction rules and sensitive-field list | Security & Compliance |
| Audit log integrity | Compliance / Legal |
| Log-based alerting | SRE + Engineering |
| Dashboards | Engineering + SRE |

## 10. Developer Guidelines

- Use `logRuntimeEvent` / `logRuntimeIncident` in TypeScript.
- Use `get_logger(__name__)` in Python; the redaction filter is automatic.
- Do not use `console.log`/`console.warn`/`console.error` in production server
  paths.
- Do not include raw request bodies or database rows in log details.
- When in doubt, redact.

## 11. Compliance Notes

- This policy supports Saudi PDPL and healthcare-sector audit expectations.
- Audit logs are stored separately from operational logs and are hash-chained.
- Any log containing potential PHI must be classified and reviewed by the
  privacy team.
