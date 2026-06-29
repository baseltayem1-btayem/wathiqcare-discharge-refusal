# Rescue Endpoint Retention Decision
**Date**: 2026-04-11 | **Status**: FINAL DECISION  
**Endpoint**: `POST /api/platform/tenant-rescue` | **Auth**: Bootstrap-secret gated

---

## Executive Summary

**DECISION: RETIRE THE ENDPOINT** after recovery is confirmed in production.

The `/api/platform/tenant-rescue` endpoint served its purpose as an emergency recovery mechanism during platform stabilization. It should be retired in production to reduce attack surface and operational complexity, but retained in staging for emergency recovery scenarios.

---

## Operational Context

### What the Endpoint Does
- **Purpose**: Atomically create a complete tenant + admin user record when shell seeding fails
- **Authentication**: Requires `x-bootstrap-secret` header (environment variable: `BOOTSTRAP_SECRET`)
- **Payload**: `{ tenantName, tenantCode, adminEmail, adminFullName, password, allowedDomains }`
- **Transaction**: Upserts Tenant → AllowedDomains → User (password-backed) → TenantMembership → Subscription
- **Last Used**: During this rescue session to bootstrap tenant `DEMO` with admin `tenant_admin@demo.com`
- **Success Rate**: 100% (validated in rescue session)

---

## Risk Analysis

### Security Risks (HIGH IMPACT)

| Risk | Severity | Mitigation | Residual Risk |
|------|----------|-----------|---|
| Secret exposure via environment leaks | CRITICAL | Keep BOOTSTRAP_SECRET in `.env.local` only; never commit | HIGH if secret compromised |
| Endpoint exploited to create rogue tenants | CRITICAL | Retire endpoint after recovery; accept seed-via-ops-only post-recovery | NONE if retired |
| DOS via repeated upsert attempts | MEDIUM | No rate limiting implemented | MEDIUM if deployed |
| Audit trail bypass (synthetic bootstrap identity) | MEDIUM | Endpoint skips audit logging | MEDIUM if kept enabled |

### Operational Risks (MEDIUM IMPACT)

| Risk | Severity | Impact |
|------|----------|--------|
| Dependency on shell seed script | HIGH | Script failures leave platform unbootstrappable; recovery endpoint masks this |
| Ad-hoc admin recovery without process | MEDIUM | No documented runbook; knowledge silos |
| Cross-tenant data isolation not validated | MEDIUM | Recovery endpoint may have exposed cross-tenant mutation risks |

---

## Decision Matrix

### OPTION A: Retain in Production (NOT RECOMMENDED)
**Pros**:
- Quick recovery if seeding fails again
- No need to document manual recovery procedures  
- Can handle unexpected tenant bootstrap needs

**Cons** ⚠️:
- Increases attack surface (any vulnerability in endpoint = tenant data at risk)  
- No rate limiting → DOS attack vector
- Audit logging bypass reduces compliance observability
- Encourages operational debt (no fix to seeding process)
- Requires ongoing secret management vigilance
- No governance controls on who/when endpoint is used

**Risk Profile**: ⭐⭐⭐⭐ (4/5 stars - HIGH RISK)

---

### OPTION B: Retire After Recovery (RECOMMENDED)
**Pros** ✅:
- Eliminates attack surface post-recovery
- Forces operational discipline: fixes seed process instead of working around it
- Reduces secret management surface
- Compliance-friendly: no undocumented recovery paths
- Clear handoff: production has no ad-hoc mechanisms
- Audit trail remains intact for tenant operations

**Cons**:
- If seeding fails in production again, requires manual database operations (slower recovery)
- Requires documented runbook for emergency recovery
- Team must commit to fixing root cause (seed script reliability)

**Risk Profile**: ⭐⭐ (2/5 stars - LOW RISK)

---

## Recommended Implementation

### Phase 1: Production Deployment (NOW)
1. **Keep endpoint enabled** during initial go-live (72 hours)
2. **Document endpoint usage** in incident logs for audit trail
3. **Test seed script reliability** under production load; fix any failures
4. **Monitor for unauthorized calls**: Alert on any `/api/platform/tenant-rescue` POST requests

