# Iyk Hub — Manual Test Cases

For testers. Work through each section in order. Fill in the **Actual Result** and **Pass / Fail** columns as you go. If a test fails, capture a screenshot and note the error message in the **Notes** column. Leave nothing blank — if a step cannot be run, write **BLOCKED** and explain why.

---

## Test Environment

| Item | Value |
|------|-------|
| **App URL** | https://iyk-hub.vercel.app |
| **Local Dev** | http://localhost:3000 |

### User Roles & Test Accounts

| Role | Description | Portal Access |
|------|-------------|---------------|
| **Business Owner** | Full access — people, money, settings, operations | Admin + App |
| **Admin** | Full dashboard access for trusted leaders | Admin + App |
| **Operations** | Workflow, content, opportunities, challenges (no money) | Admin + App |
| **Developer Support** | Technical bugs, integrations, uploads | Admin (limited) + App |
| **Customer Support** | User questions, community moderation | Admin (limited) + App |
| **Client** | External business/institution contact | App (limited) |
| **User** | Default community member | App only |

> **Tip — avoid session conflicts:** Use a separate incognito/private window for each user role you test simultaneously.

### How to Use This Document

Each test case has:
- **Pre-condition** — what must be true before you start the test.
- A table of numbered **steps**, each with an **Expected Result**.
- Columns for you to fill in: **Actual Result**, **Pass/Fail** (write P or F), and **Notes**.

---

## Section 1 — Authentication

### TC-001: Sign up with email and password

**Pre-condition:** No active session. Open the app in a private/incognito window.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the signup page (`/signup`) | A registration form is displayed with email, password, and display name fields | | | |
| 2 | Enter a valid email, password (min 6 chars), and display name, then click Sign Up | Account is created. You are redirected to the dashboard. A welcome message or user's name appears | | | |
| 3 | Check Firestore `users` collection | A new document exists with the user's UID, email, displayName, role: "user" | | | |

### TC-002: Sign up with Google

**Pre-condition:** No active session. Open the app in a private/incognito window.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the signup page | A "Sign up with Google" button is visible | | | |
| 2 | Click "Sign up with Google" and complete the OAuth flow | You are redirected to the dashboard with your Google account name displayed | | | |

### TC-003: Log in with email and password

**Pre-condition:** A registered account exists. No active session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the login page (`/login`) | A login form with email and password fields is displayed | | | |
| 2 | Enter valid credentials and click Sign In | You are redirected to the dashboard. Your name or email appears | | | |
| 3 | Check the browser URL | URL is `/dashboard` — no error page redirect | | | |

### TC-004: Log in with Google

**Pre-condition:** A Google-linked account exists. No active session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the login page | A "Sign in with Google" button is visible | | | |
| 2 | Click "Sign in with Google" and complete OAuth | You are redirected to the dashboard | | | |

### TC-005: Wrong password is rejected

**Pre-condition:** No active session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the login page | Login form is displayed | | | |
| 2 | Enter a valid email and an incorrect password, then click Sign In | An error message appears (e.g., "Incorrect email or password"). You are NOT redirected to the dashboard | | | |

### TC-006: Non-existent email is rejected

**Pre-condition:** No active session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter an email that does not have an account and any password, then click Sign In | An error message appears (e.g., "No account found with this email"). You are NOT redirected | | | |

### TC-007: Log out

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Logout button (sidebar or header) | You are redirected to the login/home page. Session is destroyed | | | |
| 2 | Try navigating to `/dashboard` directly | You are redirected back to the login page | | | |

### TC-008: Password toggle visibility

**Pre-condition:** On the login or signup page.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Type a password in the password field | Password is hidden (dots/bullets) | | | |
| 2 | Click the show/hide toggle icon | Password text becomes visible | | | |
| 3 | Click the toggle again | Password is hidden again | | | |

### TC-009: Suspended user cannot log in normally

**Pre-condition:** A user account that has been suspended by admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Attempt to log in with the suspended user's credentials | Login succeeds but the user sees a suspended/restricted notice. Access to main features is limited | | | |

### TC-010: Pending-deletion user sees restoration banner

**Pre-condition:** A user account that has requested deletion (30-day cooling period active).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Log in with the pending-deletion account | A banner appears stating the account is scheduled for deletion with a "Restore" button | | | |
| 2 | Click "Restore" | Account is restored. The banner disappears. Full access resumes | | | |

---

## Section 2 — Dashboard & Navigation (User Role)

### TC-011: Dashboard loads correctly

