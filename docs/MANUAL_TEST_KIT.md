# Intwana Hub — Full App Manual Test Kit

For testers. Work through each section in order. Fill in the **Actual Result** and **P/F** columns as you go. If a test fails, capture a screenshot, copy the visible error message, and record the browser, viewport, account, and page URL in **Notes**. Leave nothing blank — if a step cannot be run, write **BLOCKED** and explain why.

## Test environment

### App URLs

| Environment | URL | Notes |
|---|---|---|
| Production / hosted QA | `https://iyk-hub.vercel.app/` | Use this for release acceptance unless a QA build URL is supplied. |
| Local development | `http://localhost:3000` | Run `npm install`, create `.env.local`, then run `npm run dev`. |

### External services and seeded data

| Area | Requirement |
|---|---|
| Firebase Auth | Test accounts must exist before authentication, role, admin, and profile tests. |
| Firestore | Seed enough users, showcase posts, opportunities, sponsored challenges, game content, survey responses, audit logs, and payment / boost records to test populated states. |
| Firebase Storage / Google Cloud Storage | Required for profile image and showcase image upload tests. |
| PayStack / Stripe | Use test-mode keys and test cards only. Do not use real card details in QA. |
| PWA install | Test in a browser that supports install prompts, such as Chrome / Edge. |

### User types to cover

Use real QA accounts for each row. If a role account does not exist, create one or ask an administrator to update the `users/{uid}.role` field before testing.

| User type | Example role key | Main access to verify |
|---|---|---|
| Anonymous visitor | none | Public marketing pages, public listings, login / signup prompts, protected-route redirects. |
| Standard community user | `user` | Dashboard, games, showcase creation, opportunities, leaderboard, profile, video, survey, donations, boosts. |
| Boosted creator | `user` with active boost | Boost badge, featured placement, boost order status, extended video-chat allowance where applicable. |
| Client / sponsor | `client` | Client-facing sponsored opportunity / challenge workflows and public app access. |
| Customer support | `customer_support` | Admin workspace access without team-management links. |
| Developer support | `developer_support` | Admin workspace access for technical support without team-management links. |
| Operations | `operations` | Admin workspace, content queues, users / roles if team-management permissions are enabled. |
| Admin | `admin` | Full admin dashboard, content, revenue, reports, moderation. |
| Business owner | `business_owner` | Highest access including team, money, operations, and system reports. |

### How to use this document

Each test case has:

- A **Pre-condition** describing what must be true before you start.
- A table of numbered steps with **Action** and **Expected Result**.
- Blank **Actual Result**, **P/F**, and **Notes** columns for tester completion.

When you see `[App]`, open the target environment URL in a browser tab. Use private / incognito windows for different accounts to avoid session conflicts. Recommended browsers: Chrome, Edge, Firefox, and Safari where available. Recommended viewports: desktop `1440x900`, tablet `768x1024`, and mobile `390x844`.

---

## Section 1 — Authentication and account access

### TC-001: Anonymous visitor can reach public home page

Pre-condition: Open `[App]` in a private/incognito window. No active session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/`. | Home page loads with Intwana Hub branding and primary calls to action. |  |  |  |
| 2 | Check the top navigation. | Public links are visible: Games, Showcase, Opportunities, Challenges, Leaderboard, Boosts, Donate, Login, and Sign up. Dashboard, Random Chat, Profile, and Admin are not shown. |  |  |  |
| 3 | Scroll to the bottom. | Footer and legal / social links are visible. No stuck loader or uncaught error is shown. |  |  |  |

### TC-002: Email/password login succeeds for a standard user

Pre-condition: Standard community user account exists and email is verified if verification is enforced.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Navigate to `/login`. | Login page displays email and password fields, Login button, Google sign-in option, and forgot-password control. |  |  |  |
| 2 | Enter the standard user email and password. | Fields accept input and password is masked by default. |  |  |  |
| 3 | Click Login. | User is authenticated and redirected to `/dashboard`. |  |  |  |
| 4 | Check the navbar avatar menu. | Avatar menu opens and shows Profile and Logout. Admin link is not visible for a standard user. |  |  |  |

### TC-003: Wrong password is rejected

Pre-condition: Open `/login` while logged out.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Enter a valid email with an incorrect password. | Login form remains on screen. |  |  |  |
| 2 | Click Login. | Friendly invalid-credentials message is shown. Raw Firebase error codes are not exposed. |  |  |  |
| 3 | Check URL and navbar. | User is not redirected to dashboard and remains logged out. |  |  |  |

### TC-004: Login field validation

Pre-condition: Open `/login` while logged out.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Submit with an invalid email such as `notanemail`. | Validation error asks for a valid email address. |  |  |  |
| 2 | Submit with a short password. | Validation error explains minimum password requirements. |  |  |  |
| 3 | Toggle password visibility twice. | Password changes from masked to visible, then masked again. |  |  |  |

### TC-005: Forgot-password flow

Pre-condition: Open `/login` while logged out. Use a real QA mailbox if possible.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Leave email blank and click forgot password. | Error asks tester to enter a valid email first. |  |  |  |
| 2 | Enter a valid QA email and click forgot password. | Success message says a reset email was sent. |  |  |  |
| 3 | Check mailbox if available. | Password reset email arrives from the configured auth provider. |  |  |  |

### TC-006: Google sign-in succeeds

Pre-condition: Google OAuth provider is enabled for the QA environment.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/login` and click Google sign-in. | Google OAuth popup opens. |  |  |  |
| 2 | Complete OAuth using a QA Google account. | Popup closes and user is redirected to `/dashboard`. |  |  |  |
| 3 | Check profile menu and Firestore user document if accessible. | Display name and photo are available; user document exists with default role or expected role. |  |  |  |

