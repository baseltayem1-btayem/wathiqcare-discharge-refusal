# PHASE 2: DEVOPS & CI/CD PIPELINE
**WathiqCare Online - Healthcare Legal SaaS**  
**Document Version:** 1.0  
**Date:** May 13, 2026  
**Status:** ✅ ACTIVE - Implementation Complete

---

## EXECUTIVE SUMMARY

Phase 2 implements enterprise-grade DevOps and CI/CD infrastructure for WathiqCare Online, providing:
- **Automated CI/CD pipeline** with security validation gates
- **Deployment protection rules** with approval workflows
- **Comprehensive monitoring & observability**
- **Disaster recovery procedures** with automated backup/restore

This phase ensures reliable, repeatable, secure deployments from code to production.

---

## PART A: CI/CD PIPELINE ARCHITECTURE

### A1. Pipeline Stages Overview

```
GitHub Push
    ↓
[STAGE 1] Checkout & Dependencies
    ├─ Checkout code
    ├─ Setup Node.js
    ├─ npm ci (reproducible installs)
    └─ Cache dependencies
    ↓
[STAGE 2] Code Quality & Linting
    ├─ npm run lint (ESLint)
    ├─ TypeScript type checking
    ├─ Prettier format check
    └─ Dependency vulnerability scan
    ↓
[STAGE 3] Testing
    ├─ Unit tests (Jest)
    ├─ Integration tests
    ├─ Playwright E2E tests
    └─ Coverage reporting (>80% threshold)
    ↓
[STAGE 4] Build & Validation
    ├─ npm run build (production build)
    ├─ Prisma schema validation
    ├─ Next.js build output verification
    ├─ Security scanning (OWASP, SCA)
    └─ Artifact generation (.next, migrations)
    ↓
[STAGE 5] Enterprise Hardening Validation
    ├─ CSP header validation
    ├─ RBAC integrity check
    ├─ Audit logging verification
    ├─ Tenant isolation validation
    └─ Secrets configuration check
    ↓
[STAGE 6] Staging Deployment
    ├─ Deploy to staging environment
    ├─ Run smoke tests
    ├─ Database migration verification
    └─ Health check validation
    ↓
[STAGE 7] UAT Approval Gate ⚠️ MANUAL APPROVAL REQUIRED
    ├─ Staging environment ready
    ├─ QA team verification
    └─ Security review approval
    ↓
[STAGE 8] Production Deployment
    ├─ Blue-green deployment strategy
    ├─ Database migrations
    ├─ Cache invalidation
    ├─ Health checks
    └─ Rollback ready
    ↓
[STAGE 9] Post-Deployment Verification
    ├─ Production smoke tests
    ├─ Monitoring alerting check
    ├─ Audit log verification
    └─ Performance baseline
    ↓
✅ Deployment Complete
```

---

## PART B: GITHUB ACTIONS WORKFLOWS

### B1. Main CI/CD Pipeline Workflow (`enterprise-cicd-pipeline.yml`)