**Pre-condition:** Logged in as a standard **User**.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/dashboard` | The dashboard page loads with the user's name or welcome message. No errors in console | | | |
| 2 | Verify navigation links are visible | Sidebar/header shows links to: Showcase, Leaderboard, Opportunities, Games, Creator Boosts, Profile, etc. | | | |

### TC-012: User cannot access admin routes

**Pre-condition:** Logged in as a standard **User** (not admin).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate directly to `/admin` | Access is denied. Either a "not authorized" message is shown or user is redirected away | | | |
| 2 | Navigate to `/admin/users` | Same — access denied or redirected | | | |

---

## Section 3 — Profile Management

### TC-013: View own profile

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/profile` | Profile page loads with: display name, email, bio, skills, points (lifetime and weekly), profile picture | | | |
| 2 | Verify points display | Both "Lifetime Points" and "Weekly Points" are shown with numeric values | | | |

### TC-014: Edit profile

**Pre-condition:** Logged in as any user, viewing own profile.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Edit (pencil) icon | Form fields become editable: display name, bio, skills | | | |
| 2 | Change the display name and bio, then click Save | Changes are saved. Profile refreshes with updated values | | | |
| 3 | Reload the page | Changes persist — the updated name and bio still show | | | |

### TC-015: Upload profile picture

**Pre-condition:** Logged in, editing profile.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the camera/upload icon on the profile picture | A file picker dialog opens | | | |
| 2 | Select a valid image file (JPG/PNG) | A preview of the image appears | | | |
| 3 | Click Save | Profile picture is updated. The new image shows on the profile page | | | |

### TC-016: View public profile

**Pre-condition:** Logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "View Public Profile" on `/profile` | Navigates to `/u/{userId}` showing the public profile view | | | |
| 2 | Verify public profile shows: name, bio, skills, showcase posts | All public info is visible. Private data (email, account settings) is NOT shown | | | |

### TC-017: Share profile link

**Pre-condition:** Logged in, viewing own profile.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Share Link" | The profile URL is copied to clipboard. A "Copied!" confirmation appears | | | |

### TC-018: Redeem promo code on profile

**Pre-condition:** Logged in. A valid promo code exists (created by admin).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Scroll to the "Redeem Promo Code" section on `/profile` | Input field and "Redeem" button are visible | | | |
| 2 | Enter a valid promo code and click Redeem | Success message shows with points received. Points balance updates | | | |
| 3 | Try redeeming the same code again | Error: "You have already redeemed this promo code" | | | |

### TC-019: Redeem invalid promo code

**Pre-condition:** Logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter a non-existent code and click Redeem | Error: "Invalid promo code" | | | |

### TC-020: Redeem expired promo code

**Pre-condition:** Logged in. An expired promo code exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter the expired code and click Redeem | Error: "This promo code has expired" | | | |

---

## Section 4 — Showcase

### TC-021: View showcase feed

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/showcase` | Showcase feed loads with project cards. Each card shows: title, description, media (if present), creator name | | | |
| 2 | Verify suspended/deleted users' posts are NOT visible | Only posts from active users appear | | | |

### TC-022: Submit showcase post with media

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the submit/create post button on showcase | A form appears with fields: title, description, media/image URL, link, category | | | |
| 2 | Fill in title, description, upload/provide media, and submit | Post is created successfully. It appears in the showcase feed | | | |

### TC-023: Submit showcase post without media

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Open the showcase submit form | Form fields are visible | | | |
| 2 | Fill in title and description but leave media/image blank. Submit | Post is created successfully without media. No "invalid payload" error | | | |

### TC-024: Edit own showcase post

**Pre-condition:** Logged in. User has at least one showcase post.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to user's own post and click Edit | Edit form loads with pre-filled current values | | | |
| 2 | Change the title and click Update | Post is updated. The new title appears in the feed | | | |

### TC-025: Delete own showcase post

**Pre-condition:** Logged in. User has at least one showcase post.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click Delete on own post | A confirmation dialog appears | | | |
| 2 | Confirm deletion | Post is removed from the feed and Firestore | | | |

### TC-026: Showcase voting

**Pre-condition:** Logged in. Viewing another user's showcase post.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the upvote/like button on a post | Vote count increments. Button state changes to "voted" | | | |
| 2 | Click again to remove vote | Vote count decrements. Button returns to default state | | | |

---

## Section 5 — Leaderboard

### TC-027: View leaderboard

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/leaderboard` | Leaderboard page loads with a ranked list of users by points | | | |
| 2 | Verify users are sorted by points (highest first) | Top user has the most points. Rankings decrease as you scroll | | | |
| 3 | Verify suspended/deleted users are NOT shown | Only active users appear on the leaderboard | | | |