### TC-007: Signup happy path

Pre-condition: Open `/signup` while logged out. Use a unique email address.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/signup`. | Signup page loads with display name, email, password, confirm-password fields, and Google sign-in. |  |  |  |
| 2 | Enter a unique email, display name, and valid password. | Password hints disappear once all rules are met. |  |  |  |
| 3 | Submit the form. | Account is created or verification email is sent, with a clear success message. |  |  |  |
| 4 | Log in with the new account if verification allows. | User reaches dashboard and has standard user access. |  |  |  |

### TC-008: Signup validation and duplicate email

Pre-condition: Open `/signup` while logged out.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Submit with empty display name. | Display-name validation error appears. |  |  |  |
| 2 | Submit with mismatched password and confirm password. | Password-mismatch error appears. |  |  |  |
| 3 | Type weak passwords and observe hints. | Hints explain missing length, number, or symbol. |  |  |  |
| 4 | Try to sign up with an existing account email. | Duplicate-email error tells tester to log in instead. |  |  |  |

### TC-009: Logout prevents back-button access

Pre-condition: Logged in as a standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open avatar menu and click Logout. | User is signed out and navbar shows Login / Sign up. |  |  |  |
| 2 | Press browser Back to return to a protected page. | Protected page redirects to `/login` or blocks private content. |  |  |  |
| 3 | Navigate directly to `/dashboard`. | User is redirected to login. |  |  |  |

### TC-010: Protected-route access matrix

Pre-condition: Open each URL in a logged-out private window, then repeat while logged in as a standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Logged out: open `/dashboard`. | Redirects to login or shows protected-route access prompt. |  |  |  |
| 2 | Logged out: open `/profile`. | Redirects to login or shows protected-route access prompt. |  |  |  |
| 3 | Logged out: open `/video`. | Redirects to login or shows protected-route access prompt. |  |  |  |
| 4 | Logged out: open `/games/rps-test-room`. | Redirects to login or shows protected-route access prompt. |  |  |  |
| 5 | Logged in as standard user: open each URL again. | Each page loads and private content belongs to the signed-in user. |  |  |  |

---

## Section 2 — Global navigation, layout, theme, and installability

### TC-020: Desktop navigation links route correctly

Pre-condition: Open `[App]` on desktop width. Repeat once logged out and once logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Click each visible navbar link. | Link opens its target page without a 404. Active nav styling updates. |  |  |  |
| 2 | Click the Intwana Hub logo. | Logged-out users go to `/`; logged-in users go to `/dashboard`. |  |  |  |
| 3 | Open avatar menu as a logged-in user. | Profile link opens the current user's public profile route. Logout works. |  |  |  |

### TC-021: Mobile navigation drawer works

Pre-condition: Set viewport to mobile width, such as `390x844`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Tap hamburger menu. | Mobile menu slides open with all appropriate links for the session state. |  |  |  |
| 2 | Tap a link. | Page opens and menu closes. |  |  |  |
| 3 | Log in and repeat. | Dashboard, Random Chat, profile actions, and Admin link only appear when allowed. |  |  |  |

### TC-022: Theme switcher persists mode

Pre-condition: Browser storage is enabled.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Toggle from light to dark mode. | UI changes theme without layout shift or unreadable text. |  |  |  |
| 2 | Refresh the page. | Selected theme persists. |  |  |  |
| 3 | Navigate to admin, games, showcase, and profile pages. | Theme remains consistent across pages. |  |  |  |

### TC-023: PWA install button and offline basics

Pre-condition: Use Chrome or Edge over HTTPS. Clear any existing install state if needed.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Look for the Install button in navbar / hero areas. | Install button appears where supported, or remains hidden where browser does not support install. |  |  |  |
| 2 | Trigger install prompt. | Browser install prompt appears and can be accepted or dismissed. |  |  |  |
| 3 | In DevTools Application tab, check service worker / manifest. | Manifest and service worker load without console errors. |  |  |  |

### TC-024: Legal and static pages load

Pre-condition: Logged out or logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/about`. | About page loads with clear platform explanation and calls to action. |  |  |  |
| 2 | Open `/privacy`. | Privacy Policy page displays section headings and contact details. |  |  |  |
| 3 | Open `/terms`. | Terms of Service page displays section headings and payment / moderation terms. |  |  |  |
| 4 | Click legal links from footer. | Links open the correct static pages and do not 404. |  |  |  |

---

## Section 3 — Home page and dashboard

### TC-030: Home page marketing content and public data

Pre-condition: Open `/` while logged out. Seed featured users, opportunities, and showcase posts if populated-state testing is required.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Verify hero section. | Badge, headline, supporting text, Start Your Journey button, View Challenges button, and stats are visible. |  |  |  |
| 2 | Scroll through feature sections. | Games, opportunities, showcase, community, and CTA sections render with no broken images. |  |  |  |
| 3 | If featured creators exist, inspect carousel. | Featured creator cards display image, display name, bio, and boost badge where applicable. |  |  |  |
| 4 | Simulate a slow connection and reload. | Loading states appear and resolve; API failure shows a friendly error message. |  |  |  |