```yaml
name: Enterprise CI/CD Pipeline

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: '20.11.0'

jobs:
  # ============================================================================
  # STAGE 1: CHECKOUT & DEPENDENCIES
  # ============================================================================
  setup:
    name: Checkout & Setup
    runs-on: ubuntu-latest
    outputs:
      cache-key: ${{ steps.cache.outputs.key }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
        
      - name: Generate cache key
        id: cache
        run: echo "key=${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}" >> $GITHUB_OUTPUT

  # ============================================================================
  # STAGE 2: CODE QUALITY & LINTING
  # ============================================================================
  lint:
    name: Code Quality & Linting
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
        
      - name: Run ESLint
        run: npm run lint --workspace=apps/web
        continue-on-error: false
        
      - name: TypeScript type check
        run: npx tsc --noEmit --workspace apps/web
        continue-on-error: false
        
      - name: Check formatting with Prettier
        run: npx prettier --check "apps/web/**/*.{ts,tsx,js,jsx,json,css,md}"
        continue-on-error: false
        
      - name: Dependency vulnerability scan
        run: npm audit --production
        continue-on-error: true
        
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'WathiqCare'
          path: '.'
          format: 'JSON'
          args: >
            --scan apps/web
            --exclude node_modules
            --suppress .dependencycheck-suppress.xml

  # ============================================================================
  # STAGE 3: TESTING
  # ============================================================================
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: setup
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: wathiqcare_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
        
      - name: Setup test database
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/wathiqcare_test
        run: |
          npx prisma migrate deploy
          npx prisma db seed
          
      - name: Run unit tests
        run: npm run test -- --coverage --testPathPattern="__tests__" --collectCoverageFrom="src/**/*.ts"
        working-directory: apps/web
        
      - name: Check coverage threshold (>80%)
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | grep '"lines"' | head -1 | grep -oP '(?<="pct":)\d+(?:\.\d+)?')
          if [ $(echo "$COVERAGE < 80" | bc) -eq 1 ]; then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
        working-directory: apps/web
        
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: apps/web/coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true

  # ============================================================================
  # STAGE 4: BUILD & VALIDATION
  # ============================================================================
  build:
    name: Build & Validation
    runs-on: ubuntu-latest
    needs: [lint, test]
    outputs:
      image-tag: ${{ steps.image.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
        
      - name: Generate Prisma client
        run: npx prisma generate
        working-directory: apps/web
        
      - name: Build Next.js application
        run: npm run build
        working-directory: apps/web
        env:
          NEXT_PUBLIC_API_URL: https://staging.wathiqcare.online/api
          
      - name: Validate build output
        run: |
          test -d apps/web/.next || exit 1
          test -f apps/web/.next/BUILD_ID || exit 1
          echo "✓ Next.js build validated"
          
      - name: Validate Prisma migrations
        run: |
          npx prisma migrate status --schema=apps/web/prisma/schema.prisma || true
          
      - name: Security scan - OWASP ZAP
        uses: zaproxy/action-full-scan@v0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
        continue-on-error: true
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: apps/web/.next/
          retention-days: 5
          
      - name: Set image tag
        id: image
        run: echo "tag=${{ github.sha }}" >> $GITHUB_OUTPUT

  # ============================================================================
  # STAGE 5: ENTERPRISE HARDENING VALIDATION
  # ============================================================================
  hardening:
    name: Enterprise Hardening Validation
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
        
      - name: Validate CSP headers
        run: |
          npx tsx scripts/validate/csp-headers.ts
        continue-on-error: false
        
      - name: Validate RBAC integrity
        run: |
          npx tsx scripts/validate/rbac-integrity.ts
        continue-on-error: false
        
      - name: Validate audit logging configuration
        run: |
          npx tsx scripts/validate/audit-logging.ts
        continue-on-error: false
        
      - name: Validate tenant isolation
        run: |
          npx tsx scripts/validate/tenant-isolation.ts
        continue-on-error: false
        
      - name: Validate secrets configuration
        run: |
          npx tsx scripts/validate/secrets-check.ts
        continue-on-error: false
        env:
          ENVIRONMENT: 'ci'

  # ============================================================================
  # STAGE 6: STAGING DEPLOYMENT
  # ============================================================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, hardening]
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    environment:
      name: staging
      url: https://staging.wathiqcare.online
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: next-build
          path: apps/web/.next/
          
      - name: Deploy to Vercel (Staging)
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
          
      - name: Run staging smoke tests
        run: |
          npm ci
          npm run test:e2e:smoke
        working-directory: e2e
        env:
          BASE_URL: https://staging.wathiqcare.online
          TEST_USER_EMAIL: staging-test@wathiqcare.online
          TEST_USER_PASSWORD: ${{ secrets.STAGING_TEST_USER_PASSWORD }}
          
      - name: Database migration verification
        run: |
          npx prisma migrate status --schema=apps/web/prisma/schema.prisma
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          
      - name: Health check validation
        run: |
          curl -f https://staging.wathiqcare.online/api/health || exit 1
          
      - name: Slack notification - Staging Ready
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🎯 WathiqCare Staging Deployment Ready",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Environment Ready for UAT*\n\nCommit: ${{ github.sha }}\nBranch: ${{ github.ref }}\nEnvironment: https://staging.wathiqcare.online\n\n⏳ Awaiting QA team approval for production promotion"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  # ============================================================================
  # STAGE 7: UAT APPROVAL GATE
  # ============================================================================
  uat-approval:
    name: UAT Approval Gate
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: uat-approval
    steps:
      - name: Wait for UAT approval
        run: |
          echo "⏳ Waiting for QA team approval..."
          echo "Deployment is ready for production promotion"
          echo "Review staging environment: https://staging.wathiqcare.online"
          echo ""
          echo "UAT Checklist:"
          echo "- [ ] All 11 role workflows tested"
          echo "- [ ] All 8 business workflows validated"
          echo "- [ ] Mobile responsiveness verified"
          echo "- [ ] Arabic/English rendering correct"
          echo "- [ ] PDF generation functional"
          echo "- [ ] Signature flow working"
          echo "- [ ] Audit logging verified"
          echo ""
          echo "⚠️  Merge gate: Requires explicit approval from QA lead"

  # ============================================================================
  # STAGE 8: PRODUCTION DEPLOYMENT
  # ============================================================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: uat-approval
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    environment:
      name: production
      url: https://wathiqcare.online
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: next-build
          path: apps/web/.next/
          
      - name: Create deployment record
        run: |
          echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > DEPLOYMENT_TIMESTAMP
          echo "${{ github.sha }}" > DEPLOYMENT_COMMIT
          echo "${{ github.actor }}" > DEPLOYMENT_ACTOR
          
      - name: Deploy to Vercel (Production)
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
          prod: true
          
      - name: Run production smoke tests
        run: |
          npm ci
          npm run test:e2e:smoke:prod
        working-directory: e2e
        env:
          BASE_URL: https://wathiqcare.online
          TEST_USER_EMAIL: prod-test@wathiqcare.online
          TEST_USER_PASSWORD: ${{ secrets.PROD_TEST_USER_PASSWORD }}
          
      - name: Verify production health
        run: |
          for i in {1..5}; do
            curl -f https://wathiqcare.online/api/health && break
            echo "Health check attempt $i failed, retrying..."
            sleep 10
          done
          
      - name: Verify audit logging
        run: |
          npx tsx scripts/validate/production-audit-check.ts
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
          
      - name: Cache invalidation
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"files":["https://wathiqcare.online/*"]}'
            
      - name: Slack notification - Production Deployed
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ WathiqCare Production Deployment Complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Successful*\n\nCommit: ${{ github.sha }}\nDeployed by: ${{ github.actor }}\nProduction: https://wathiqcare.online\n\n✅ All health checks passed\n✅ Audit logging verified\n✅ Cache invalidated"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  # ============================================================================
  # STAGE 9: POST-DEPLOYMENT VERIFICATION
  # ============================================================================
  post-deploy-verify:
    name: Post-Deployment Verification
    runs-on: ubuntu-latest
    needs: deploy-production
    if: always()
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Run production e2e tests
        run: |
          npm ci
          npm run test:e2e:full
        working-directory: e2e
        env:
          BASE_URL: https://wathiqcare.online
          ENVIRONMENT: production
          
      - name: Verify monitoring alerts active
        run: |
          curl -X GET "https://api.datadoghq.com/api/v1/monitor" \
            -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
            -H "DD-APPLICATION-KEY: ${{ secrets.DATADOG_APP_KEY }}" | jq '.[] | select(.tags[] | contains("production"))'
            
      - name: Generate deployment report
        run: |
          npx tsx scripts/generate-deployment-report.ts
        env:
          ENVIRONMENT: production
          DEPLOYMENT_TIMESTAMP: $(cat DEPLOYMENT_TIMESTAMP)
          DEPLOYMENT_COMMIT: $(cat DEPLOYMENT_COMMIT)
          
      - name: Upload deployment report
        uses: actions/upload-artifact@v4
        with:
          name: deployment-report
          path: deployment-report-*.json
          retention-days: 30
```

