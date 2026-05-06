# Data Retention Policy

_Last updated: 2026-05-06_

## User Data

| Data Category | Retention Period | Notes |
|---|---|---|
| User profile (name, email, bio) | Account lifetime + 30 days | Deleted 30 days after account deletion request |
| Authentication tokens | Session-based | Cleared on logout or token expiry |
| Uploaded media (images, videos, audio) | Account lifetime + 90 days | Firebase Storage; purged 90 days after account deletion |
| Game scores and leaderboard data | Indefinite | Anonymized after account deletion |
| Video chat room metadata | 24 hours | Auto-deleted after call ends or 24h inactivity |
| Video/audio streams | Never stored | WebRTC peer-to-peer; not recorded by the platform |

## Financial Data

| Data Category | Retention Period | Notes |
|---|---|---|
| Payment records (`payments` collection) | 7 years | Required for tax/audit compliance |
| Payment logs (`paymentLogs`) | 7 years | Stripe event processing records |
| Financial ledger entries | Indefinite (append-only) | Immutable audit trail |
| Stripe webhook logs | 2 years | For debugging and reconciliation |
| Stripe processed event IDs | 90 days | Idempotency deduplication |
| Payout records | 7 years | Financial compliance |
| Rate limit counters | 24 hours | Auto-expired |

## Admin/Audit Data

| Data Category | Retention Period | Notes |
|---|---|---|
| Admin audit logs | 3 years | Actions taken by administrators |
| Moderation queue records | 1 year | Content moderation decisions |
| Security event logs | 2 years | Login attempts, role changes |

## Data Deletion Process

1. User requests account deletion via profile settings or email to support
2. Account is soft-deleted immediately (deactivated)
3. Profile data is purged after 30 days
4. Uploaded media is purged after 90 days
5. Financial records are retained per legal requirements (7 years)
6. Anonymized analytics data is retained indefinitely

## Compliance Notes

- Financial records are retained for 7 years per South African Tax Administration Act
- Users can request a data export at any time (POPIA compliance)
- All PII is encrypted at rest via Firebase/Google Cloud default encryption