### TC-031: Dashboard loads personalized panels

Pre-condition: Logged in as a standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/dashboard`. | Welcome heading shows the user's name and current date. |  |  |  |
| 2 | Review quick action cards. | Links to Games, Showcase, Opportunities, Leaderboard, Profile, and other primary areas appear. |  |  |  |
| 3 | Review Games preview. | Game shortcuts launch the selected game route. |  |  |  |
| 4 | Review Opportunities and Showcase previews. | Recent items show meaningful titles or an empty-state message. |  |  |  |
| 5 | Confirm standard user access. | Admin panel card is not shown for a standard user. |  |  |  |

### TC-032: Dashboard for admin-capable roles

Pre-condition: Logged in as customer support, developer support, operations, admin, or business owner.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/dashboard`. | Dashboard loads without role errors. |  |  |  |
| 2 | Check for Admin workspace entry points. | Admin link/card is visible for admin-dashboard roles. |  |  |  |
| 3 | Click Admin entry point. | User reaches `/admin` and sidebar reflects their role permissions. |  |  |  |

---

## Section 4 — Games and points

### TC-040: Games catalog page

Pre-condition: Open `/games` while logged out, then repeat while logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/games`. | Games page loads with page title and game cards. |  |  |  |
| 2 | Use the search input. | Matching games remain; non-matching search shows an empty or no-results state without error. |  |  |  |
| 3 | Click a game card while logged out. | Protected game route redirects to login. |  |  |  |
| 4 | Click a game card while logged in. | New game room opens and displays Room ID. |  |  |  |

### TC-041: Rock Paper Scissors game

Pre-condition: Logged in; open an RPS game room from `/games`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Select Single-player mode. | RPS controls are usable in single-player mode. |  |  |  |
| 2 | Play one round. | Result message is shown and score / points event is recorded if points are awarded. |  |  |  |
| 3 | Switch to Multiplayer mode. | Room ID remains visible and can be copied. |  |  |  |

### TC-042: Tic-Tac-Toe game

Pre-condition: Logged in; open Tic-Tac-Toe from `/games`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Select Single-player mode. | Board displays and allows moves. |  |  |  |
| 2 | Play until win, loss, or draw. | Game displays final outcome and prevents invalid duplicate moves. |  |  |  |
| 3 | Start or open a new room. | New room does not inherit the previous board state. |  |  |  |

### TC-043: Memory Match game

Pre-condition: Logged in; open Memory Match from `/games`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Start in Single-player mode. | Cards render face down and are clickable. |  |  |  |
| 2 | Flip two cards. | Cards reveal temporarily; matched cards stay revealed. |  |  |  |
| 3 | Complete the board if practical. | Completion message and score are shown. |  |  |  |

### TC-044: Hangman game

Pre-condition: Logged in; seeded hangman content exists or fallback content is available.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open Hangman in Single-player mode. | Word blanks, category / hint if available, and keyboard controls appear. |  |  |  |
| 2 | Select a correct and incorrect letter. | Correct letters fill blanks; incorrect guesses update remaining attempts / hangman state. |  |  |  |
| 3 | Finish the game. | Win or loss state is clear and score behavior is correct. |  |  |  |

### TC-045: Quiz game

Pre-condition: Logged in; seeded quiz questions exist or fallback content is available.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open Quiz in Single-player mode. | Question and answer choices display. |  |  |  |
| 2 | Select an answer. | Feedback appears or next question loads; scoring is understandable. |  |  |  |
| 3 | Complete the quiz. | Final score displays and points/session record is created if expected. |  |  |  |

### TC-046: Multiplayer room sharing

Pre-condition: Two logged-in standard users or two private windows with separate accounts.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Player A opens a multiplayer game room and copies Room ID. | Room ID copies and confirmation appears. |  |  |  |
| 2 | Player B opens `/games/{room-id}`. | Player B joins the same room and sees the same game state. |  |  |  |
| 3 | Player A and Player B make moves. | Game state updates in near real time for both users. |  |  |  |
| 4 | Try joining with Player C if the game has a two-player cap. | Clear room-full or unsupported message is shown. |  |  |  |

---

## Section 5 — Showcase / community wall

### TC-050: Showcase page loads public posts

Pre-condition: Open `/showcase`. Seed posts for populated-state testing.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/showcase`. | Community Showcase page loads with post grid or a no-posts empty state. |  |  |  |
| 2 | Inspect post cards. | Cards show title, creator, content type, description/media, and reaction controls where applicable. |  |  |  |
| 3 | If boosted posts exist, inspect badges. | Boosted creators show tier-specific badges and may appear in featured sections. |  |  |  |

### TC-051: Create showcase post as standard user

Pre-condition: Logged in as a standard user on `/showcase`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Click add / create post button. | New post modal or editor opens. |  |  |  |
| 2 | Submit with required fields empty. | Field validation prevents submission and identifies missing fields. |  |  |  |
| 3 | Fill title, description, content type, and valid content or upload. | Inputs accept data; preview appears if supported. |  |  |  |
| 4 | Submit. | Success toast appears and new post is visible in the grid. |  |  |  |

