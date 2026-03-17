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
- Validate payloads and reject extra fields.
- Use explicit auth checks and role checks (`admin` where required).
- Return machine-readable error messages consistently.
- Log privileged actions with `logAdminAction`.
- Use rate limiting on high-risk and high-volume routes.

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
