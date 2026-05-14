# PRODUCTION DEPLOYMENT GUIDE
**WathiqCare Online Enterprise Production Platform v1.0**  
**Date:** May 13, 2026  
**Status:** Ready for Deployment

---

## 🚀 QUICK START: FROM CERTIFICATION TO LIVE

This guide provides step-by-step procedures to deploy WathiqCare Online from certification to live production operations.

---

## PHASE 1: PRE-DEPLOYMENT VERIFICATION (Day Before Go-Live)

### 1.1 Executive Authorization Checklist

```bash
✅ CEO/Executive Sponsor:
   [ ] All 6 phases reviewed
   [ ] All 10 certification reports reviewed
   [ ] Final GO/NO-GO decision made
   [ ] Production deployment authorized
   [ ] Signature obtained on certification document

✅ Infrastructure Lead (CTO/VP Engineering):
   [ ] Production database provisioned
   [ ] Production secrets configured
   [ ] Backup systems tested
   [ ] Monitoring systems ready
   [ ] Deployment procedures reviewed
   [ ] Rollback procedures tested
   [ ] Infrastructure sign-off obtained

✅ Security Lead:
   [ ] Security scanning completed (0 critical vulnerabilities)
   [ ] Penetration testing completed
   [ ] HTTPS/TLS configured
   [ ] WAF rules configured
   [ ] DDoS protection active
   [ ] Security sign-off obtained

✅ Operations Lead:
   [ ] On-call team briefed
   [ ] Incident response team ready
   [ ] Monitoring dashboards operational
   [ ] Runbooks approved
   [ ] Support procedures ready
   [ ] Operations sign-off obtained

✅ QA Lead:
   [ ] UAT completed with 100% pass rate
   [ ] All evidence collected
   [ ] Smoke tests documented
   [ ] Mobile testing completed
   [ ] QA sign-off obtained

✅ Business Owner:
   [ ] Business requirements met
   [ ] Compliance requirements met
   [ ] User acceptance obtained
   [ ] Go-live communication plan ready
   [ ] Business sign-off obtained
```

### 1.2 Production Infrastructure Verification

```bash
#!/bin/bash
# pre-deployment-verification.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "Pre-Deployment Production Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. Database Connectivity
echo "✓ Checking Production Database..."
psql "$DATABASE_URL_UNPOOLED" -c "SELECT version();" > /dev/null
echo "  ✅ Database: Connected"

# 2. Backup System
echo "✓ Checking Backup System..."
aws s3 ls "s3://wathiqcare-production-backups/" --region us-east-1 > /dev/null
echo "  ✅ Backups: Accessible"

# 3. Storage System
echo "✓ Checking Storage System..."
aws s3 ls "s3://wathiqcare-production-docs/" --region us-east-1 > /dev/null
echo "  ✅ Storage: Accessible"

# 4. Monitoring Systems
echo "✓ Checking Monitoring Systems..."
curl -s "https://api.datadoghq.com/api/v1/validate" \
  -H "DD-API-KEY: $DD_API_KEY" > /dev/null
echo "  ✅ DataDog: Connected"

# 5. Secrets Management
echo "✓ Checking Secrets Management..."
aws secretsmanager describe-secret --secret-id wathiqcare-production --region us-east-1 > /dev/null
echo "  ✅ Secrets: Accessible"

# 6. SSL/TLS Certificates
echo "✓ Checking SSL/TLS Certificates..."
curl -s -I "https://wathiqcare.online" | grep -q "HTTP"
echo "  ✅ HTTPS: Configured"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ALL PRE-DEPLOYMENT CHECKS PASSED"
echo "═══════════════════════════════════════════════════════"
```

### 1.3 Backup Creation & Testing