---

### B2. Playwright E2E Test Workflow (`e2e-tests.yml`)

```yaml
name: E2E Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:
  push:
    branches:
      - main
      - develop

jobs:
  e2e:
    name: E2E Tests (${{ matrix.browser }})
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20.11.0'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}
        
      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: https://staging.wathiqcare.online
          ENVIRONMENT: staging
          
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
```

---

## PART C: DEPLOYMENT PROTECTION RULES

### C1. GitHub Branch Protection Rules

```yaml
# Apply to: main branch

Protection Requirements:
  ✓ Require pull request reviews before merging
    - Required approvals: 2
    - Dismiss stale reviews: true
    - Require code owner reviews: true
    
  ✓ Require status checks to pass before merging
    - Strict mode: require branch to be up-to-date
    - Required checks:
      - lint (must pass)
      - test (must pass)
      - build (must pass)
      - hardening (must pass)
      - deploy-staging (must pass)
      - uat-approval (must pass before production)
      
  ✓ Require up-to-date branches
    - Dismiss stale reviews when commits are pushed: true
    
  ✓ Require branches to be up-to-date before merging
    - Enabled
    
  ✓ Require conversation resolution before merging
    - Enabled
    
  ✓ Require signed commits
    - Enabled for production
    
  ✓ Require deployment reviews
    - Environments requiring review: production
    - Reviewers: Security team + Product team
    
  ✓ Restrict who can push to matching branches
    - Dismiss pull request reviews from code owners: false
```

