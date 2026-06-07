/**
 * Unified order-type constants used across create-intent, webhooks,
 * reconciliation, UI, and payouts. Import from here instead of
 * defining ad-hoc maps in individual files.
 */

const ORDER_TYPES = {
  SPONSORED_CHALLENGE: 'sponsoredChallenge',
  CREATOR_BOOST: 'creatorBoost',
  INSTITUTION_PLAN: 'institutionPlan',
  SPONSORED_OPPORTUNITY: 'sponsoredOpportunity',
  PLACEMENT_FEE: 'placementFee',
};

export const ORDER_CONFIG = {
  [ORDER_TYPES.SPONSORED_CHALLENGE]: {
    collection: 'sponsoredChallengeOrders',
    statusField: 'paymentStatus',
    label: 'Sponsored Challenge',
  },
  [ORDER_TYPES.CREATOR_BOOST]: {
    collection: 'creatorBoostOrders',
    statusField: 'paymentStatus',
    label: 'Creator Boost',
  },
  [ORDER_TYPES.INSTITUTION_PLAN]: {
    collection: 'institutionAccounts',
    statusField: 'paymentStatus',
    label: 'Institution Plan',
  },
  [ORDER_TYPES.SPONSORED_OPPORTUNITY]: {
    collection: 'sponsoredOpportunityOrders',
    statusField: 'paymentStatus',
    label: 'Sponsored Opportunity',
  },
  [ORDER_TYPES.PLACEMENT_FEE]: {
    collection: 'placementReports',
    statusField: 'feeStatus',
    label: 'Placement Fee',
  },
};

export const getOrderConfig = (orderType) => ORDER_CONFIG[orderType] || null;

/**
 * Financial ledger entry types
 */
export const LEDGER_ENTRY_TYPES = {
  CHARGE_AUTHORIZED: 'charge_authorized',
  CHARGE_SUCCEEDED: 'charge_succeeded',
  CHARGE_FAILED: 'charge_failed',
  REFUND_CREATED: 'refund_created',
  DISPUTE_OPENED: 'dispute_opened',
  DISPUTE_WON: 'dispute_won',
  DISPUTE_LOST: 'dispute_lost',
  PROCESSOR_FEE: 'processor_fee_assessed',
  PLATFORM_FEE: 'platform_fee_earned',
  PAYOUT_SCHEDULED: 'payout_scheduled',
  PAYOUT_APPROVED: 'payout_approved',
  PAYOUT_PAID: 'payout_paid',
  PAYOUT_FAILED: 'payout_failed',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  TAX_COLLECTED: 'tax_collected',
  TAX_REMITTED: 'tax_remitted',
  OPERATING_SPEND: 'operating_spend_recorded',
};

/**
 * Payout statuses
 */
export const PAYOUT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  FAILED: 'failed',
  REVERSED: 'reversed',
};

/**
 * Default Stripe processor fee rate (2.9% + 30c for international)
 * Adjust per region as needed.
 */
export const DEFAULT_PROCESSOR_FEE_RATE = 0.029;
export const DEFAULT_PROCESSOR_FEE_FIXED_CENTS = 30;

/**
 * Default platform fee rate (20%)
 */
export const DEFAULT_PLATFORM_FEE_RATE = 0.20;