```bash
#!/bin/bash
# create-production-backup.sh

set -e

BACKUP_ID="pre-deploy-$(date +%Y%m%d-%H%M%S)"

echo "Creating pre-deployment backup: $BACKUP_ID"

# 1. Create database dump
pg_dump "$DATABASE_URL_UNPOOLED" \
  --format=custom \
  --file="backups/$BACKUP_ID.dump"
echo "  ✅ Database backed up"

# 2. Compress backup
gzip "backups/$BACKUP_ID.dump"
echo "  ✅ Backup compressed"

# 3. Upload to S3
aws s3 cp "backups/$BACKUP_ID.dump.gz" \
  "s3://wathiqcare-production-backups/$BACKUP_ID.dump.gz" \
  --region us-east-1
echo "  ✅ Backup uploaded to S3"

# 4. Test restore (in isolated environment)
echo "Testing restore capability..."
RESTORE_TEST_DB="wathiqcare_restore_test"
createdb "$RESTORE_TEST_DB" 2>/dev/null || true
pg_restore --clean --if-exists --dbname="$RESTORE_TEST_DB" \
  "backups/$BACKUP_ID.dump.gz"
echo "  ✅ Restore test passed"

# 5. Cleanup test database
dropdb "$RESTORE_TEST_DB"
echo "  ✅ Test database cleaned up"

echo ""
echo "Backup created and verified successfully: $BACKUP_ID"
```

---

## PHASE 2: DEPLOYMENT DAY EXECUTION

### 2.1 Deployment Timeline (8:00 AM - 10:00 AM)

```
08:00 - Pre-Deployment Verification (30 minutes)
        - All systems check (database, storage, secrets)
        - Health checks passing
        - Monitoring dashboards green
        - On-call team in place

08:30 - Blue-Green Switch Preparation (30 minutes)
        - Load balancer configured
        - Traffic split: 100% → Blue (staging)
        - Green (production) initialized
        - Production environment fully started

09:00 - Traffic Switch Execution (15 minutes)
        - Load balancer switches: Blue → Green
        - All traffic now flows to production
        - Staging environment on standby (blue version)
        - Monitoring actively tracking

09:15 - Immediate Post-Deployment Verification (30 minutes)
        - All health checks passing
        - Smoke tests executed and pass
        - No critical errors in monitoring
        - Users successfully logging in

09:45 - Final Verification & Communication (15 minutes)
        - All systems green and stable
        - Executive team notified of success
        - User communication: "System Live"
        - 24/7 monitoring activated

10:00 - PRODUCTION LIVE ✅
        - All users can access production
        - All 11 roles operational
        - All 8 workflows enabled
        - 24/7 monitoring and support active
```

### 2.2 Blue-Green Deployment Procedure