### TC-028: Leaderboard filter toggle

**Pre-condition:** On the leaderboard page.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Toggle between "Weekly" and "Lifetime" views | The leaderboard re-sorts based on the selected time period | | | |

---

## Section 6 — Opportunities

### TC-029: View opportunities list

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/opportunities` | A list of opportunities loads with title, description, dates, and status | | | |
| 2 | Verify expired opportunities display correctly | Expired ones show "Expired" badge or countdown as "Invalid Date" is NOT shown | | | |

### TC-030: Submit opportunity application

**Pre-condition:** Logged in. An active opportunity exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click on an active opportunity | Opportunity detail page loads | | | |
| 2 | Click Apply / Submit | Application is submitted successfully. Confirmation message shown | | | |

---

## Section 7 — Creator Boosts

### TC-031: View creator boosts page

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/creator-boosts` | Page loads with boost plans: Lite (R20/500pts), Pro (R70/2000pts), Ultra (R150/5000pts) | | | |
| 2 | Verify user's points balance is shown | Current lifetime points displayed at the top | | | |

### TC-032: Purchase boost with ZAR (Paystack)

**Pre-condition:** Logged in. Valid Paystack test credentials configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Buy" on Lite plan (R20) | Paystack checkout modal/redirect opens | | | |
| 2 | Complete test payment | Boost is activated. Confirmation message shown. Boost badge appears on profile | | | |

### TC-033: Purchase boost with points

**Pre-condition:** Logged in. User has sufficient lifetime points (e.g., 500+ for Lite).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Use 500 Points" on Lite plan | Confirmation dialog appears | | | |
| 2 | Confirm the purchase | Points are deducted. Boost is activated. Success message shown | | | |
| 3 | Verify points balance decreased | Points on profile page reduced by 500 | | | |

### TC-034: Insufficient points for boost

**Pre-condition:** Logged in. User has fewer than 500 lifetime points.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Use Points" on any plan | Error: "Not enough points. You have X but need Y" | | | |

### TC-035: Boost history

**Pre-condition:** Logged in. User has purchased at least one boost.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to profile page and check boost section | Active boost shown with plan name and time remaining. Boost history list visible | | | |

---

## Section 8 — Games

### TC-036: Games page loads

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/games` | Games listing page loads with available games | | | |

### TC-037: Spin wheel game

**Pre-condition:** Logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/games/spin-wheel` | Spin wheel game loads | | | |
| 2 | Click Spin | Wheel spins and lands on a reward. Points are awarded if applicable | | | |

### TC-038: Multiplayer game join

**Pre-condition:** Logged in. A multiplayer game (e.g., Memory Game) is available.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Open a multiplayer game | Game interface loads with a "Join" or "Create Room" option | | | |
| 2 | Join/create a game room | Room is created/joined. Waiting for opponent or game starts | | | |

---

## Section 9 — Video Chat

### TC-039: Start video chat

**Pre-condition:** Logged in. Browser has camera/microphone access.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/video` | Video chat page loads with controls | | | |
| 2 | Click "Start" or equivalent | Camera activates. Status shows "Searching for partner..." | | | |

### TC-040: Video chat controls

**Pre-condition:** In an active video chat session.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the camera toggle | Camera turns off/on. Remote user sees/doesn't see your video | | | |
| 2 | Click the microphone toggle | Microphone mutes/unmutes | | | |
| 3 | Click the end call button | Video chat session ends. Returns to idle state | | | |

---

## Section 10 — Sponsored Challenges

### TC-041: View sponsored challenges

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/sponsored-challenges` | List of challenges loads with title, sponsor, prize, deadline | | | |

### TC-042: Create sponsored challenge (admin/sponsor)

**Pre-condition:** Logged in as Admin or Business Owner.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/sponsored-challenges/create` | Challenge creation form loads with title, description, prize, deadline fields | | | |
| 2 | Fill in all required fields and submit | Challenge is created. Redirected to challenge detail page | | | |

### TC-043: Submit to a challenge

**Pre-condition:** Logged in as any user. An active challenge exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Open an active challenge | Challenge detail page loads with submission form | | | |
| 2 | Submit an entry (file/link/text as required) | Submission is saved. Confirmation message shown | | | |

### TC-044: Admin approves/rejects challenge

**Pre-condition:** Logged in as Admin. A pending challenge exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/sponsored-challenges` | List of challenges with status indicators | | | |
| 2 | Click Approve on a pending challenge | Challenge status changes to "Approved" / "Active" | | | |

