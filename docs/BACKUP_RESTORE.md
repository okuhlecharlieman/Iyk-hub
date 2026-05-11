# Intwana Hub — Backup & Restore Guide

## Data Architecture

All application data lives in **Firebase Firestore**. Firebase provides built-in backup capabilities via scheduled exports.

## Backup Strategy

### Automatic Exports (Recommended)

Set up scheduled Firestore exports to a Cloud Storage bucket:

1. **Create a Cloud Storage bucket**:
   ```bash
   gsutil mb -l africa-south1 gs://iyk-hub-backups
   ```

2. **Grant Firestore export permissions**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
     --role="roles/datastore.importExportAdmin"
   
   gsutil iam ch serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com:admin \
     gs://iyk-hub-backups
   ```

3. **Schedule daily exports** via Cloud Scheduler:
   ```bash
   gcloud scheduler jobs create http firestore-daily-backup \
     --schedule="0 2 * * *" \
     --uri="https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/exportDocuments" \
     --http-method=POST \
     --oauth-service-account-email="YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
     --message-body='{"outputUriPrefix":"gs://iyk-hub-backups/daily"}' \
     --time-zone="Africa/Johannesburg"
   ```

### Manual Export

Run on-demand from the Firebase Console or CLI:

```bash
gcloud firestore export gs://iyk-hub-backups/manual/$(date +%Y%m%d_%H%M%S)
```

### Critical Collections

These collections contain business-critical data and must be backed up:

| Collection | Priority | Description |
|-----------|----------|-------------|
| `users` | Critical | User profiles and roles |
| `payments` | Critical | Payment records |
| `paymentLogs` | Critical | PayStack webhook logs |
| `financialLedger` | Critical | Immutable financial ledger |
| `refunds` | Critical | Refund records |
| `creatorBoostOrders` | High | Boost payment orders |
| `sponsoredChallengeOrders` | High | Challenge sponsorship orders |
| `opportunities` | High | Job/opportunity listings |
| `wallPosts` | Medium | Showcase posts |
| `operatingSpend` | High | Operating cost records |

### Non-Critical Collections (can be regenerated)

| Collection | Notes |
|-----------|-------|
| `rateLimits` | Auto-cleaned by TTL cron |
| `moderationQueue` | Resolved items auto-cleaned |
| `_healthcheck` | Ephemeral, auto-cleaned |

## Restore Procedure

### Full Restore

```bash
gcloud firestore import gs://iyk-hub-backups/daily/LATEST_BACKUP_FOLDER
```

### Partial Collection Restore

To restore specific collections only:

```bash
gcloud firestore import gs://iyk-hub-backups/daily/LATEST_BACKUP_FOLDER \
  --collection-ids=users,payments,paymentLogs,financialLedger
```

### Restore Verification Checklist

After any restore operation:

1. [ ] Hit `GET /api/health` — should return `{ status: "ok" }`
2. [ ] Login with admin account — verify auth works
3. [ ] Check `/admin` dashboard — verify user count is correct
4. [ ] Check Monetization Dashboard — verify payment totals
5. [ ] Run reconciliation `GET /api/admin/payments/reconciliation` — check for inconsistencies
6. [ ] Test a page load (showcase, leaderboard) — verify data renders

## Retention Policy

| Data Type | Retention | Notes |
|-----------|----------|-------|
| Payment/financial records | 7 years | Legal/tax requirement |
| User data | Until account deletion | POPIA compliance |
| Backups | 30 days rolling | Cloud Storage lifecycle |
| Audit logs | 1 year | Compliance |
| Rate limit entries | 24 hours | Auto-cleaned |

## Disaster Recovery

| Scenario | RTO | RPO | Action |
|----------|-----|-----|--------|
| Accidental deletion | 1 hour | Last backup | Restore from daily export |
| Firebase outage | N/A | N/A | Wait for Firebase recovery |
| Corrupted data | 2 hours | Last clean backup | Restore specific collections |
| Full project loss | 4 hours | Last backup | Restore to new Firebase project |

- **RTO** = Recovery Time Objective (how fast we recover)
- **RPO** = Recovery Point Objective (max data loss acceptable)
