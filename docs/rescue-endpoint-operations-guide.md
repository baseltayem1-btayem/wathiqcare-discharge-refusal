# Rescue Endpoint Quick Reference
**For**: Operations / Platform Lead | **Last Updated**: 2026-04-11

---

## TL;DR

**Endpoint**: `POST /api/platform/tenant-rescue`  
**Decision**: Retire after 72 hours of successful production operation  
**Action If Seeding Fails**: Use endpoint once; fix seed script; disable endpoint  

---

## When to Use (Production Emergency Only)

```
IF: New tenant provision fails silently (missing from database)
AND: Normal remediation procedures don't work
THEN: Use rescue endpoint to bootstrap tenant atomically

OTHERWISE: Do not use. Use standard tenant provisioning API instead.
```

---

##  How to Use

```bash
# Test if endpoint is available
curl -X POST http://localhost:3000/api/platform/tenant-rescue \
  -H "x-bootstrap-secret: Dolly@20202030" \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"Test"}' \
  # Response: 401 (secret invalid) or 400 (missing fields) = endpoint working

# Full recovery payload
curl -X POST http://localhost:3000/api/platform/tenant-rescue \
  -H "x-bootstrap-secret: Dolly@20202030" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Demo Hospital",
    "tenantCode": "DEMO",
    "adminEmail": "admin@hospital.demo",
    "adminFullName": "Admin User",
    "password": "SecurePassword@123",
    "allowedDomains": ["hospital.demo", "hospital.local"]
  }'

# Expected 200 response
{
  "success": true,
  "data": {
    "tenantId": "...",
    "tenantCode": "DEMO",
    "adminEmail": "admin@hospital.demo",
    "userType": "TENANT_ADMIN",
    "subscriptionStatus": "TRIALING",
    "allowedDomains": ["hospital.demo"]
  }
}
```

---

## Payload Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tenantName` | string | YES | Human-readable tenant name |
| `tenantCode` | string | YES | Unique short code (3-10 chars) |
| `adminEmail` | string | YES | Initial admin account email |
| `adminFullName` | string | YES | Initial admin full name |
| `password` | string | YES | Hashed password; will be bcrypt'd |
| `allowedDomains` | array | YES | Email domains allowed for this tenant (e.g., ["company.com"]) |

---

## What It Does Atomically

1. Creates `Tenant` record with provided name, code, and auth config
2. Creates `TenantAllowedDomain` entries for each domain
3. Creates `User` with hashed password as tenant admin
4. Creates `TenantMembership` linking user → tenant with TENANT_ADMIN role
5. Creates `Subscription` with TRIALING status

**Key Property**: All-or-nothing. If ANY step fails, entire transaction rolls back.

---

## After Using It

1. **Document incident**: Why did seeding fail? Add to runbook.
2. **Verify** the tenant and admin user are present:
   ```sql
   SELECT * FROM tenants WHERE code = 'DEMO';
   SELECT * FROM users WHERE email = 'admin@hospital.demo';
   SELECT * FROM tenant_memberships WHERE user_id = ...;
   ```
3. **Test** admin can log in:
   - Navigate to `http://platform.local/login`
   - Enter admin email + password
   - Should redirect to `/platform` dashboard
4. **Fix seed process**: Implement proper retry + validation logic
5. **Disable endpoint** (after 72-hour monitoring passes):
   - Edit `app/api/platform/tenant-rescue/route.ts`
   - Replace POST handler with `return new Response(...410 Gone...)`
   - Deploy

---

## Do NOT Use This Endpoint For

- ❌ Regular tenant provisioning (use standard tenant API)
- ❌ Testing/demo data (use staging seed script)
- ❌ Cross-tenant mutations or privilege escalation
- ❌ Anything except emergency recovery when seed fails

---

## Secret Management

**Environment Variable**: `BOOTSTRAP_SECRET`  
**Current Value**: `Dolly@20202030` (in `.env.local` only - NEVER commit)  
**Rotation**: Quarterly or if compromised  
**Monitoring**: Log all endpoint calls; alert on failures or 5+ req/min

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Wrong/missing secret | Verify `.env` contains `BOOTSTRAP_SECRET` |
| 400 Bad Request | Missing required fields | Check payload schema above |
| 404 Not Found | Endpoint doesn't exist | Endpoint was disabled/retired; use manual DB recovery |
| 500 Internal Error | Database transaction failed | Check logs; likely constraint violation (duplicate email) |

---

## Manual Recovery (If Endpoint Disabled)

If the rescue endpoint is disabled (410 Gone) and you need emergency recovery:

```sql
-- 1. Create tenant
INSERT INTO tenants (id, code, name, is_active, auth_config, created_at)
VALUES ('new-uuid', 'NEWCO', 'New Company', true, '{}'::jsonb, NOW());

-- 2. Create allowed domain
INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active)
VALUES ('new-uuid', 'tenant-id', 'newco.com', true);

-- 3. Create admin user with hashed password
-- (Password must be bcrypted. Can generate: `bcrypt.hash('Password123', 10)`)
INSERT INTO users (id, tenant_id, email, full_name, hashed_password, auth_provider, user_type)
VALUES ('user-uuid', 'tenant-id', 'admin@newco.com', 'Admin', '$2a$10$...hashed...', 'local_password', 'TENANT_ADMIN');

-- 4. Create membership
INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
VALUES ('tenant-id', 'user-uuid', 'TENANT_ADMIN', 'ACTIVE');

-- 5. Create subscription
INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start)
VALUES ('tenant-id', 'plan-uuid', 'TRIALING', NOW());
```

---

## Checklist: Before Go-Live

- [ ] Endpoint tested and working in staging
- [ ] Secret (`BOOTSTRAP_SECRET`) in `.env.local`, not committed
- [ ] Monitoring/alerting configured for endpoint calls
- [ ] Runbook documented with procedures
- [ ] Team trained on when/how to use endpoint
- [ ] 72-hour timer set to disable endpoint post-launch

---

**Need Help?** Contact: DevOps / Platform Engineering  
**Docs**: See [rescue-endpoint-retention-decision-2026-04-11.md](rescue-endpoint-retention-decision-2026-04-11.md) for full analysis
