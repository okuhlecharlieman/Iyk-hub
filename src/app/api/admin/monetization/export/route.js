import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';

function getDateRange(period) {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
}

function formatCSVRow(data) {
  return data.map(field => {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return '"' + stringField.replace(/"/g, '""') + '"';
    }
    return stringField;
  }).join(',');
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:monetization:export', limit: 5, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const { startDate, endDate } = getDateRange(period);

    const db = admin.firestore();

    // Fetch all payment logs within date range
    const paymentLogsQuery = db.collection('paymentLogs')
      .where('processedAt', '>=', startDate)
      .where('processedAt', '<=', endDate)
      .orderBy('processedAt', 'desc');

    const [paymentLogsSnap, paymentsSnap] = await Promise.all([
      paymentLogsQuery.get(),
      db.collection('payments').get(),
    ]);

    const paymentLogs = paymentLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Create payment lookup map
    const paymentMap = {};
    payments.forEach(payment => {
      paymentMap[payment.stripePaymentIntentId] = payment;
    });

    // Generate CSV headers
    const headers = [
      'Date',
      'Order Type',
      'Order ID',
      'Amount (ZAR)',
      'Status',
      'Customer ID',
      'Payment Intent ID',
      'Failure Reason',
      'Processed At'
    ];

    // Generate CSV rows
    const rows = paymentLogs.map(log => {
      const payment = paymentMap[log.paymentIntentId];
      return [
        log.processedAt?.toDate?.()?.toISOString()?.split('T')[0] || '',
        log.orderType || '',
        log.orderId || '',
        (log.amountCents / 100).toFixed(2),
        log.status || '',
        log.customerId || '',
        log.paymentIntentId || '',
        log.failureMessage || '',
        log.processedAt?.toDate?.()?.toISOString() || '',
      ];
    });

    // Create CSV content
    const csvContent = [
      formatCSVRow(headers),
      ...rows.map(row => formatCSVRow(row))
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="monetization-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting monetization data:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}