```bash
#!/bin/bash
# blue-green-deployment.sh

set -e

ENVIRONMENT="${1:-production}"
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"

echo "═══════════════════════════════════════════════════════"
echo "Blue-Green Deployment: $DEPLOYMENT_ID"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. Determine current active version (Blue or Green)
ACTIVE_VERSION=$(get_active_lb_target)
if [ "$ACTIVE_VERSION" = "blue" ]; then
  DEPLOY_VERSION="green"
  STANDBY_VERSION="blue"
else
  DEPLOY_VERSION="blue"
  STANDBY_VERSION="green"
fi

echo "Active: $STANDBY_VERSION | Deploying to: $DEPLOY_VERSION"
echo ""

# 2. Deploy to standby environment
echo "📦 DEPLOYMENT PHASE: Deploying to $DEPLOY_VERSION"
echo ""

echo "  Building container image..."
docker build \
  --tag "wathiqcare:$DEPLOYMENT_ID" \
  --build-arg NODE_ENV=$ENVIRONMENT \
  .
echo "    ✅ Image built"

echo "  Pushing to container registry..."
docker tag "wathiqcare:$DEPLOYMENT_ID" \
  "registry.example.com/wathiqcare:latest"
docker push "registry.example.com/wathiqcare:latest"
echo "    ✅ Image pushed"

echo "  Starting $DEPLOY_VERSION environment..."
docker-compose -f "docker-compose.$ENVIRONMENT.yml" \
  up -d --scale web=3 --no-deps web
echo "    ✅ Containers started"

# 3. Run database migrations
echo "  Running database migrations..."
DATABASE_URL="$DATABASE_URL_UNPOOLED" \
  npx prisma migrate deploy --skip-generate
echo "    ✅ Migrations completed"

# 4. Execute smoke tests
echo "  Running smoke tests..."
npm run test:smoke -- --target="$DEPLOY_VERSION"
echo "    ✅ Smoke tests passed"

# 5. Warm up the new environment
echo "  Warming up new environment..."
for i in {1..100}; do
  curl -s "https://$DEPLOY_VERSION-internal.wathiqcare.online/api/health" > /dev/null
done
echo "    ✅ Environment warmed up"

echo ""
echo "🔄 SWITCHING TRAFFIC"
echo ""

# 6. Update load balancer (switch traffic)
echo "  Updating load balancer..."
update_lb_target "$DEPLOY_VERSION"
echo "    ✅ Traffic switched to $DEPLOY_VERSION"

# 7. Health check on new active environment
echo "  Verifying new active environment..."
health_check "https://wathiqcare.online/api/health"
echo "    ✅ Production healthy"

# 8. Monitor for errors (first 5 minutes)
echo "  Monitoring for errors (5 minutes)..."
for i in {1..30}; do
  error_rate=$(get_error_rate_last_minute)
  if [ "$error_rate" -gt 5 ]; then
    echo "    ⚠️  Error rate > 5% - Rolling back"
    rollback_to_version "$STANDBY_VERSION"
    exit 1
  fi
  sleep 10
done
echo "    ✅ No errors detected"

# 9. Standby environment on ready for quick rollback
echo "  Keeping $STANDBY_VERSION on standby for quick rollback..."
echo "    ✅ Rollback ready"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "   Active Version: $DEPLOY_VERSION"
echo "   Standby Version: $STANDBY_VERSION"
echo "   Deployment ID: $DEPLOYMENT_ID"
echo "═══════════════════════════════════════════════════════"
```

### 2.3 Post-Deployment Smoke Tests

```javascript
// test-smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Post-Deployment Smoke Tests', () => {
  
  test('Production application loads', async ({ page }) => {
    const response = await page.goto('https://wathiqcare.online/');
    expect(response?.status()).toBe(200);
  });

  test('Platform admin can login', async ({ page }) => {
    await page.goto('https://wathiqcare.online/login');
    await page.fill('input[name="email"]', 'platform.admin@wathiqcare.online');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('API health check', async ({ fetch }) => {
    const response = await fetch('https://wathiqcare.online/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
    expect(data.cache).toBe('connected');
  });

  test('Database accessible', async () => {
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });

  test('All RBAC roles exist', async () => {
    const roles = await prisma.role.findMany();
    const roleNames = roles.map(r => r.name).sort();
    
    const expectedRoles = [
      'PLATFORM_ADMIN',
      'LEGAL_AFFAIRS_MANAGER',
      'MEDICAL_DIRECTOR',
      'PHYSICIAN',
      'NURSE',
      'COMPLIANCE_OFFICER',
      'FINANCE_MANAGER',
      'QUALITY_MANAGER',
      'RISK_OFFICER',
      'EXTERNAL_REVIEWER',
      'READ_ONLY_AUDITOR'
    ].sort();
    
    expect(roleNames).toEqual(expectedRoles);
  });

  test('All workflows available', async () => {
    const workflows = await prisma.workflow.findMany();
    const workflowNames = workflows.map(w => w.type).sort();
    
    const expectedWorkflows = [
      'INFORMED_CONSENT',
      'DISCHARGE_REFUSAL',
      'PROMISSORY_NOTE',
      'LEGAL_REVIEW',
      'DELEGATION',
      'ESCALATION',
      'CONDITIONAL_APPROVAL',
      'MULTI_ROLE_APPROVAL'
    ].sort();
    
    expect(workflowNames).toEqual(expectedWorkflows);
  });

  test('Audit logging working', async () => {
    const beforeCount = await prisma.auditLog.count();
    
    // Trigger an action (login)
    // ...
    
    const afterCount = await prisma.auditLog.count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
```

---

## PHASE 3: POST-DEPLOYMENT OPERATIONS

### 3.1 First 24 Hours Monitoring

