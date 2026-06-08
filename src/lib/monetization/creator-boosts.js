const CREATOR_BOOST_PLANS = {
  lite: {
    feeCents: 2000,
    pointsCost: 500,
    durationHours: 24,
    visibilityMultiplier: 1.2,
    label: 'Lite Boost',
    videoChatSeconds: 60,
    badge: 'boosted',
    badgeColor: 'blue',
    badgeLabel: 'Boosted',
  },
  pro: {
    feeCents: 7000,
    pointsCost: 2000,
    durationHours: 72,
    visibilityMultiplier: 1.8,
    label: 'Pro Boost',
    videoChatSeconds: 180,
    badge: 'pro',
    badgeColor: 'purple',
    badgeLabel: 'Pro Creator',
  },
  ultra: {
    feeCents: 15000,
    pointsCost: 5000,
    durationHours: 168,
    visibilityMultiplier: 2.5,
    label: 'Ultra Boost',
    videoChatSeconds: 300,
    badge: 'verified',
    badgeColor: 'amber',
    badgeLabel: 'Verified Creator',
  },
};

export const getCreatorBoostPlan = (plan) => CREATOR_BOOST_PLANS[plan] || null;