---

## Section 11 — Donations

### TC-045: View donate page

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/donate` | Donation page loads with amount options or custom amount field | | | |

### TC-046: Make a donation

**Pre-condition:** On the donate page. Paystack test mode.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Select or enter an amount and click Donate | Paystack checkout opens | | | |
| 2 | Complete test payment | Donation confirmed. Thank you message shown | | | |

---

## Section 12 — Survey / Feedback

### TC-047: Take survey (user)

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/survey` (or click footer link "Feedback Survey") | Survey form loads with questions: overall rating, favourite feature, improvement, recommend likelihood | | | |
| 2 | Fill in all questions and submit | Survey submitted successfully. Thank you message shown | | | |

### TC-048: Survey auto-popup

**Pre-condition:** Logged in user who hasn't exceeded the popup limit (max 2 times, 24h cooldown).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate around the app and wait 10-30 seconds | A survey popup appears asking for feedback | | | |
| 2 | Dismiss the popup | Popup closes. No errors | | | |

### TC-049: Admin views survey responses

**Pre-condition:** Logged in as Admin. At least one survey response exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/survey` | Survey admin page loads with: total responses, avg overall rating, avg recommend rating | | | |
| 2 | Verify individual responses show user display names (not UIDs) | Each response card shows the user's name | | | |

---

## Section 13 — Account Management

### TC-050: Export account data

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to profile and find "Export Data" in Account Management section | Export button is visible | | | |
| 2 | Click "Export Data" | A JSON file downloads containing profile data, posts, and boost orders. No 500 error | | | |

### TC-051: Request account deletion

**Pre-condition:** Logged in as any user.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to profile Account Management section | "Delete Account" button visible | | | |
| 2 | Click "Delete Account" | A confirmation dialog appears requiring password re-entry | | | |
| 3 | Enter password and confirm | Account status changes to "pending_deletion". A 30-day cooling banner appears | | | |

### TC-052: Restore account within cooling period

**Pre-condition:** Logged in with an account in "pending_deletion" status.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Restore Account" on the deletion banner | Account status returns to normal. Banner disappears | | | |

---

## Section 14 — Legal Pages

### TC-053: Privacy policy page

**Pre-condition:** None required (public page).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/privacy` | Privacy policy page loads with structured content and section headings | | | |
| 2 | Verify no broken layout or missing content | All sections render properly. No console errors | | | |

### TC-054: Terms of service page

**Pre-condition:** None required (public page).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/terms` | Terms of service page loads with structured content | | | |

### TC-055: About page

**Pre-condition:** None required (public page).

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/about` | About page loads with app description, features list, and boost plan information | | | |
| 2 | Verify boost plans show both ZAR price and points cost | Each plan card shows e.g., "R20 or 500 Points" | | | |

---

## Section 15 — Admin: Dashboard & Stats

### TC-056: Admin dashboard loads

**Pre-condition:** Logged in as **Admin** or **Business Owner**.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin` | Admin dashboard loads with overview stats: total users, active boosts, revenue, etc. | | | |
| 2 | Verify the sidebar shows all admin navigation links | Links visible: Dashboard, Opportunities, Institution Plans, Users, Roles, Boost Management, Game Manager, Challenges, Revenue, Promotions, Survey, Engagement, Logs | | | |

### TC-057: Admin sidebar responsive

**Pre-condition:** Logged in as Admin. Viewing on mobile viewport.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | On mobile, look for the hamburger/menu icon | A menu toggle button is visible (top left area) | | | |
| 2 | Tap the menu button | Sidebar slides in with all navigation links | | | |
| 3 | Tap a link | Sidebar closes and navigates to the selected page | | | |

---

## Section 16 — Admin: User Management

### TC-058: View user list

**Pre-condition:** Logged in as Admin/Business Owner/Operations.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/users` | User list loads with columns: User, Email, Created At, Last Seen, Role, Points, Actions | | | |
| 2 | Verify user count and online count are shown in header | "X total users • Y online • Z admins" displayed | | | |

### TC-059: Search users

**Pre-condition:** On `/admin/users`. Multiple users exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Type a name in the search box | User list filters in real-time. Match count shown (e.g., "3 results") | | | |
| 2 | Type a partial email | Users matching that email are shown | | | |
| 3 | Clear the search | Full user list returns | | | |

### TC-060: Sort users by name

**Pre-condition:** On `/admin/users`. Multiple users exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "User" column header | Users sort A→Z by display name. Sort icon changes to up arrow | | | |
| 2 | Click the "User" column header again | Users sort Z→A. Sort icon changes to down arrow | | | |

