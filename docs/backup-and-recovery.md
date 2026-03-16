# Backup and Recovery

## Purpose
Define practical backup and restore procedures for production launch and hospital operations continuity.

## Data Stores in Scope
- PostgreSQL (authoritative transactional data)
- MinIO/S3 bucket (documents and generated files)
- Redis (ephemeral/cache, OTP state)

## Recovery Objectives (Recommended)
- RPO target: 24 hours
- RTO target: 4 hours

These targets should be refined by hospital policy and legal requirements.

## Backup Policy

### 1) PostgreSQL
Frequency:
- Nightly logical backup (pg_dump custom format)
- Weekly full volume snapshot (infrastructure-level)

Example logical backup command:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backups/postgres/$(date +%F)-wathiqcare.dump
```

Retention recommendation:
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

### 2) Object Storage (MinIO/S3)
Frequency:
- Nightly mirror/sync of bucket to offsite/object-locked location

Example mirror command (using mc container):

```bash
docker run --rm --network host -v "$PWD/backups:/backup" minio/mc:latest \
  /bin/sh -c 'mc alias set local http://127.0.0.1:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY" && \
  mc mirror --overwrite local/"$S3_BUCKET" /backup/minio/'
```

Retention recommendation:
- Minimum 90 days, aligned with legal hold/retention policy.

### 3) Redis
- Redis contains transient/ephemeral state.
- No primary legal record should rely on Redis alone.
- Optional daily snapshot can be kept for troubleshooting, not legal recovery.

## Restore Procedures

### A) PostgreSQL Restore
1. Stop API writes (maintenance window).
2. Restore backup into target DB.

```bash
cat backups/postgres/<backup-file>.dump | \
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

3. Run migration deploy check.
4. Start API and verify readiness.

### B) Object Storage Restore
1. Ensure target bucket exists and access credentials are valid.
2. Restore mirrored files back to bucket.

```bash
docker run --rm --network host -v "$PWD/backups:/backup" minio/mc:latest \
  /bin/sh -c 'mc alias set local http://127.0.0.1:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY" && \
  mc mirror --overwrite /backup/minio/ local/"$S3_BUCKET"'
```

3. Validate random sample of documents via application download endpoint.

## Recovery Validation Drill
Frequency: monthly minimum

Drill steps:
1. Restore latest DB backup into staging.
2. Restore latest object backup into staging bucket.
3. Run smoke scenarios:
   - login
   - case retrieval
   - document listing/download
   - legal notes/audit retrieval
4. Capture drill evidence and elapsed restore time.

## Security Requirements for Backups
- Encrypt backups at rest.
- Restrict backup access to approved operations/security roles.
- Store offsite copy in separate fault domain.
- Preserve audit trail for backup/restore operations.

## Launch Preconditions
Before hospital go-live:
- Confirm automated backup schedule is active.
- Confirm restore commands are tested successfully at least once.
- Confirm retention policy owner is assigned.
- Confirm offsite backup destination is available and monitored.