### TC-052: Edit and delete own showcase post

Pre-condition: Logged in as the owner of at least one showcase post.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Find your own post. | Edit / delete controls are visible only on your own post unless you are an admin. |  |  |  |
| 2 | Click Edit and change title or description. | Editor opens pre-filled and save updates the card. |  |  |  |
| 3 | Click Delete. | Confirmation is shown; after confirming, post disappears. |  |  |  |

### TC-053: Showcase reactions and logged-out restrictions

Pre-condition: Use one logged-in window and one logged-out private window.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Logged in: react to a post. | Reaction count updates and selected state is visible. |  |  |  |
| 2 | Click the same reaction again. | Reaction toggles off or updates according to product rules without duplicate counting. |  |  |  |
| 3 | Logged out: attempt to react. | User is prompted to log in; no anonymous reaction is saved. |  |  |  |

---

## Section 6 — Opportunities

### TC-060: Opportunities page access and browsing

Pre-condition: Repeat while logged out and logged in as a standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Logged out: open `/opportunities`. | If protected, user is redirected to login; if public browsing is allowed, listings are read-only. |  |  |  |
| 2 | Logged in: open `/opportunities`. | Opportunities list loads with title, organization, description, tags, and status / dates. |  |  |  |
| 3 | Check empty / error behavior. | Empty state or friendly error appears; no raw stack trace is visible. |  |  |  |

### TC-061: Search and filter opportunities

Pre-condition: Logged in and at least three opportunities with different tags/statuses exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Type part of an opportunity title or organization in search. | List filters to matching results. |  |  |  |
| 2 | Search by a tag. | Tagged opportunities remain visible. |  |  |  |
| 3 | Use status or category filter buttons. | Results update and active filter styling changes. |  |  |  |
| 4 | Clear search and filters. | Full list is restored. |  |  |  |

### TC-062: Submit a standard opportunity

Pre-condition: Logged in as a standard user or operations/admin account with permission to post.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Click Post Opportunity / add button. | Opportunity form modal opens. |  |  |  |
| 2 | Submit with required fields empty. | Validation errors show and no record is created. |  |  |  |
| 3 | Fill title, organization, description, tags, type, link, and expiry date. | Form accepts valid data and date format. |  |  |  |
| 4 | Submit. | Success toast says opportunity was submitted for review; item status is pending if moderation applies. |  |  |  |

### TC-063: Edit and delete own opportunity

Pre-condition: Logged in as the creator of a pending or approved opportunity.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Find your opportunity. | Owner controls are visible. |  |  |  |
| 2 | Edit title, tags, or expiry date and save. | Changes persist after refresh. |  |  |  |
| 3 | Delete the opportunity. | Confirmation appears; record is removed or marked deleted per product behavior. |  |  |  |

---

## Section 7 — Sponsored challenges and sponsor/client flows

### TC-070: Sponsored challenges list

Pre-condition: Open `/sponsored-challenges` with seeded active, expired, and pending challenges if possible.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/sponsored-challenges`. | Challenge landing page loads with hero, create/manage links, filters or challenge cards. |  |  |  |
| 2 | Inspect challenge cards. | Each card shows title, sponsor, reward/summary, status, and View Details link. |  |  |  |
| 3 | Use visible filter / load-more controls. | Results update without duplicates or broken layout. |  |  |  |

### TC-071: Challenge detail and submission

Pre-condition: Logged in as a standard user; at least one active challenge exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/sponsored-challenges/{id}` from a card. | Detail page loads with challenge requirements, sponsor details, deadline, reward, and submission section. |  |  |  |
| 2 | Submit with missing required fields. | Validation identifies missing fields. |  |  |  |
| 3 | Submit a valid entry. | Success message appears and submission is listed or acknowledged. |  |  |  |
| 4 | Attempt duplicate submission if not allowed. | App blocks duplicate or clearly explains allowed resubmission behavior. |  |  |  |

### TC-072: Sponsor/client creates a challenge

Pre-condition: Logged in as client/sponsor, operations, admin, or business owner. Payment test mode configured if challenge creation requires payment.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/sponsored-challenges/create`. | Create challenge form loads or access rules are clearly enforced. |  |  |  |
| 2 | Submit empty form. | Required-field validation appears. |  |  |  |
| 3 | Fill title, sponsor, brief, reward, deadline, rules, and contact fields. | Form accepts valid values. |  |  |  |
| 4 | Submit. | Challenge is created as pending / draft / paid as appropriate and confirmation is shown. |  |  |  |

### TC-073: Sponsor/client manages own challenges

Pre-condition: Logged in as the owner of at least one challenge.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/sponsored-challenges/manage`. | Owner's challenges appear; challenges from other sponsors are not editable. |  |  |  |
| 2 | Open a challenge edit page. | Edit form is pre-filled with existing challenge data. |  |  |  |
| 3 | Save a non-destructive update. | Update persists and public detail page reflects it after refresh. |  |  |  |

### TC-074: Unauthorized challenge editing is blocked

Pre-condition: Logged in as standard user who does not own the target challenge.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Directly open `/sponsored-challenges/{id}/edit` for another user's challenge. | Access is denied, redirected, or edit controls are hidden. |  |  |  |
| 2 | Try to save by manipulating URL if possible. | API rejects unauthorized update. |  |  |  |