### TC-061: Sort users by email

**Pre-condition:** On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "Email" column header | Users sort by email address alphabetically | | | |

### TC-062: Sort users by created date

**Pre-condition:** On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "Created At" column header | Users sort by creation date (oldest first) | | | |
| 2 | Click again | Users sort newest first | | | |

### TC-063: Sort users by last seen

**Pre-condition:** On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "Last Seen" column header | Users sort by last login date | | | |

### TC-064: Sort users by role

**Pre-condition:** On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "Role" column header | Users sort alphabetically by role name | | | |

### TC-065: Sort users by points

**Pre-condition:** On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the "Points" column header | Users sort by lifetime points (ascending) | | | |
| 2 | Click again | Users sort by lifetime points (descending — highest first) | | | |

### TC-066: Change user role

**Pre-condition:** Logged in as Admin/Business Owner. On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Role" button on a user row | Role change modal opens showing current role and available roles | | | |
| 2 | Select a new role (e.g., "Operations") and confirm | User's role badge updates. Success toast message shown | | | |

### TC-067: Edit user profile (admin)

**Pre-condition:** Logged in as Admin. On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Edit (pencil) icon on a user row | Edit modal opens with user fields: name, email, photo, etc. | | | |
| 2 | Change the display name and save | User's name updates in the list | | | |

### TC-068: Suspend user

**Pre-condition:** Logged in as Admin. On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Ban icon on an active user | Suspend confirmation modal opens with optional reason field | | | |
| 2 | Enter a reason and confirm | User shows "Suspended" badge. Success message shown | | | |
| 3 | Verify suspended user is hidden from showcase and leaderboard | Visit `/showcase` and `/leaderboard` — suspended user's content is not visible | | | |

### TC-069: Unsuspend user

**Pre-condition:** Logged in as Admin. A suspended user exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Ban icon on the suspended user | Unsuspend modal opens | | | |
| 2 | Confirm unsuspend | "Suspended" badge removed. User's content reappears in showcase/leaderboard | | | |

### TC-070: Delete user

**Pre-condition:** Logged in as Admin. On `/admin/users`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the Trash icon on a user | Delete confirmation dialog appears | | | |
| 2 | Confirm deletion | User is removed from the list. Success message shown | | | |

### TC-071: Non-admin cannot access user management

**Pre-condition:** Logged in as **Customer Support** or **User** role.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/users` | Access denied message: "Only Business Owner, Admin, and Operations roles can manage users." | | | |

---

## Section 17 — Admin: Promotions

### TC-072: Promotions page loads

**Pre-condition:** Logged in as Admin/Business Owner/Operations.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/promotions` | Promotions page loads with tabs: Allocate Points, Promo Codes, Send Email, History | | | |

### TC-073: Allocate points to all users

**Pre-condition:** On Promotions page, "Allocate Points" tab.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter 100 in Points Amount, select "All Users" as target | Form is filled | | | |
| 2 | Click "Allocate Points" | Success: "Allocated 100 points to all users (X users)". All users' points increase by 100 | | | |

### TC-074: Allocate points by role

**Pre-condition:** On Promotions page, "Allocate Points" tab.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter 50 in Points, select "By Role", choose "Client" | Form shows role dropdown | | | |
| 2 | Click "Allocate Points" | Success message with count of affected users. Only client-role users receive 50 points | | | |

### TC-075: Allocate points to specific email

**Pre-condition:** On Promotions page, "Allocate Points" tab.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Enter 200 in Points, select "Specific Email", enter a known user email | Form shows email input | | | |
| 2 | Click "Allocate Points" | Success: "Allocated 200 points to user {email} (1 user)". That user's points increase | | | |

### TC-076: Allocate points — email not found

**Pre-condition:** On Promotions page.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Select "Specific Email", enter a non-existent email, click Allocate | Error: "No user found with email..." | | | |

### TC-077: Create promo codes

**Pre-condition:** On Promotions page, "Promo Codes" tab.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "+ Create Codes" | Modal opens with fields: Points per Code, Number of Codes, Prefix, Max Redemptions, Expires in Days | | | |
| 2 | Enter 100 points, 5 codes, prefix "PROMO", 10 max redemptions, 30 days expiry. Click Create | 5 promo codes created. They appear in the codes table with correct values | | | |

### TC-078: Copy promo code

**Pre-condition:** On Promo Codes tab. At least one code exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the copy icon next to a code | Code is copied to clipboard. "Copied: XXX-XXXXXXXX" toast appears | | | |

