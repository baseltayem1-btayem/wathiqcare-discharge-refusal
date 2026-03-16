# Production Environment Readiness Checklist (Sanitized)

Date: 2026-03-16
Stage: Pre-Go-Live Operational Freeze
Classification anchor: frontend production build passed

## Freeze Scope
- No feature work.
- No schema expansion.
- Only launch-blocking fixes are allowed.

## Environment Validation Gates
1. Render production config with no interpolation failures:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod config >/tmp/wathiqcare.prod.config.yaml
```

2. Confirm no placeholder values remain:

```bash
rg "REPLACE_WITH_|change-me|localhost|127.0.0.1" .env.prod
```

3. Confirm stack health endpoints after startup:

```bash
curl -sf http://localhost:4000/api/health/live
curl -sf http://localhost:4000/api/health/ready
curl -sf http://localhost:3000/api/health
```

## Runtime Secrets Register

| Secret Name | Purpose | Owner | Rotation Policy | Status |
| --- | --- | --- | --- | --- |
| POSTGRES_PASSWORD | PostgreSQL authentication | DBA + Platform SRE | 90 days or incident-driven | Pending real value |
| REDIS_PASSWORD | Redis authentication and OTP cache protection | Platform SRE | 90 days or incident-driven | Pending real value |
| S3_ACCESS_KEY | Object storage access identity | Platform SRE | 90 days or incident-driven | Pending real value |
| S3_SECRET_KEY | Object storage access secret | Platform SRE | 90 days or incident-driven | Pending real value |
| JWT_ACCESS_SECRET | Access token signing | Security + Backend Lead | 90 days or incident-driven | Pending real value |
| JWT_REFRESH_SECRET | Refresh token signing | Security + Backend Lead | 90 days or incident-driven | Pending real value |
| NEXTAUTH_SECRET | Frontend auth/session cryptographic secret | Frontend Lead + Security | 90 days or incident-driven | Must be set before cutover |

## Runtime Configuration Readiness Matrix

| Variable | Service | Required | Secret | Purpose | Owner |
| --- | --- | --- | --- | --- | --- |
| POSTGRES_USER | postgres/api | Yes | No | Database username | DBA |
| POSTGRES_PASSWORD | postgres/api | Yes | Yes | Database password | DBA + Platform SRE |
| POSTGRES_DB | postgres/api | Yes | No | Database name | DBA |
| POSTGRES_PORT | postgres | Yes | No | Host bind port | Platform SRE |
| REDIS_PASSWORD | redis/api | Yes | Yes | Redis password | Platform SRE |
| REDIS_PORT | redis | Yes | No | Host bind port | Platform SRE |
| S3_ACCESS_KEY | minio/api | Yes | Yes | Object storage access key | Platform SRE |
| S3_SECRET_KEY | minio/api | Yes | Yes | Object storage secret key | Platform SRE |
| S3_BUCKET | minio/api | Yes | No | Document bucket name | Platform SRE |
| S3_REGION | api | Yes | No | Storage region label | Platform SRE |
| MINIO_PORT | minio | Yes | No | MinIO API bind port | Platform SRE |
| MINIO_CONSOLE_PORT | minio | Yes | No | MinIO console bind port | Platform SRE |
| JWT_ACCESS_SECRET | api | Yes | Yes | Access JWT signing key | Security + Backend Lead |
| JWT_REFRESH_SECRET | api | Yes | Yes | Refresh JWT signing key | Security + Backend Lead |
| JWT_ACCESS_EXPIRES_IN | api | Yes | No | Access token TTL | Backend Lead |
| JWT_REFRESH_EXPIRES_IN | api | Yes | No | Refresh token TTL | Backend Lead |
| DEFAULT_TENANT_CODE | api | Yes | No | Default tenant routing | Product Owner + Backend Lead |
| CORS_ALLOWED_ORIGINS | api | Conditional | No | Explicit browser origin allowlist | Security + Platform SRE |
| STARTUP_STRICT_READINESS | api | Yes | No | Fail-fast startup hardening | Platform SRE |
| OTP_ALLOW_INMEMORY_FALLBACK | api | Yes | No | OTP fallback safety (must be false in prod) | Security + Backend Lead |
| MAX_UPLOAD_FILE_SIZE_BYTES | api | Yes | No | Max upload size | Backend Lead |
| ALLOWED_UPLOAD_MIME_TYPES | api | Yes | No | Upload content allowlist | Security + Backend Lead |
| FRONTEND_PORT | frontend | Yes | No | Frontend host bind port | Platform SRE |
| NEXTAUTH_URL | frontend | Yes | No | Public app URL | Platform SRE + Networking |
| NEXTAUTH_SECRET | frontend | Yes | Yes | Session secret | Frontend Lead + Security |
| BACKEND_NEST_API_BASE_URL | frontend | Yes | No | Internal SSR-to-API route target | Platform SRE |

## Sign-off Checklist
- [ ] All secrets injected from secure vault or secret manager.
- [ ] No placeholder values in .env.prod.
- [ ] Production compose interpolation command passes.
- [ ] Startup strict readiness is enabled.
- [ ] OTP in-memory fallback is disabled.
- [ ] Frontend health endpoint and backend readiness endpoint return HTTP 200.
- [ ] Owners acknowledged on-call coverage for launch window.

## Final Readiness Decision
- If any item above is unchecked, environment is Not Ready for hospital cutover.
- If all items above are checked, environment is Ready for cutover execution.