---

## Section 8 — Creator boosts and monetization

### TC-080: Creator boosts page displays tiers

Pre-condition: Open `/creator-boosts` while logged out, then logged in as standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/creator-boosts`. | Boost page loads with Lite, Pro, and Ultra or current configured tiers, prices, and benefits. |  |  |  |
| 2 | Compare logged-out and logged-in CTA behavior. | Logged-out user is prompted to log in/sign up; logged-in user can start purchase. |  |  |  |
| 3 | Confirm no active boost state. | User without boost sees purchase options and no false active badge. |  |  |  |

### TC-081: Creator boost checkout and activation

Pre-condition: Logged in as standard user; payment provider test mode configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Select a boost tier. | Checkout component opens with selected tier and amount. |  |  |  |
| 2 | Complete test payment using test card / provider flow. | Payment succeeds and app verifies payment. |  |  |  |
| 3 | Refresh profile and showcase. | Active boost badge appears on own profile and content according to selected tier. |  |  |  |
| 4 | Check admin payment/boost records if accessible. | Order has paid status, tier, user, amount, and timestamp. |  |  |  |

### TC-082: Failed or cancelled boost payment

Pre-condition: Logged in; payment test provider supports failed/cancelled scenario.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Start a boost purchase. | Checkout opens. |  |  |  |
| 2 | Cancel checkout or use a failing test card. | User sees a clear cancelled/failed message. |  |  |  |
| 3 | Check profile and admin records. | No active boost is granted for failed payment; pending/failed order is tracked if designed. |  |  |  |

### TC-083: Donate page payment flow

Pre-condition: Payment test mode configured. Use logged-out and logged-in sessions.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/donate`. | Donation page loads with preset amount buttons and custom amount field. |  |  |  |
| 2 | Select preset amount. | Selected amount is visibly highlighted and payment CTA uses that amount. |  |  |  |
| 3 | Enter invalid custom amount. | Validation prevents zero, negative, or non-numeric donation. |  |  |  |
| 4 | Complete a test donation. | Payment success / verification message appears and revenue record is created. |  |  |  |

---

## Section 9 — Leaderboard, presence, video, survey, and profiles

### TC-090: Leaderboard page

Pre-condition: Seed users with weekly and lifetime points.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/leaderboard`. | Leaderboard loads podium/ranking rows with user names and points. |  |  |  |
| 2 | Switch between weekly and all-time filters. | Rankings update and active filter is clear. |  |  |  |
| 3 | Trigger refresh if button exists. | Data reloads without duplicating rows or losing sort order. |  |  |  |
| 4 | Check privacy. | No private emails or sensitive account data appear publicly. |  |  |  |

### TC-091: Random video chat access and safety

Pre-condition: Logged in as a standard user. If testing two-user matching, use two distinct accounts and devices/windows.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Logged out: open `/video`. | User is redirected to login. |  |  |  |
| 2 | Logged in: open `/video`. | Random Chat page loads with safety copy and video chat component. |  |  |  |
| 3 | Grant camera/microphone permissions. | Local preview or waiting state appears; no permission error if allowed. |  |  |  |
| 4 | Deny camera/microphone permissions. | Friendly permission-required message appears; app does not crash. |  |  |  |
| 5 | Test with boosted user if applicable. | Boosted user's extended time / benefits match tier rules. |  |  |  |

### TC-092: Feedback survey

Pre-condition: Open `/survey` while logged in and logged out if survey is public.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/survey`. | Feedback Survey page loads with rating/buttons and free-text input. |  |  |  |
| 2 | Submit without required selections. | Validation or disabled submit prevents incomplete response. |  |  |  |
| 3 | Complete all questions and submit. | Thank-you screen appears and response is saved. |  |  |  |
| 4 | Refresh after submission. | Duplicate handling follows product rules; no accidental duplicate if not allowed. |  |  |  |

### TC-093: Own profile view and edit

Pre-condition: Logged in as a standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/profile`. | Own profile loads with avatar, display name, bio, skills, points, posts, and account actions. |  |  |  |
| 2 | Click Edit and update display name, bio, and skills. | Fields become editable and save persists changes after refresh. |  |  |  |
| 3 | Upload or change profile picture. | Valid image uploads, preview updates, and public profile uses new image. |  |  |  |
| 4 | Try invalid upload type/oversized file. | Friendly validation error appears and old image remains. |  |  |  |

### TC-094: Public profile routes

Pre-condition: At least one seeded user profile exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/profile/{id}` for another user. | Public profile loads with display name, avatar, bio, points/posts as allowed. |  |  |  |
| 2 | Open `/u/{userId}` for the same or another user. | Public vanity profile route loads or redirects consistently. |  |  |  |
| 3 | Inspect sensitive fields. | Email, role-management controls, private account actions, and internal IDs are not exposed beyond intended UI. |  |  |  |

### TC-095: Account export, restore, and deletion controls

Pre-condition: Logged in as a test account that can be safely exported/restored/deleted. Do not run destructive deletion on shared accounts unless authorized.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Locate account data/export controls on profile if visible. | Export control starts a data export or explains availability. |  |  |  |
| 2 | Run restore flow if available and safe. | Restore confirmation appears and data returns according to policy. |  |  |  |
| 3 | Start delete-account flow but cancel. | Confirmation protects against accidental deletion. |  |  |  |
| 4 | If authorized, delete a disposable test account. | Account is removed/disabled, protected routes block access, and data follows retention policy. |  |  |  |

