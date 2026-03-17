export const PLACEMENT_FEE_RULES = {
  internship: { feeCents: 10000, label: 'Internship Placement Fee' },
  full_time: { feeCents: 50000, label: 'Full-time Placement Fee' },
  contract: { feeCents: 25000, label: 'Contract Placement Fee' },
};

export const getPlacementFeeRule = (placementType) => PLACEMENT_FEE_RULES[placementType] || null;
