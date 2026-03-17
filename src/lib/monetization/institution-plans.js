export const INSTITUTION_PLANS = {
  starter: {
    feeCentsMonthly: 19900,
    label: 'Starter',
    features: ['institutionProfile', 'prioritySupport'],
  },
  growth: {
    feeCentsMonthly: 49900,
    label: 'Growth',
    features: ['institutionProfile', 'prioritySupport', 'analyticsDashboard', 'bulkOpportunityPublishing'],
  },
  impact: {
    feeCentsMonthly: 99900,
    label: 'Impact',
    features: ['institutionProfile', 'prioritySupport', 'analyticsDashboard', 'bulkOpportunityPublishing', 'dedicatedManager'],
  },
};

export const getInstitutionPlanConfig = (plan) => INSTITUTION_PLANS[plan] || null;
