import { NextResponse } from 'next/server';
import { resetWeeklyLeaderboardPoints } from '../../../../lib/jobs/leaderboard-reset';
import { logAdminAction } from '../../../../lib/api/audit-log';

export const runtime = 'nodejs';

const isAuthorizedCron = (request) => {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return false;

  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${configuredSecret}`;
};

export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await resetWeeklyLeaderboardPoints();

    await logAdminAction({
      request,
      actor: { uid: 'system:cron', email: null },
      action: 'leaderboard.weekly.reset',
      targetType: 'users',
      targetId: null,
      metadata: { updatedUsers: result.updatedUsers },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error running weekly leaderboard reset job:', error);

    await logAdminAction({
      request,
      actor: { uid: 'system:cron', email: null },
      action: 'leaderboard.weekly.reset',
      targetType: 'users',
      targetId: null,
      status: 'failed',
      errorMessage: error?.message || 'Unknown error',
    });

    return NextResponse.json({ success: false, error: 'Failed to run job' }, { status: 500 });
  }
}
