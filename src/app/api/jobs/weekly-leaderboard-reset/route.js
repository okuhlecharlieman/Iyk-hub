import { NextResponse } from 'next/server';
import { resetWeeklyLeaderboardPoints } from '../../../../lib/jobs/leaderboard-reset';
import { logAdminAction } from '../../../../lib/api/audit-log';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';

export const runtime = 'nodejs';

export async function GET(request) {
  console.log('[Cron: Leaderboard] Job triggered at:', new Date().toISOString());
  
  // 1. Verify Authorization with strict logging
  const isAuth = isAuthorizedCron(request);
  console.log('[Cron: Leaderboard] Authorization status:', isAuth);
  
  if (!isAuth) {
    const hasAuthHeader = !!request.headers.get('authorization');
    console.warn(`[Cron: Leaderboard] Unauthorized access blocked. Auth header present: ${hasAuthHeader}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron: Leaderboard] Executing resetWeeklyLeaderboardPoints...');
    const result = await resetWeeklyLeaderboardPoints();
    console.log('[Cron: Leaderboard] Reset execution successful. Result metadata:', JSON.stringify(result));

    console.log('[Cron: Leaderboard] Writing to system audit log...');
    await logAdminAction({
      request,
      actor: { uid: 'system:cron', email: null },
      action: 'leaderboard.weekly.reset',
      targetType: 'users',
      targetId: null,
      metadata: { updatedUsers: result.updatedUsers },
    });
    console.log('[Cron: Leaderboard] Audit log entry completed successfully.');

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Cron: Leaderboard] CRITICAL ERROR during execution:', error);

    try {
      // Attempt to log the failure to your DB audit log
      await logAdminAction({
        request,
        actor: { uid: 'system:cron', email: null },
        action: 'leaderboard.weekly.reset',
        targetType: 'users',
        targetId: null,
        status: 'failed',
        errorMessage: error?.message || 'Unknown error',
      });
    } catch (logError) {
      console.error('[Cron: Leaderboard] Failed to write failure state to audit log:', logError);
    }

    return NextResponse.json(
      { success: false, error: 'Failed to run job', details: error?.message }, 
      { status: 500 }
    );
  }
}
