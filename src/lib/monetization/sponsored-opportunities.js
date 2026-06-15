/**
 * sponsored-opportunities utilities (monetization).
 */
export const SPONSORED_TIERS = {
  basic: { feeCents: 5000, label: 'Basic Sponsorship' },
  featured: { feeCents: 15000, label: 'Featured Sponsorship' },
  premium: { feeCents: 30000, label: 'Premium Sponsorship' },
};

/** Fetches/retrieves data — getSponsoredTierConfig. */
export const getSponsoredTierConfig = (tier) => SPONSORED_TIERS[tier] || null;