---

## Section 10 — Admin access and role-based behavior

### TC-100: Standard user is blocked from admin

Pre-condition: Logged in as standard community user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin`. | Access is denied or redirected; no admin data appears. |  |  |  |
| 2 | Try a nested admin URL such as `/admin/users`. | Access is denied consistently. |  |  |  |

### TC-101: Admin dashboard roles can enter admin workspace

Pre-condition: Repeat with customer support, developer support, operations, admin, and business owner accounts.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin`. | Dashboard loads with stat cards and admin sidebar. |  |  |  |
| 2 | Check sidebar role label. | Label matches signed-in user's role. |  |  |  |
| 3 | Check restricted links. | Users and Roles links appear only for roles with team-management permission. |  |  |  |
| 4 | Open each visible sidebar link. | Visible pages load; hidden pages remain blocked if opened directly without permission. |  |  |  |

### TC-102: Admin dashboard overview

Pre-condition: Logged in as admin or business owner.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin`. | Total Users, Pending Opportunities, Approved Opportunities, and Boost Orders stats load. |  |  |  |
| 2 | Click each stat card. | Card routes to the expected management page. |  |  |  |
| 3 | Force/retry API error if possible. | Error state displays retry button and no raw stack trace. |  |  |  |

### TC-103: Admin opportunities moderation

Pre-condition: Logged in as operations/admin/business owner. At least one pending opportunity exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/opportunities`. | Pending, Approved, and Rejected tabs with counts are shown. |  |  |  |
| 2 | Search by title, organization, description, or tag. | Results filter accurately. |  |  |  |
| 3 | Approve a pending opportunity. | Status changes to Approved and opportunity appears publicly if intended. |  |  |  |
| 4 | Reject another pending opportunity with reason if supported. | Status changes to Rejected and reason is saved/shared according to rules. |  |  |  |

### TC-104: Institution plans admin page

Pre-condition: Logged in as admin/business owner; institution plan data exists if applicable.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/InstitutionPlans`. | Institution Plans page loads without case-sensitive route issues. |  |  |  |
| 2 | Review plan cards/table. | Plans show names, features, prices, and status where implemented. |  |  |  |
| 3 | Test create/edit/subscribe controls if visible. | Validation and persistence work; money-related changes are audited. |  |  |  |

### TC-105: Admin user management

Pre-condition: Logged in as operations/admin/business owner with team-management permission.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/users`. | Users page loads with search field and user rows/cards. |  |  |  |
| 2 | Search by name, email, or ID. | Results filter without exposing more data than intended. |  |  |  |
| 3 | Edit a non-critical user. | Edit modal opens and save persists allowed fields. |  |  |  |
| 4 | Change role for a test user. | Confirmation appears; role updates; new permissions apply after refresh/re-login. |  |  |  |
| 5 | Suspend and unsuspend a test user. | User state changes and login/access behavior follows product rules. |  |  |  |
| 6 | Delete only a disposable user after confirmation. | Deletion requires confirmation and audit log is created if enabled. |  |  |  |

### TC-106: Roles and permissions reference

Pre-condition: Logged in as operations/admin/business owner with team-management permission.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/roles`. | Roles & Permissions page loads. |  |  |  |
| 2 | Review every role card. | Business Owner, Admin, Operations, Developer Support, Customer Support, Client, and User appear with summaries and permissions. |  |  |  |
| 3 | Compare with admin sidebar access. | Sidebar behavior matches permission descriptions. |  |  |  |

### TC-107: Boost management

Pre-condition: Logged in as admin/business owner. At least one boost order exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/boost-management`. | Boost orders load with search field. |  |  |  |
| 2 | Search by user name, email, plan, target, or order ID. | Results filter accurately. |  |  |  |
| 3 | Open order actions. | Approve/cancel/update controls appear according to current status. |  |  |  |
| 4 | Add optional note and update a test order. | Status/note persists and user badge updates if activation changed. |  |  |  |

### TC-108: Game manager

Pre-condition: Logged in as operations/admin/business owner. Use non-production content or test content only.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/game-manager`. | Game Manager loads and allows switching Quiz/Hangman content tabs. |  |  |  |
| 2 | Add one quiz question with invalid fields. | Validation blocks missing question/options/answer. |  |  |  |
| 3 | Add a valid quiz question. | Question is saved and appears in list. |  |  |  |
| 4 | Add a valid hangman word. | Word/category/hint save and appear in list. |  |  |  |
| 5 | Batch import valid JSON. | Items import with success feedback. |  |  |  |
| 6 | Batch import malformed JSON. | Friendly error appears and existing content is not corrupted. |  |  |  |
| 7 | Delete test content. | Confirmation/action removes only selected item. |  |  |  |

### TC-109: Admin sponsored challenges

Pre-condition: Logged in as operations/admin/business owner. Pending sponsored challenge exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/sponsored-challenges`. | Manage Sponsored Challenges page loads with challenge cards. |  |  |  |
| 2 | Filter or search if controls are available. | Results update correctly. |  |  |  |
| 3 | Approve a pending challenge. | Challenge becomes visible publicly if paid/active rules are met. |  |  |  |
| 4 | Reject or remove a test challenge if supported. | Status changes safely and public listing updates. |  |  |  |

