# Hospital Go-Live Checklist

Use this checklist for production cutover approval.

## A) Security and Compliance
- [ ] Production secrets replaced (no template/default values).
- [ ] JWT secrets are strong and rotated per policy.
- [ ] CORS allowlist reviewed and approved.
- [ ] OTP memory fallback is disabled in production.
- [ ] Upload policy validated (allowed MIME, max size).
- [ ] Legal note visibility scopes reviewed with compliance team.
- [ ] Audit access permissions reviewed by role.

## B) Infrastructure Readiness
- [ ] docker-compose.prod.yml validated with .env.prod.
- [ ] Persistent volumes provisioned for postgres/minio.
- [ ] Reverse proxy/TLS configured and tested.
- [ ] Backend /api/health/live and /api/health/ready pass.
- [ ] Frontend /api/health passes.
- [ ] Resource sizing confirmed (CPU/RAM/disk).

## C) Data and Recovery
- [ ] Initial migration deploy completed successfully.
- [ ] Backup schedule enabled for database and object storage.
- [ ] Restore drill executed and documented.
- [ ] RPO/RTO accepted by operations and leadership.

## D) Functional Controls
- [ ] Login and role-based access validated for all required roles.
- [ ] Case list and case detail access validated.
- [ ] Workflow transition execution validated.
- [ ] Task completion flow validated.
- [ ] Document upload/list/download/delete rules validated.
- [ ] Legal note creation and legal hold behavior validated.

## E) Monitoring and Operations
- [ ] Service logs routed to monitored destination.
- [ ] On-call runbook shared with operations team.
- [ ] Incident escalation contacts confirmed.
- [ ] Planned maintenance and rollback procedure rehearsed.

## F) Training and Governance
- [ ] UAT sign-off completed and archived.
- [ ] End-user training for nurse/physician/legal/compliance completed.
- [ ] Support ownership assigned for first 14 days post go-live.
- [ ] Go-live communications sent to stakeholders.

## Final Go/No-Go
- Technical Lead: [ ] GO [ ] NO-GO
- Security/Compliance Lead: [ ] GO [ ] NO-GO
- Operations Lead: [ ] GO [ ] NO-GO
- Clinical Owner: [ ] GO [ ] NO-GO

Decision timestamp: ____________________
