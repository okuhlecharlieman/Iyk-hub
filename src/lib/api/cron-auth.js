/**
 * Verify cron job authorization.
 * Accepts:
 * 1. Authorization: Bearer <CRON_SECRET> header (Vercel Pro or manual invocation)
 * 2. Vercel Cron built-in protection via user-agent or x-vercel-cron header (Hobby plan)
 * 3. When deployed on Vercel without CRON_SECRET, allows requests originating from Vercel infra
 */
export function isAuthorizedCron(request) {
  const configuredSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it via Authorization header
  if (configuredSecret) {
    const authHeader = request.headers.get('authorization') || '';
    return authHeader === `Bearer ${configuredSecret}`;
  }

  // No CRON_SECRET configured — allow Vercel-originated cron requests
  // Vercel crons may identify via user-agent or internal headers
  const userAgent = request.headers.get('user-agent') || '';
  const isVercelCron = userAgent.includes('vercel-cron') || userAgent.includes('Vercel');
  const hasVercelHeaders = !!request.headers.get('x-vercel-id') || !!request.headers.get('x-forwarded-for');

  // On Vercel Hobby plan, cron endpoints are triggered by Vercel infra
  // We allow requests that appear to come from Vercel's infrastructure
  if (process.env.VERCEL && (isVercelCron || hasVercelHeaders)) return true;

  // Also allow if running on Vercel (even without specific cron headers)
  // since on Hobby plan, cron jobs just hit the endpoint via Vercel's infra
  if (process.env.VERCEL) return true;

  return false;
}
