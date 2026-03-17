import admin from 'firebase-admin';

const toNumber = (value, fallback = 0) => (typeof value === 'number' ? value : fallback);

const sumBy = (items, predicate, valueGetter) =>
  items.reduce((acc, item) => (predicate(item) ? acc + toNumber(valueGetter(item), 0) : acc), 0);

export async function buildMonetizationSummary(db = admin.firestore()) {
  const [
    sponsoredSnap,
    institutionsSnap,
    boostsSnap,
    placementsSnap,
  ] = await Promise.all([
    db.collection('sponsoredOpportunityOrders').limit(500).get(),
    db.collection('institutionAccounts').limit(500).get(),
    db.collection('creatorBoostOrders').limit(500).get(),
    db.collection('placementReports').limit(500).get(),
  ]);

  const sponsored = sponsoredSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const institutions = institutionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const boosts = boostsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const placements = placementsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const totalPaidRevenueCents =
    sumBy(sponsored, (o) => o.paymentStatus === 'paid', (o) => o.feeCents) +
    sumBy(institutions, (a) => a.paymentStatus === 'paid', (a) => a.feeCentsMonthly) +
    sumBy(boosts, (o) => o.paymentStatus === 'paid', (o) => o.feeCents) +
    sumBy(placements, (r) => r.feeStatus === 'paid', (r) => r.feeCents);

  const totalInvoicedRevenueCents =
    sumBy(sponsored, (o) => ['paid', 'invoiced'].includes(o.paymentStatus), (o) => o.feeCents) +
    sumBy(placements, (r) => ['paid', 'invoiced'].includes(r.feeStatus), (r) => r.feeCents);

  return {
    totals: {
      totalPaidRevenueCents,
      totalInvoicedRevenueCents,
      sponsoredOrders: sponsored.length,
      institutionAccounts: institutions.length,
      creatorBoostOrders: boosts.length,
      placementReports: placements.length,
    },
    statusBreakdown: {
      sponsoredByPaymentStatus: groupByStatus(sponsored, 'paymentStatus'),
      institutionsByAccountStatus: groupByStatus(institutions, 'accountStatus'),
      boostsByActivationStatus: groupByStatus(boosts, 'activationStatus'),
      placementsByFeeStatus: groupByStatus(placements, 'feeStatus'),
    },
    generatedAt: new Date().toISOString(),
  };
}

function groupByStatus(items, key) {
  return items.reduce((acc, item) => {
    const status = item?.[key] || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}
