/**
 * Verify cron job authorization.
 * Accepts either:
 * 1. Vercel Cron built-in protection (no secret needed on Hobby plan)
 * 2. Authorization: Bearer <CRON_SECRET> header
 */
export function isAuthorizedCron(request) {
  const configuredSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow Vercel cron requests (they come from Vercel infra)
  // On Vercel Hobby plan, cron endpoints are publicly accessible, so we check for Vercel headers
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  if (!configuredSecret && isVercelCron) return true;

  if (!configuredSecret) return false;

  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${configuredSecret}`;
}
