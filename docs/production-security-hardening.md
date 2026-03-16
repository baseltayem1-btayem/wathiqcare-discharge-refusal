# Production Security Hardening

## Scope
This document captures Stage 4 hardening work for production readiness, focused on runtime safety, access control, input hardening, and deployment defaults.

Validation date: 2026-03-16
Primary backend for validation: backend-nest

## Implemented Hardening Controls

### 1) Environment Validation and Secret Policy
Implemented in backend-nest startup validation:
- Required runtime variables enforced (port, db, jwt, redis, object storage, tenant code).
- Production JWT strength policy:
  - Minimum secret length increased for production.
  - Weak/default secret patterns are rejected.
- Production object storage default credentials are rejected.
- CORS origin values are validated as URLs in production.
- Localhost/loopback CORS origins are rejected in production.
- Upload policy env values are validated:
  - max upload size must be positive and bounded.
  - allowed MIME list must be syntactically valid.
- OTP memory fallback is explicitly forbidden in production.

### 2) Runtime Startup Safety
Implemented fail-fast startup behavior:
- Strict dependency readiness gate can be enforced at startup.
- On readiness failure, service exits instead of serving degraded traffic.
- Structured JSON startup/failure events are emitted for operations visibility.

### 3) CORS and Request Pipeline Hardening
Implemented global request safety defaults:
- Environment-aware CORS policy:
  - Development: permissive for local tooling.
  - Production: restricted to explicit allowlist, or disabled behind proxy.
- Helmet enabled.
- Compression enabled.
- Global validation pipe configured with:
  - whitelist enabled
  - reject unknown fields
  - type transformation enabled

### 4) OTP Reliability and Abuse Surface Reduction
Implemented cache fallback hardening:
- Redis is primary OTP cache.
- Memory fallback is config-driven.
- When fallback is disabled and Redis is unavailable, OTP operations fail closed.

### 5) Document Upload and Download Security
Implemented in document module:
- Upload MIME allowlist enforcement.
- Upload max size enforcement.
- File name sanitization and traversal prevention.
- Base64 content integrity and size consistency checks.
- Visibility/confidentiality gating for list and download access.
- Download attempts are audited.
- Storage internals are not exposed in API payloads.

### 6) Legal/Compliance Visibility Controls
Implemented in legal module:
- Scope-aware legal-note visibility filtering.
- Permission checks for compliance-only and cross-scope notes.
- Validation constraints on privileged note DTOs (scope enum + lengths).

### 7) Container and Runtime Image Hardening
Implemented in backend and frontend containers:
- Multi-stage Docker builds.
- Non-root runtime users.
- Minimal production artifact copy.
- Production compose uses explicit readiness checks and dependency sequencing.

## Deployment Security Defaults (Compose)
Production compose sets secure defaults:
- Strict readiness startup enabled.
- OTP memory fallback disabled.
- Upload policy defaults set explicitly.
- Required secrets interpolated at deploy time.
- Backend network isolated from public access where possible.

## Validation Evidence
Executed on 2026-03-16:
- backend-nest build: pass
- backend-nest tests: pass (5 suites, 9 tests)
- frontend lint: pass with warnings only (0 errors)
- frontend build: pass
- production compose config interpolation: pass

## Remaining Risks and Recommended Next Controls
The following are not blockers for current code readiness but should be completed before hospital-wide scale-out:
- Add API rate limiting for auth, OTP, and high-frequency endpoints.
- Add persistent refresh-token revocation/rotation strategy.
- Replace placeholder object-storage download URL strategy with signed URL policy + expiry enforcement at storage layer.
- Integrate centralized alerting/SIEM pipeline for security events.

## Out of Scope (Intentionally Not Added)
- No new business workflow modules.
- No redesign of existing user flows.
- No schema expansion beyond hardening needs.
