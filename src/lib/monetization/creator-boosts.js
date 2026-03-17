export const CREATOR_BOOST_PLANS = {
  lite: {
    feeCents: 2000,
    durationHours: 24,
    visibilityMultiplier: 1.2,
    label: 'Lite Boost',
  },
  pro: {
    feeCents: 7000,
    durationHours: 72,
    visibilityMultiplier: 1.8,
    label: 'Pro Boost',
  },
  ultra: {
    feeCents: 15000,
    durationHours: 168,
    visibilityMultiplier: 2.5,
    label: 'Ultra Boost',
  },
};

export const getCreatorBoostPlan = (plan) => CREATOR_BOOST_PLANS[plan] || null;