### Phase 2: Retirement (AFTER 72 HOURS)
1. **Verify seed script is reliable** (no failures in prod for 72 hours)
2. **Disable endpoint**: Replace `POST` handler with 410 Gone response
   ```typescript
   export async function POST() {
     return new Response(
       JSON.stringify({ 
         error: 'Endpoint retired. Use tenant provisioning API instead.' 
       }),
       { status: 410 }
     );
   }
   ```
3. **Document recovery procedures** in runbook for emergency scenarios
4. **Maintain code** in git history for reference/emergency re-enablement

### Phase 3: Emergency Use Only (IF NEEDED)
1. **If seeding fails in production**: Manually re-enable endpoint via feature flag or deploy
2. **Execute recovery**: Use endpoint to bootstrap missing tenant
3. **Investigate root cause**: Fix seed process; don't treat endpoint as permanent solution
4. **Retire again**: Disable endpoint after recovery complete

---

## Security Hardening (If Retained)

Should operational needs require retaining the endpoint, harden it with:

1. **Rate Limiting**: Max 5 requests per 15 minutes per source IP
2. **Audit Logging**: Log all calls (including synthetic identity)
   ```typescript
   await auditLog.create({
     tenantId: bootstrapIdentity.id,
     action: 'TENANT_BOOTSTRAP',
     target: tenantName,
     actor: 'system:bootstrap-recovery',
     success: true,
     metadata: { tenantCode, adminEmail }
   });
   ```
3. **Secret Rotation**: Rotate `BOOTSTRAP_SECRET` quarterly
4. **Monitoring Alerts**: Notify platform-ops on any endpoint usage
5. **IP Whitelisting**: Restrict to known deployment IPs only

---

## Implementation Timeline

| Phase | Action | Timeline | Owner |
|-------|--------|----------|-------|
| Pre-Go-Live | Validate endpoint in staging (✅ DONE) | Now | DevOps |
| Go-Live Day | Enable endpoint; monitor for calls | Day 0 | DevOps |
| Go-Live + 24h | Verify seed script reliability | Day 1 | DevOps |
| Go-Live + 72h | Disable endpoint (retire) | Day 3 | DevOps |
| Ongoing | Maintain runbook for emergency re-enablement | Post-Retire | Operations |

---

## Contingency: Root Cause Fix

The real problem is **shell seed script unreliability**. To prevent future recovery needs:

1. **Identify seed script failures**: Why did seeding fail initially?  
   - Missing DATABASE_URL context?
   - Timing issues (race conditions)?
   - Missing environment setup?

2. **Fix seed process**:
   - Make seed script self-validating (check tenant exists before declaring success)
   - Add retry logic for transient failures
   - Include pre-flight checks: verify DB connectivity, required env vars, schema version

3. **Test in CI/CD**: Run seed during deployment validation step

4. **Monitor seed executions**: Alert on failures so they're immediately visible

---

## Final Recommendation

✅ **RETIRE ENDPOINT AFTER 72-HOUR MONITORING PERIOD**

- Eliminates security risk while maintaining emergency recovery capability
- Enforces operational discipline and root cause fixes  
- Keeps audit trail clean and compliant
- Aligns with zero-trust security model for production
- Allows code preservation for reference/emergency use  

**Success Metric**: Zero calls to endpoint in production after first 72 hours, seed script has 100% reliability in staging and production.

---

##References
- Previous Session: Rescue endpoint created and validated for `tenant_admin@demo.com` / `[REDACTED]`
- Environment: `BOOTSTRAP_SECRET` = `Dolly@20202030` (in `.env.local` only)
- Next.js Routes: `/api/platform/tenant-rescue` (POST)
- Database Endpoint: PostgreSQL via Neon unpooled connection

**Note**: This endpoint is temporary infrastructure. Plan for its retirement as part of go-live readiness checklist.
