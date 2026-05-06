import admin from 'firebase-admin';

const ALERTS_COLLECTION = 'systemAlerts';

/**
 * Alert severity levels
 */
export const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Alert categories
 */
export const AlertCategory = {
  WEBHOOK_FAILURE: 'webhook_failure',
  RECONCILIATION_MISMATCH: 'reconciliation_mismatch',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  PAYMENT_ERROR: 'payment_error',
  DISPUTE_OPENED: 'dispute_opened',
  PAYOUT_FAILED: 'payout_failed',
  HIGH_ERROR_RATE: 'high_error_rate',
  FIRESTORE_COST_SPIKE: 'firestore_cost_spike',
};

/**
 * Create a system alert in Firestore.
 * Alerts are stored for admin visibility and can trigger
 * external notifications via Cloud Functions or webhooks.
 */
export async function createAlert({
  category,
  severity = AlertSeverity.WARNING,
  title,
  description,
  metadata = {},
}) {
  try {
    if (!admin.apps.length) return null;

    const db = admin.firestore();

    const alert = {
      category,
      severity,
      title,
      description,
      metadata,
      acknowledged: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(ALERTS_COLLECTION).add(alert);

    // Log critical alerts to console for Vercel/Cloud log aggregation
    if (severity === AlertSeverity.CRITICAL) {
      console.error(`[ALERT:${category}] ${title}: ${description}`, JSON.stringify(metadata));
    } else if (severity === AlertSeverity.WARNING) {
      console.warn(`[ALERT:${category}] ${title}: ${description}`);
    }

    return { id: ref.id, ...alert };
  } catch (error) {
    console.error('Failed to create alert:', error?.message);
    return null;
  }
}

/**
 * Alert on webhook processing failure.
 */
export async function alertWebhookFailure({ eventType, eventId, error }) {
  return createAlert({
    category: AlertCategory.WEBHOOK_FAILURE,
    severity: AlertSeverity.CRITICAL,
    title: `Webhook processing failed: ${eventType}`,
    description: `Stripe event ${eventId} (${eventType}) failed to process: ${error?.message || error}`,
    metadata: { eventType, eventId, error: error?.message },
  });
}

/**
 * Alert on reconciliation mismatch.
 */
export async function alertReconciliationMismatch({ totalChecked, inconsistentCount, inconsistentSample }) {
  const severity = inconsistentCount > 10 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;

  return createAlert({
    category: AlertCategory.RECONCILIATION_MISMATCH,
    severity,
    title: `Reconciliation mismatch: ${inconsistentCount}/${totalChecked} payments inconsistent`,
    description: `Found ${inconsistentCount} inconsistent payment records out of ${totalChecked} checked.`,
    metadata: { totalChecked, inconsistentCount, sample: inconsistentSample?.slice(0, 5) },
  });
}

/**
 * Alert on dispute opened.
 */
export async function alertDisputeOpened({ disputeId, paymentIntentId, amountCents, reason }) {
  return createAlert({
    category: AlertCategory.DISPUTE_OPENED,
    severity: AlertSeverity.CRITICAL,
    title: `Dispute opened: ${reason}`,
    description: `Dispute ${disputeId} opened for payment ${paymentIntentId}, amount: ${amountCents} cents.`,
    metadata: { disputeId, paymentIntentId, amountCents, reason },
  });
}

/**
 * Alert on elevated error rates.
 */
export async function alertHighErrorRate({ endpoint, errorCount, windowMinutes }) {
  return createAlert({
    category: AlertCategory.HIGH_ERROR_RATE,
    severity: errorCount > 50 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
    title: `High error rate on ${endpoint}`,
    description: `${errorCount} errors in the last ${windowMinutes} minutes on ${endpoint}.`,
    metadata: { endpoint, errorCount, windowMinutes },
  });
}