### TC-079: Deactivate promo code

**Pre-condition:** On Promo Codes tab. An active code exists.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click the trash icon next to an active code | Code status changes to "Inactive". Trash icon disappears | | | |
| 2 | Verify a user cannot redeem the deactivated code | On profile, enter the deactivated code → Error: "This promo code has been deactivated" | | | |

### TC-080: Send promo email to all users

**Pre-condition:** On Promotions page, "Send Email" tab. SMTP configured. Active promo codes exist.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Select a promo code, choose "All Users", optionally add a message | Form is ready | | | |
| 2 | Click "Send Emails" | Success: "Sent to X users". Emails delivered with promo code, points value, and custom message | | | |

### TC-081: Send promo email to specific users

**Pre-condition:** On Send Email tab. SMTP configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Select a code, choose "Specific Emails", enter comma-separated emails | Textarea shows with email list | | | |
| 2 | Click "Send Emails" | Emails sent only to the specified addresses | | | |

### TC-082: Send email — SMTP not configured

**Pre-condition:** SMTP_HOST, SMTP_USER, SMTP_PASS env vars are NOT set.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Attempt to send emails | Error: "Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables." | | | |

### TC-083: Promotion history

**Pre-condition:** On Promotions page, "History" tab. Some promo actions have been performed.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "History" tab | All past promotion actions are listed: points allocations, codes created, emails sent | | | |
| 2 | Verify each entry shows: type badge, timestamp, details, admin email | All metadata is present and correctly formatted | | | |

---

## Section 18 — Admin: Boost Management

### TC-084: View boost management

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/boost-management` | Boost management page loads with active/expired boosts | | | |
| 2 | Verify time remaining displays correctly (not NaN) | Each active boost shows e.g., "2d 5h left" or "Expired" | | | |

---

## Section 19 — Admin: Opportunities Management

### TC-085: View admin opportunities

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/opportunities` | Opportunities admin page loads with all opportunities listed | | | |
| 2 | Verify dates display correctly (not "Invalid Date") | Expires, Countdown, and Created fields show valid dates or dashes | | | |

### TC-086: Create opportunity (admin)

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click "Create" or "Add Opportunity" | Creation form opens | | | |
| 2 | Fill in title, description, deadline, and other required fields. Submit | Opportunity created. It appears in the admin list and the public `/opportunities` page | | | |

---

## Section 20 — Admin: Revenue & Payments

### TC-087: View revenue management

**Pre-condition:** Logged in as Admin/Business Owner.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/payments` | Revenue management page loads with transaction history, totals, and charts | | | |

### TC-088: Export monetization data

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to the monetization section and click Export | A CSV or JSON file downloads with financial data | | | |

---

## Section 21 — Admin: Roles & Permissions

### TC-089: View roles breakdown

**Pre-condition:** Logged in as Admin. On `/admin/roles`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/roles` | Roles page loads showing all role definitions: Business Owner, Admin, Operations, Developer Support, Customer Support, Client, User | | | |
| 2 | Verify each role shows its permissions and description | All role cards display: label, category, summary, permissions list, recommended for | | | |

---

## Section 22 — Admin: Engagement & Logs

### TC-090: View engagement stats

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/engagement` | Engagement page loads with user activity metrics | | | |

### TC-091: View system logs

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/logs` | System logs page loads with admin actions and audit trail | | | |

### TC-092: Download audit logs

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Click download/export on the logs page | Audit log file downloads | | | |

---

## Section 23 — Admin: Game Manager

### TC-093: View game manager

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/game-manager` | Game manager page loads with game content management options | | | |

---

## Section 24 — Admin: Institution Plans

### TC-094: View institution plans

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/InstitutionPlans` | Institution plans page loads with plan management interface | | | |

---

## Section 25 — Admin: Opportunity Analytics

### TC-095: View opportunity analytics