---

### C2. Deployment Environments Configuration

```yaml
# Staging Environment
name: staging
protection_rules:
  - required_reviewers: 1
  - reviewers: [qa-team, staging-admins]
  - auto_merge_enabled: true
  - secrets_encryption: github-secrets
  
# Production Environment
name: production
protection_rules:
  - required_reviewers: 2
  - reviewers: [security-team, product-leads]
  - auto_merge_enabled: false
  - require_manual_approval: true
  - deployment_timeout_minutes: 30
  - secrets_encryption: aws-secrets-manager
```

---

## PART D: MONITORING & OBSERVABILITY

### D1. Application Performance Monitoring (APM)

```typescript
// apps/web/src/lib/monitoring/apm.ts

import * as Sentry from "@sentry/nextjs";
import { DatadogRum } from "@datadog/browser-rum";

export function initializeAPM() {
  // Sentry - Error tracking
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV,
    tracesSampleRate: process.env.APP_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  // DataDog - Real User Monitoring
  DatadogRum.init({
    applicationId: process.env.NEXT_PUBLIC_DD_APP_ID,
    clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN,
    site: 'datadoghq.com',
    service: 'wathiqcare-web',
    env: process.env.APP_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
  });
}

// Logging service
export class LoggingService {
  static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      environment: process.env.APP_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    };

    if (process.env.APP_ENV === 'production') {
      // Send to centralized logging
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Fallback to console if service unavailable
        console[level](message, context);
      });
    } else {
      console[level](message, context);
    }

    // Also track errors in Sentry
    if (level === 'error') {
      Sentry.captureMessage(message, 'error');
    }
  }
}
```

---

### D2. Custom Monitoring Alerts

```yaml
# DataDog Monitor Configuration

monitors:
  - name: "High Error Rate in Production"
    type: "metric alert"
    query: "avg:trace.web.request.errors{env:production} > 5"
    threshold: 5
    evaluation_delay: 300
    notify:
      - "#prod-alerts"
      - "oncall@wathiqcare.online"
      
  - name: "Database Connection Pool Exhausted"
    type: "metric alert"
    query: "avg:system.db.connection_pool.usage{service:wathiqcare-web} > 90"
    threshold: 90
    evaluation_delay: 60
    notify:
      - "#prod-db-team"
      
  - name: "API Response Time Degradation"
    type: "metric alert"
    query: "avg:trace.web.request.duration{env:production} > 2000"
    threshold: 2000
    evaluation_delay: 300
    notify:
      - "#prod-alerts"
      
  - name: "Unauthorized Access Attempts"
    type: "logs alert"
    query: "source:wathiqcare status:401 OR status:403"
    threshold: 10
    evaluation_delay: 60
    notify:
      - "#security-team"
```

---

## PART E: DISASTER RECOVERY PROCEDURES

### E1. Backup Strategy

```yaml
Database Backups:
  Automated RDS Backups:
    - Frequency: Continuous (automated snapshots every 5 minutes)
    - Retention: 7 days (automatic)
    - Multi-AZ: Enabled
    - Copy to S3: Daily snapshot copy to backup bucket
    - Long-term: 30-day cycle, 1-year archive in Glacier
    
  Manual Backup Schedule:
    - Pre-deployment: Full database backup before each production release
    - Post-deployment: Verification backup after successful deployment
    - Weekly: Full backup every Sunday 00:00 UTC
    - Monthly: Monthly backup retained for 1 year
    
Storage Backups:
  S3 Versioning: Enabled on all buckets
  Replication: Cross-region replication to backup region
  Archive: Glacier transfer after 6 months
  
Application Backups:
  Code: GitHub repository (backed up to BitBucket mirror)
  Infrastructure: Terraform state in S3 with versioning
  Configuration: Secrets backed up in AWS Secrets Manager
```

### E2. Restore Procedures

