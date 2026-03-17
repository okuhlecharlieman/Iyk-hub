# Intwana Hub Developer Guide

## 1) Architecture Overview
- **Framework**: Next.js App Router (`src/app`)
- **UI**: React + Tailwind CSS
- **Data/Auth**: Firebase (Auth + Firestore)
- **Server APIs**: Route Handlers under `src/app/api/**`
- **Background jobs**: Cron-triggered API routes (`/api/jobs/*`) configured in `vercel.json`

## 2) Local Setup
1. Install deps: `npm install`
2. Configure `.env.local` Firebase client variables (see root `README.md`).
3. (Server features) add one of:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (base64), or
   - `FIREBASE_SERVICE_ACCOUNT` (JSON string)
4. Run locally: `npm run dev`

## 3) Code Map
- `src/app/*`: pages and app layouts
- `src/app/api/*`: backend endpoints (validation, auth, moderation, monetization)
- `src/lib/firebase/*`: Firebase client/admin setup + helpers
- `src/lib/api/*`: backend utilities (rate limit, validation, cache, audit)
- `src/lib/jobs/*`: background job logic
- `src/components/*`: reusable UI components

## 4) API Design Conventions
- Validate payloads and reject extra fields using `ValidationSchema`.
- Use explicit auth checks with `AuthMiddleware` (admin where required).
- Return machine-readable error messages using standardized error types.
- Log privileged actions with `logAdminAction`, security events with `logSecurityEvent`.
- Use rate limiting on high-risk and high-volume routes with `enforceRateLimit`.
- Wrap handlers with `withErrorHandling` for consistent error responses.

### API Security Utilities (2026 Improvements)
These utilities ensure consistent security across all endpoints:
- **Error Handling**: `src/lib/api/error-handler.js` - Standardized errors, proper HTTP codes
- **Validation**: `src/lib/api/schema-validation.js` - Type-safe input validation
- **Auth Middleware**: `src/lib/api/auth-middleware.js` - Consistent auth/authz checking
- **Logging**: `src/lib/api/logging.js` - Audit trails for admin/security/data access
- **Rate Limiting**: `src/lib/api/rate-limit.js` - IP-based request throttling

Quick Reference:
```javascript
// Typical endpoint structure
export const POST = withErrorHandling(async (request) => {
  // Enforce rate limit
  const rl = enforceRateLimit(request, { keyPrefix: 'my-endpoint', limit: 100, windowMs: 60000 });
  if (rl) return rl;

  // Auth
  const user = await AuthMiddleware.authenticate(request);

  // Validate
  const body = await request.json();
  const data = mySchema.validate(body);

  // Do work with proper logging
  await logAdminAction({ request, actor: user, action: 'created', ... });

  return NextResponse.json({ success: true });
});
```

See `docs/API_IMPROVEMENTS.md` for detailed migration guide and `docs/QUICK_REFERENCE.md` for cheat sheet.

## 5) Background Jobs
- **Weekly leaderboard reset**: `/api/jobs/weekly-leaderboard-reset`
- **Creator boost lifecycle**: `/api/jobs/creator-boost-lifecycle`
- Both endpoints require `Authorization: Bearer $CRON_SECRET`.
- Both jobs are batch/pagination based to scale across larger datasets.

## 6) Build & Validation
- Syntax checks: `node --check <file>`
- Production build: `npm run build`
- Build runs merge-conflict guard: `scripts/check-merge-conflicts.mjs`

## 7) UI/UX Standards (current)
- Prefer shared component primitives (`Button`, `Modal`, cards).
- Keep contrast strong in both light/dark mode.
- Provide loading and empty states for data lists.
- Maintain keyboard support (`:focus-visible`, skip link).

## 8) Suggested Next Dev Steps
- Add integration tests for core API flows.
- Add analytics events for key funnels (signup, submissions, approvals).
- Introduce design tokens for spacing/typography consistency.
