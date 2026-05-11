# Intwana Hub — Incident Runbook

## Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| SEV-1 (Critical) | Platform down, payments broken | 15 min | Firebase outage, webhook failures, auth broken |
| SEV-2 (Major) | Core feature degraded | 1 hour | Games not loading, showcase broken, slow responses |
| SEV-3 (Minor) | Non-critical issue | 4 hours | UI glitch, single API slow, cosmetic bug |

## SLOs (Service Level Objectives)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.5% uptime | `GET /api/health` returns 200 |
| Payment success rate | 99% of initiated payments complete | PayStack webhook success / total initiations |
| API latency (p95) | < 2 seconds | Server-side timing |
| Error rate | < 1% of requests | 5xx responses / total requests |

## Incident Response Checklist

### 1. Detection
- Monitor `GET /api/health` endpoint for degraded status
- Check Vercel function logs for elevated error rates
- Review PayStack dashboard for failed webhooks
- Monitor Firebase console for quota alerts

### 2. Triage
1. Check `/api/health` for service status
2. Check Vercel deployment status and function logs
3. Check Firebase Console → Firestore → Usage
4. Check PayStack Dashboard → Transactions for failures

### 3. Common Incidents

#### Payment Webhook Failures
**Symptoms**: Payments processed in PayStack but not reflected in app
**Diagnosis**:
```bash
# Check paymentLogs for the reference
# Firestore Console → paymentLogs → filter by paystackReference

# Run reconciliation
curl -H "Authorization: Bearer <admin_token>" \
  https://iyk-hub.vercel.app/api/admin/payments/reconciliation
```
**Resolution**:
- Verify `PAYSTACK_SECRET_KEY` is set in Vercel env vars
- Check webhook URL is correct in PayStack dashboard
- Re-process missed webhooks via PayStack dashboard → Transactions → Retry

#### Firebase Auth Errors
**Symptoms**: Users can't log in, 401 errors
**Diagnosis**:
- Check Firebase Console → Authentication → Users
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` env var is set
**Resolution**:
- Regenerate service account key if expired
- Check Firebase project billing status

#### High Firestore Usage / Quota
**Symptoms**: Slow queries, 503 errors, rate limit docs accumulating
**Diagnosis**:
- Firebase Console → Firestore → Usage tab
- Check `rateLimits` collection size
**Resolution**:
- Run TTL cleanup: `POST /api/jobs/ttl-cleanup` with CRON_SECRET
- Review and add composite indexes for slow queries
- Enable Firestore budget alerts

#### Deployment Failures
**Symptoms**: New deployments fail or break the app
**Diagnosis**:
- Vercel Dashboard → Deployments → Build logs
**Resolution**:
- Roll back to previous deployment in Vercel
- Fix build errors and redeploy

### 4. Escalation
- **Platform issues**: Check [Vercel Status](https://www.vercel-status.com/) and [Firebase Status](https://status.firebase.google.com/)
- **Payment issues**: Contact PayStack support via dashboard
- **Critical bugs**: Create GitHub issue with `severity:critical` label

### 5. Post-Incident
1. Write incident summary (what happened, impact, timeline)
2. Identify root cause
3. Create follow-up issues for prevention
4. Update this runbook with new learnings

## Monitoring Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /api/health` | System health check | `{ status: "ok" }` |
| `GET /api/admin/payments/reconciliation` | Payment consistency | `{ inconsistentCount: 0 }` |
| `POST /api/jobs/ttl-cleanup` | Cleanup stale data | `{ success: true }` |

## Environment Variables Checklist

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Firebase Admin SDK |
| `PAYSTACK_SECRET_KEY` | Yes | PayStack webhook verification & API |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | PayStack client-side checkout |
| `CRON_SECRET` | Yes | Secure cron job endpoints |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical site URL |

## Cron Jobs

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| Weekly leaderboard reset | Weekly (Mon 00:00) | `POST /api/jobs/weekly-leaderboard-reset` | Reset weekly points |
| Creator boost lifecycle | Daily | `POST /api/jobs/creator-boost-lifecycle` | Expire/activate boosts |
| TTL cleanup | Daily | `POST /api/jobs/ttl-cleanup` | Clean expired rate limits and stale data |