**Continuous Monitoring:**
```
Every 1 minute:
  - Health check (application, database, storage)
  - Error rate monitoring
  - Performance metrics (API response time, query time)

Every 5 minutes:
  - Dashboard update (executive, operations, security)
  - Alert evaluation
  - Workflow success rate

Every hour:
  - Audit log validation
  - Hash chain verification
  - Immutability checks

24-hour checkpoints:
  - 1 hour: All systems stable, no critical errors
  - 6 hours: Workflow success rate > 99%, user satisfaction positive
  - 12 hours: Performance metrics consistently within targets
  - 24 hours: Full system stability assessment, ready for normal operations
```

### 3.2 User Communication

**Pre-Deployment (24 hours before)**
```
Subject: WathiqCare Online Going Live Tomorrow - 8:00 AM

Dear All,

WathiqCare Online is going live in production tomorrow at 8:00 AM.

What's changing:
- All workflows moving from staging to production
- All data will be on production systems
- 24/7 support available
- New features: [list new capabilities]

What to expect:
- System may be briefly unavailable during 8:00-8:15 AM
- Please log out and back in after 8:15 AM
- Enhanced performance compared to staging

If you encounter issues:
- Call: +966-XX-XXX-XXXX
- Email: ProductionSupport@wathiqcare.online
- In-App: Help & Support

Questions? Reply to this email.

Thank you,
WathiqCare Operations Team
```

**Post-Deployment (On successful go-live)**
```
Subject: ✅ WathiqCare Online Now Live in Production!

Dear All,

WathiqCare Online is now LIVE in production!

System Status: ✅ All Systems Operational
  - All 11 roles: ACTIVE
  - All 8 workflows: ACTIVE
  - Performance: EXCELLENT
  - Support: 24/7 AVAILABLE

What you can do now:
- Access WathiqCare at https://wathiqcare.online
- Create real patient care workflows
- Generate legal documents and signatures
- Track compliance and audit trails

Support & Help:
- Production Support: ProductionSupport@wathiqcare.online
- Phone (24/7): +966-XX-XXX-XXXX
- In-App Support: Available in Help menu

Welcome to WathiqCare Online Production!

WathiqCare Operations Team
```

### 3.3 Escalation Response Procedures

**Critical Issue Response (Response Time: 15 minutes)**

```bash
#!/bin/bash
# critical-incident-response.sh

INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"

echo "🚨 CRITICAL INCIDENT: $INCIDENT_ID"

# 1. Declare incident
slack_notify "#critical-incidents" "🚨 CRITICAL: $INCIDENT_ID - Page all on-call staff"
page_on_call_team "$INCIDENT_ID"

# 2. Gather information
echo "Gathering incident information..."
LOGS=$(get_error_logs_last_5min)
METRICS=$(get_system_metrics_last_5min)
AUDIT=$(get_audit_issues_last_5min)

# 3. Determine if rollback needed
if should_rollback "$LOGS" "$METRICS"; then
  echo "Executing rollback..."
  rollback_to_previous_version
  notify_all "System rolled back to previous version"
else
  echo "Analyzing for fix..."
  # Notify engineering for immediate fix
fi

# 4. Continuous monitoring
while [ $(get_incident_status "$INCIDENT_ID") != "resolved" ]; do
  sleep 10
  report_status "$INCIDENT_ID"
done

echo "✅ Incident resolved: $INCIDENT_ID"
```

**Rollback Procedures (If Needed)**

```bash
#!/bin/bash
# rollback-to-previous.sh

echo "🔙 ROLLBACK INITIATED"
echo ""

# 1. Stop production traffic
echo "1. Stopping production traffic..."
update_lb_target "backup"
echo "   ✅ Traffic stopped"

# 2. Switch to previous version
echo "2. Activating previous version (Blue)..."
activate_blue_environment
echo "   ✅ Blue environment active"

# 3. Health checks
echo "3. Running health checks..."
health_check "https://wathiqcare.online/api/health"
echo "   ✅ Health checks passed"

# 4. Verify operations
echo "4. Verifying operations..."
smoke_tests
echo "   ✅ Smoke tests passed"

# 5. Notify users
notify_all "System restored to previous version. We're working on the issue."
slack_notify "#operations" "Rollback completed successfully"

echo ""
echo "✅ ROLLBACK COMPLETE - Previous version active"
```

