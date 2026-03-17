import { NextResponse } from 'next/server';
import { runCreatorBoostLifecycleJob } from '../../../../lib/jobs/creator-boost-lifecycle';
import { logAdminAction } from '../../../../lib/api/audit-log';

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
    const result = await runCreatorBoostLifecycleJob();

    await logAdminAction({
      request,
      actor: { uid: 'system:cron', email: null },
      action: 'creator.boost.lifecycle.run',
      targetType: 'creatorBoostOrders',
      targetId: null,
      metadata: result,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error running creator boost lifecycle job:', error);

    await logAdminAction({
      request,
      actor: { uid: 'system:cron', email: null },
      action: 'creator.boost.lifecycle.run',
      targetType: 'creatorBoostOrders',
      targetId: null,
      status: 'failed',
      errorMessage: error?.message || 'Unknown error',
    });

    return NextResponse.json({ success: false, error: 'Failed to run creator boost lifecycle job' }, { status: 500 });
  }
}