**Pre-condition:** Logged in as Admin.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/admin/opportunity-analytics` | Analytics page loads with charts and metrics for opportunity engagement | | | |

---

## Section 26 — Background Jobs & Cron

### TC-096: TTL cleanup job

**Pre-condition:** API endpoint accessible. Firestore has data older than retention period.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call `GET /api/jobs/ttl-cleanup` with appropriate authorization | Job runs. Returns success with counts for each cleanup step (rate limits, quotes, video rooms, moderation, accounts) | | | |
| 2 | Verify job is resilient — if one step fails, others still run | Each step wrapped in try/catch. Partial success doesn't crash the entire job | | | |

### TC-097: Weekly leaderboard reset

**Pre-condition:** API endpoint accessible.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call `GET /api/jobs/weekly-leaderboard-reset` | Weekly points are reset to 0 for all users. Lifetime points are preserved | | | |

### TC-098: Creator boost lifecycle

**Pre-condition:** API endpoint accessible. Some boosts have expired.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call `GET /api/jobs/creator-boost-lifecycle` | Expired boosts are deactivated. Active boosts remain unchanged | | | |

---

## Section 27 — API Security & Error Handling

### TC-099: Unauthenticated API request

**Pre-condition:** No auth token.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call any protected API endpoint without `Authorization` header | HTTP 401: "Not authenticated. No token provided." | | | |

### TC-100: Invalid token

**Pre-condition:** Use an expired or malformed JWT.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call a protected endpoint with `Authorization: Bearer invalid_token` | HTTP 401: "Invalid or expired authentication token." | | | |

### TC-101: Non-admin calls admin endpoint

**Pre-condition:** Logged in as standard User. Have a valid auth token.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call `GET /api/admin/users` with the user's token | HTTP 403: "Not authorized for this resource." | | | |

### TC-102: Invalid JSON body

**Pre-condition:** Authenticated request.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Send `POST /api/showcase/submit` with body `{invalid json}` | HTTP 400: "Request body must be valid JSON." | | | |

### TC-103: Missing required fields

**Pre-condition:** Authenticated request.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Send `POST /api/showcase/submit` with empty object `{}` | HTTP 400 with validation error details listing missing fields | | | |

### TC-104: Health endpoint

**Pre-condition:** None.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Call `GET /api/health` | HTTP 200 with health status response | | | |

---

## Section 28 — Responsive & Dark Mode

### TC-105: Mobile responsiveness

**Pre-condition:** Open app on mobile viewport (375px width) or use browser dev tools.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Navigate to `/dashboard` | Layout adapts to mobile. No horizontal overflow. Content is readable | | | |
| 2 | Navigate to `/showcase` | Cards stack vertically. Images scale properly | | | |
| 3 | Navigate to `/admin/users` | Table switches to mobile card layout. All user info visible | | | |
| 4 | Navigate to `/admin/promotions` | Tabs scroll horizontally if needed. Forms are full-width | | | |

### TC-106: Dark mode toggle

**Pre-condition:** App has dark mode support via `next-themes`.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Toggle dark mode (if available) or set system preference to dark | All pages switch to dark theme. Text is readable on dark backgrounds | | | |
| 2 | Verify admin pages in dark mode | Admin sidebar, tables, modals all have appropriate dark theme styling | | | |

---

## Section 29 — Edge Cases & Error Boundaries

### TC-107: Error boundary catches render errors

**Pre-condition:** Logged in.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | If a component crashes (e.g., missing data), verify the error boundary catches it | An error message is shown instead of a blank/white screen. The rest of the app remains functional | | | |

### TC-108: Rate limiting

**Pre-condition:** API with rate limiting configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Send many rapid requests to the same endpoint (e.g., 50 requests in 1 second) | After the limit is exceeded, subsequent requests return HTTP 429 "Too many requests" | | | |

### TC-109: Concurrent sessions

**Pre-condition:** Same user logged in on two different browsers/tabs.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Update profile in Tab A | Changes reflect when Tab B refreshes | | | |
| 2 | Post to showcase in Tab A | Post appears in Tab B's feed on refresh | | | |

---

## Section 30 — End-to-End Flows

### TC-110: New user onboarding flow

**Pre-condition:** No existing account.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Visit the app homepage | Landing page loads with sign-up CTA | | | |
| 2 | Click Sign Up and create an account | Account created. Redirected to dashboard | | | |
| 3 | Complete profile (add bio, skills, profile picture) | Profile saved. Public profile at `/u/{userId}` shows the info | | | |
| 4 | Submit a showcase post | Post appears in the feed | | | |
| 5 | Check the leaderboard | New user appears with starting points | | | |

### TC-111: Admin promo campaign flow

**Pre-condition:** Logged in as Admin. SMTP configured.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Go to `/admin/promotions` → "Promo Codes" tab | Page loads | | | |
| 2 | Create 3 promo codes worth 200 points each, prefix "WELCOME", expires in 7 days | 3 codes created and listed | | | |
| 3 | Switch to "Send Email" tab | Tab loads with code selector | | | |
| 4 | Select one of the WELCOME codes, target "All Users", add a welcome message | Form filled | | | |
| 5 | Click "Send Emails" | Emails sent successfully to all users | | | |
| 6 | Switch to "History" tab | The email send event appears with sent count and code | | | |
| 7 | Log in as a standard User | Dashboard loads | | | |
| 8 | Go to `/profile`, enter the WELCOME code in the promo section | Success: "Redeemed 200 points!" Points balance increases by 200 | | | |

### TC-112: Boost purchase and expiry flow

**Pre-condition:** Logged in as a user with 500+ lifetime points.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | Go to `/creator-boosts` | Plans shown with points options | | | |
| 2 | Click "Use 500 Points" on Lite plan | Points deducted. Boost activated. Badge appears on profile | | | |
| 3 | Check `/admin/boost-management` (as admin) | The new boost appears with time remaining (e.g., "23h 59m left") | | | |
| 4 | Wait for boost to expire or trigger lifecycle job | Boost status changes to "Expired". Badge removed from profile | | | |

### TC-113: Admin suspends user → content hidden → unsuspend → content restored

**Pre-condition:** Two accounts: one Admin, one User with showcase posts.

| # | Action | Expected Result | Actual Result | P/F | Notes |
|---|--------|----------------|---------------|-----|-------|
| 1 | As Admin, suspend the User on `/admin/users` | User shows "Suspended" badge | | | |
| 2 | Visit `/showcase` | Suspended user's posts are NOT visible | | | |
| 3 | Visit `/leaderboard` | Suspended user is NOT listed | | | |
| 4 | As Admin, unsuspend the user | "Suspended" badge removed | | | |
| 5 | Visit `/showcase` again | User's posts reappear | | | |
| 6 | Visit `/leaderboard` again | User is listed again | | | |

---

## Summary Checklist

| Section | # Tests | Covers |
|---------|---------|--------|
| 1. Authentication | TC-001 → TC-010 | Sign up, login, logout, wrong password, suspended/deleted users |
| 2. Dashboard & Navigation | TC-011 → TC-012 | Dashboard load, role-based access |
| 3. Profile Management | TC-013 → TC-020 | View, edit, upload, public profile, promo code redemption |
| 4. Showcase | TC-021 → TC-026 | Feed, submit (with/without media), edit, delete, voting |
| 5. Leaderboard | TC-027 → TC-028 | Rankings, filters, exclusions |
| 6. Opportunities | TC-029 → TC-030 | List, apply |
| 7. Creator Boosts | TC-031 → TC-035 | Plans, ZAR purchase, points purchase, history |
| 8. Games | TC-036 → TC-038 | Games page, spin wheel, multiplayer |
| 9. Video Chat | TC-039 → TC-040 | Start, controls |
| 10. Sponsored Challenges | TC-041 → TC-044 | View, create, submit, approve |
| 11. Donations | TC-045 → TC-046 | View, donate |
| 12. Survey | TC-047 → TC-049 | Take survey, auto-popup, admin view |
| 13. Account Management | TC-050 → TC-052 | Export, delete, restore |
| 14. Legal Pages | TC-053 → TC-055 | Privacy, terms, about |
| 15. Admin Dashboard | TC-056 → TC-057 | Stats, responsive sidebar |
| 16. Admin Users | TC-058 → TC-071 | List, search, sort (all columns), role change, edit, suspend, delete, access control |
| 17. Admin Promotions | TC-072 → TC-083 | Allocate points, promo codes, email, history, edge cases |
| 18. Admin Boost Mgmt | TC-084 | View, time display |
| 19. Admin Opportunities | TC-085 → TC-086 | View, create, date validation |
| 20. Admin Revenue | TC-087 → TC-088 | View, export |
| 21. Admin Roles | TC-089 | Role definitions display |
| 22. Admin Engagement & Logs | TC-090 → TC-092 | Stats, logs, download |
| 23. Admin Game Manager | TC-093 | View |
| 24. Admin Institution Plans | TC-094 | View |
| 25. Admin Opp. Analytics | TC-095 | View |
| 26. Background Jobs | TC-096 → TC-098 | TTL cleanup, leaderboard reset, boost lifecycle |
| 27. API Security | TC-099 → TC-104 | Auth, authorization, validation, health |
| 28. Responsive & Dark Mode | TC-105 → TC-106 | Mobile layout, dark theme |
| 29. Edge Cases | TC-107 → TC-109 | Error boundaries, rate limiting, concurrency |
| 30. End-to-End Flows | TC-110 → TC-113 | Onboarding, promo campaign, boost lifecycle, suspend/unsuspend |

**Total: 113 test cases across 30 sections covering all 7 user roles and every major feature.**