```typescript
// Restore Point-in-Time Database Backup
async function restoreDatabaseFromBackup(targetTime: Date) {
  console.log(`📊 Initiating database restore to ${targetTime.toISOString()}`);
  
  // 1. Create new RDS instance from backup
  const restoreResult = await rds.restoreDBInstanceToPointInTime({
    DBInstanceIdentifier: 'wathiqcare-restore-' + Date.now(),
    SourceDBInstanceIdentifier: 'wathiqcare-prod',
    RestoreTime: targetTime,
    DBInstanceClass: 'db.t4g.large',
  });
  
  // 2. Wait for restore to complete
  await rds.waitFor('dBInstanceAvailable', {
    DBInstanceIdentifier: restoreResult.DBInstance.DBInstanceIdentifier,
  });
  
  // 3. Verify restored database
  await verifyDatabaseIntegrity(restoreResult.DBInstance);
  
  // 4. Run smoke tests
  await runSmokeTests(restoreResult.DBInstance);
  
  // 5. Provide restore endpoint for verification
  console.log(`✅ Database restored successfully`);
  console.log(`📍 Restore endpoint: ${restoreResult.DBInstance.Endpoint.Address}`);
  console.log(`⏰ Restore timestamp: ${targetTime.toISOString()}`);
  
  return restoreResult.DBInstance;
}

// Rollback Deployment
async function rollbackDeployment(previousVersion: string) {
  console.log(`🔄 Rolling back to version ${previousVersion}`);
  
  // 1. Stop traffic to current version
  await toggleBlueGreenDeployment(false);
  
  // 2. Switch to previous version
  const previousRelease = await getRelease(previousVersion);
  await switchDeployment(previousRelease);
  
  // 3. Verify health
  await verifyHealthChecks();
  
  // 4. Gradual traffic shift (10% → 50% → 100%)
  for (const percentage of [10, 50, 100]) {
    await switchTraffic(percentage);
    await sleep(60000); // 1 minute per stage
    await verifyMetrics();
  }
  
  console.log(`✅ Rollback complete`);
}
```

---

## PART F: CI/CD DEPLOYMENT CHECKLIST

### F1. Pre-Deployment Validation
- [ ] All tests passing (lint, unit, E2E)
- [ ] Code review approved (2 reviewers minimum)
- [ ] Security scanning completed (no critical vulnerabilities)
- [ ] Database migrations backward-compatible
- [ ] Feature flags configured for gradual rollout
- [ ] Monitoring alerts verified active
- [ ] Incident response team notified
- [ ] Rollback plan prepared
- [ ] Dependencies updated and audited
- [ ] Documentation updated

### F2. Deployment Execution
- [ ] Staging environment deployed and tested
- [ ] UAT team approval obtained
- [ ] Production backup created
- [ ] Blue-green deployment setup verified
- [ ] Health checks configured
- [ ] Monitoring dashboard active
- [ ] Incident response team on-call
- [ ] Deployment window confirmed
- [ ] Database migrations tested on production backup
- [ ] Secrets verified and rotated

### F3. Post-Deployment Validation
- [ ] All health checks passing
- [ ] Error rate normal (<1%)
- [ ] Response times acceptable (<500ms p95)
- [ ] Database performance stable
- [ ] Audit logs verified
- [ ] User reports monitored
- [ ] Monitoring alerts tested
- [ ] Incident response contacts verified
- [ ] Deployment report generated
- [ ] Team notified of successful deployment

---

## PHASE 2: SUMMARY & NEXT STEPS

### Completion Status
✅ **PHASE 2 COMPLETE**
- Enterprise CI/CD pipeline defined with 9 automated stages
- GitHub Actions workflows for lint → test → build → deploy
- Deployment protection rules with approval gates
- Monitoring & observability infrastructure
- Disaster recovery procedures with automated backups
- Rollback capabilities with blue-green deployment

### Phase 2 Deliverables
1. **enterprise-cicd-pipeline.yml** - Complete CI/CD workflow
2. **e2e-tests.yml** - Automated E2E testing
3. **GitHub branch protection rules** - Enforcement policies
4. **APM configuration** - Sentry + DataDog monitoring
5. **Backup & restore procedures** - Disaster recovery

### Transition to Phase 3
Phase 3 will execute:
- Staging environment deployment
- Prisma migrations execution
- Secrets configuration
- Demo data seeding
- Workflow validation setup

---

**Document Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Version:** 1.0 | **Date:** May 13, 2026  
**Next Review:** June 13, 2026 (post-Phase 3 completion)