### TC-110: Revenue management

Pre-condition: Logged in as admin/business owner. Seed creator boost, sponsored challenge, institution plan, sponsored opportunity, placement fee, donation, refund, and payout records where possible.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/payments`. | Revenue Management page loads with summary metrics and stream breakdown. |  |  |  |
| 2 | Switch time period: Last 7 days, Last 30 days, Last 90 days, Last year. | Metrics and charts update for selected period. |  |  |  |
| 3 | Search by order ID, description, or type. | Transaction list filters accurately. |  |  |  |
| 4 | Inspect amounts and dates. | ZAR currency, timestamps, statuses, and revenue stream labels are readable. |  |  |  |
| 5 | Export monetization data if available. | File downloads successfully and contains expected columns without sensitive card data. |  |  |  |
| 6 | Test refund/payout/reconciliation controls on test data only. | Actions require confirmation and create auditable records. |  |  |  |

### TC-111: Opportunity analytics

Pre-condition: Logged in as operations/admin/business owner. Opportunity analytics events exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/opportunity-analytics`. | Opportunity Analytics page loads with summary cards/charts. |  |  |  |
| 2 | Inspect top opportunities and views/clicks. | Metrics are non-negative and formatted consistently. |  |  |  |
| 3 | Change filters if available. | Analytics update without page crash. |  |  |  |

### TC-112: Survey responses admin

Pre-condition: Logged in as operations/admin/business owner. Survey responses exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/survey`. | Survey Responses page loads with summary stats. |  |  |  |
| 2 | Review Favourite Feature Breakdown. | Chart/table values match seeded response counts. |  |  |  |
| 3 | Review All Responses. | Free-text responses are readable and do not break layout. |  |  |  |

### TC-113: Engagement dashboard

Pre-condition: Logged in as operations/admin/business owner. Engagement events exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/engagement`. | Engagement page loads with activity metrics. |  |  |  |
| 2 | Inspect game, content, and user engagement data. | Counts match seeded/expected activity and no negative values appear. |  |  |  |
| 3 | Test empty state if no events exist. | Clear no-data message is shown. |  |  |  |

### TC-114: System logs and audit export

Pre-condition: Logged in as developer support/admin/business owner. Audit logs exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Open `/admin/logs`. | System Logs page loads with log rows and search field. |  |  |  |
| 2 | Search logs by action/user/status. | Results filter accurately. |  |  |  |
| 3 | Change severity/status filters if present. | List updates correctly. |  |  |  |
| 4 | Download audit logs if button exists. | Download succeeds and file contains expected fields without secrets/tokens. |  |  |  |

---

## Section 11 — API, security, and error handling spot checks

### TC-120: Public API health and public lists

Pre-condition: Use browser DevTools Network tab or an API client in the QA environment.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Request `/api/health`. | Returns success/healthy response without sensitive environment details. |  |  |  |
| 2 | Request public opportunities endpoint. | Returns only approved/public data. |  |  |  |
| 3 | Request public users endpoint. | Returns only public profile fields. |  |  |  |

### TC-121: Authenticated API rejects missing token

Pre-condition: Logged out. Use API client or DevTools.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | POST to a protected endpoint such as profile update without auth token. | Returns 401/403 with friendly JSON error. |  |  |  |
| 2 | POST to admin endpoint without auth token. | Returns 401/403 and no data. |  |  |  |
| 3 | Confirm UI behavior. | UI shows login/access message and does not expose stack traces. |  |  |  |

### TC-122: Rate limits and validation

Pre-condition: Coordinate with team before running load-like tests; use QA environment only.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Submit malformed JSON to a POST endpoint. | 400 validation error appears with safe message. |  |  |  |
| 2 | Submit payload with unexpected fields. | Extra fields are ignored or rejected according to schema. |  |  |  |
| 3 | Send repeated rapid requests to a rate-limited endpoint. | Rate limit returns 429 and app remains responsive. |  |  |  |

### TC-123: File upload security

Pre-condition: Use disposable test files.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Upload valid JPG/PNG to profile or showcase. | Upload succeeds and displays compressed/served image. |  |  |  |
| 2 | Upload executable/script renamed as image. | Upload is rejected by type/content validation. |  |  |  |
| 3 | Upload very large image. | App compresses or rejects with friendly size message. |  |  |  |
| 4 | Inspect displayed image URL. | URL is safe and no private bucket credentials are exposed. |  |  |  |

---

## Section 12 — End-to-end flows

### TC-130: New user onboarding loop

Pre-condition: Use a new unique email address.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Sign up as a new user. | Account is created and user reaches expected landing/dashboard state. |  |  |  |
| 2 | Edit profile with display name, bio, skills, and image. | Profile saves and public profile reflects updates. |  |  |  |
| 3 | Play one game to earn points. | Points update on profile and leaderboard after refresh if ranking threshold met. |  |  |  |
| 4 | Create one showcase post. | Post appears publicly with the user's profile info. |  |  |  |
| 5 | Submit one opportunity. | Opportunity enters moderation queue. |  |  |  |
| 6 | Submit survey feedback. | Thank-you page appears and admin survey responses include the response. |  |  |  |