---

## PHASE 4: FIRST WEEK OPERATIONS

### 4.1 Daily Checklist

```
✓ Morning (9:00 AM):
  - [ ] Check overnight error logs (Sentry)
  - [ ] Verify all workflows operational
  - [ ] Check performance metrics
  - [ ] Review user feedback
  - [ ] Check backup completion status

✓ Midday (12:00 PM):
  - [ ] Performance metrics review
  - [ ] Database query performance check
  - [ ] API response times check
  - [ ] Storage usage review

✓ Evening (5:00 PM):
  - [ ] Incident review (if any)
  - [ ] User satisfaction feedback
  - [ ] Workflow success rate review
  - [ ] Optimization opportunities

✓ Night (10:00 PM):
  - [ ] On-call team briefing
  - [ ] Night monitoring setup
  - [ ] Critical alert thresholds review
  - [ ] Backup verification
```

### 4.2 Weekly Production Review Meeting

**Day:** Every Friday at 2:00 PM
**Attendees:** CTO, Operations Lead, QA Lead, Security Lead, Business Owner

**Agenda:**
1. System performance metrics (5 min)
2. User feedback and issues (5 min)
3. Error analysis and fixes (10 min)
4. Security/compliance review (5 min)
5. Planned optimizations (10 min)
6. Next week priorities (5 min)

**Report Template:**
```
Week 1 Production Report

System Uptime: 99.98%
User Satisfaction: 4.7/5.0
Workflow Success Rate: 99.2%
Critical Incidents: 0
Major Incidents: 1 (resolved in 30 minutes)

Metrics:
  - Total workflows: 287
  - Total users logged in: 45
  - API avg response: 234ms
  - DB avg query: 67ms

Issues & Resolutions:
  1. Minor email delay - Fixed (email queue optimization)
  
Optimizations:
  - Database indexing improved query performance 15%
  - Cache layer added for frequently accessed data
  
Next Week:
  - Performance monitoring
  - User training follow-up
  - Security audit review
```

---

## 🆘 EMERGENCY CONTACTS

**24/7 Production Support:**
- Phone (Emergency): +966-XX-XXX-XXXX
- Email: ProductionSupport@wathiqcare.online
- Slack: #wathiqcare-production

**Escalation Chain:**
1. **Tier 1 (Immediate):** On-call Engineer
2. **Tier 2 (10 min):** Engineering Lead
3. **Tier 3 (15 min):** CTO
4. **Tier 4 (20 min):** CEO

**Critical Contacts:**
- Database Administrator: [Contact]
- Infrastructure Lead: [Contact]
- Security Lead: [Contact]
- Operations Director: [Contact]
- CEO/Executive Sponsor: [Contact]

---

## ✅ DEPLOYMENT CHECKLIST - FINAL SIGN-OFF

```
PRE-DEPLOYMENT:
☐ Executive authorization obtained
☐ All prerequisites verified
☐ Backup created and tested
☐ Rollback procedures tested
☐ On-call team briefed

DEPLOYMENT DAY:
☐ All health checks green (08:00)
☐ Blue environment ready (08:30)
☐ Green environment ready (08:45)
☐ Traffic switched (09:00)
☐ Smoke tests passed (09:15)
☐ All systems green (09:45)
☐ Production live (10:00)

POST-DEPLOYMENT:
☐ 1-hour monitoring: All green
☐ 6-hour monitoring: All green
☐ 24-hour monitoring: All green
☐ 1-week review: Stable and optimized
☐ Production sign-off: APPROVED

FINAL STATUS: ✅ PRODUCTION LIVE AND STABLE
```

---

**Deployment Date:** [To be scheduled]  
**Deployment Authorized By:** [Executive signature]  
**Deployment Executed By:** [Operations team]  
**Deployment Completed:** [Date and time]  

**🎉 WathiqCare Online is now a fully operational Enterprise Production Platform.**

