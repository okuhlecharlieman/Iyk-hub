import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { buildFinancialSummary, queryLedger } from '../../../../lib/monetization/ledger';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:financial-ledger', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';

    if (view === 'summary') {
      const period = searchParams.get('period') || '30d';
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d': startDate.setDate(now.getDate() - 7); break;
        case '30d': startDate.setDate(now.getDate() - 30); break;
        case '90d': startDate.setDate(now.getDate() - 90); break;
        case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
        default: startDate.setDate(now.getDate() - 30);
      }

      const summary = await buildFinancialSummary(db, { startDate, endDate: now });
      return NextResponse.json({ summary, period, generatedAt: new Date().toISOString() });
    }

    if (view === 'entries') {
      const entryType = searchParams.get('entryType') || null;
      const orderType = searchParams.get('orderType') || null;
      const limitCount = Math.min(Number(searchParams.get('limit')) || 100, 500);

      const entries = await queryLedger(db, {
        entryTypes: entryType ? [entryType] : null,
        orderType,
        limitCount,
      });

      return NextResponse.json({ entries, count: entries.length });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, 'Error in financial-ledger:');
  }
}