### TC-131: Opportunity moderation loop

Pre-condition: Window A logged in as standard user; Window B logged in as operations/admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | [Window A] Submit a new opportunity. | Success message appears; item is pending. |  |  |  |
| 2 | [Window B] Open `/admin/opportunities` Pending tab. | New opportunity is visible. |  |  |  |
| 3 | [Window B] Approve the opportunity. | Status changes to Approved. |  |  |  |
| 4 | [Window A] Refresh `/opportunities`. | Approved opportunity appears in public/user listing. |  |  |  |
| 5 | [Window B] Confirm audit log if available. | Moderation action is logged with actor and timestamp. |  |  |  |

### TC-132: Sponsored challenge loop

Pre-condition: Window A logged in as client/sponsor; Window B logged in as admin; Window C logged in as standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | [Window A] Create a sponsored challenge. | Challenge is created as pending/draft/payment-pending per rules. |  |  |  |
| 2 | [Window B] Review and approve challenge. | Challenge becomes active/public. |  |  |  |
| 3 | [Window C] Open challenge detail and submit entry. | Submission succeeds and is associated with the user. |  |  |  |
| 4 | [Window A] Open manage page. | Sponsor sees challenge and submissions/metrics if supported. |  |  |  |

### TC-133: Creator boost revenue loop

Pre-condition: Window A logged in as standard user; Window B logged in as admin/business owner; payment test mode configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | [Window A] Buy a creator boost with test payment. | Payment succeeds and active boost badge appears. |  |  |  |
| 2 | [Window B] Open `/admin/payments`. | Transaction appears in Creator Boost revenue stream. |  |  |  |
| 3 | [Window B] Open `/admin/boost-management`. | Order appears with paid/active status. |  |  |  |
| 4 | [Window A] Create showcase post. | Post displays boost badge / boosted visibility. |  |  |  |

### TC-134: Role promotion loop

Pre-condition: Window A logged in as business owner/admin with team-management permission; Window B logged in as disposable standard user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | [Window A] Open `/admin/users` and find disposable user. | User row is visible. |  |  |  |
| 2 | [Window A] Change role to customer support. | Confirmation appears and role updates. |  |  |  |
| 3 | [Window B] Refresh/re-login and open `/admin`. | User can enter admin dashboard with restricted sidebar. |  |  |  |
| 4 | [Window A] Change role back to user. | Role updates. |  |  |  |
| 5 | [Window B] Refresh/re-login and open `/admin`. | Admin access is removed. |  |  |  |

---

## Section 13 — Cross-browser, responsive, and accessibility pass

### TC-140: Responsive page sweep

Pre-condition: Use desktop, tablet, and mobile viewport sizes. Test at least Home, Dashboard, Games, Showcase, Opportunities, Challenges, Leaderboard, Profile, and Admin Dashboard.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Load each page at desktop width. | No horizontal overflow, clipped text, or overlapping controls. |  |  |  |
| 2 | Load each page at tablet width. | Cards and navigation adapt correctly. |  |  |  |
| 3 | Load each page at mobile width. | Mobile menu works, forms fit screen, and primary actions remain reachable. |  |  |  |

### TC-141: Keyboard navigation and focus

Pre-condition: Use keyboard only. Start logged out, then repeat key flows logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Press Tab through navbar and forms. | Focus indicator is visible and order is logical. |  |  |  |
| 2 | Activate buttons/links with Enter or Space. | Controls work without mouse. |  |  |  |
| 3 | Open and close modals with keyboard. | Focus is trapped in modal and returns to trigger on close. |  |  |  |
| 4 | Submit forms with validation errors. | Focus moves to or announces the first actionable error where possible. |  |  |  |

### TC-142: Screen-reader and semantic spot check

Pre-condition: Use browser accessibility tree, VoiceOver, NVDA, or equivalent.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Inspect page landmarks. | Header, main, nav, and footer landmarks are present where appropriate. |  |  |  |
| 2 | Inspect images and icons. | Informative images have alt text; decorative icons are not confusing. |  |  |  |
| 3 | Inspect form labels. | Inputs have visible labels or accessible names. |  |  |  |
| 4 | Inspect color contrast in light/dark modes. | Text and buttons meet readable contrast. |  |  |  |

### TC-143: Browser compatibility smoke

Pre-condition: Use latest stable Chrome, Edge, Firefox, and Safari if available.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|---|---|---|---|---|
| 1 | Run authentication smoke in each browser. | Login/logout works. |  |  |  |
| 2 | Run one game in each browser. | Game UI works and no browser-specific crash occurs. |  |  |  |
| 3 | Upload one image in each supported browser. | File picker, upload, and preview work. |  |  |  |
| 4 | Complete one payment test in primary supported browser. | Payment flow works in at least the officially supported browser. |  |  |  |

---

## Sign-off

| Field | Value |
|---|---|
| Tester name |  |
| Date tested |  |
| Build / deployment URL |  |
| Browser(s) |  |
| Device / viewport(s) |  |
| Test accounts used |  |
| Overall result | Pass / Fail / Partial |

## Summary of failures

| TC # | Failure description | Screenshot / evidence link | Owner | Status |
|---|---|---|---|---|
|  |  |  |  |  |
