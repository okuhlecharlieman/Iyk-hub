# IYK Hub - Comprehensive QA Test Guide

> **App URL**: https://iyk-hub.vercel.app/  
> **Last Updated**: May 2026  
> **Tech Stack**: Next.js 14, Firebase Auth, Firestore, PayStack (ZAR), Tailwind CSS

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Authentication](#2-authentication)
3. [Home Page (Landing)](#3-home-page-landing)
4. [Dashboard](#4-dashboard)
5. [Games](#5-games)
6. [Showcase (Community Wall)](#6-showcase-community-wall)
7. [Opportunities](#7-opportunities)
8. [Sponsored Challenges](#8-sponsored-challenges)
9. [Creator Boosts](#9-creator-boosts)
10. [Donate Page](#10-donate-page)
11. [Leaderboard](#11-leaderboard)
12. [Video Chat](#12-video-chat)
13. [User Profile](#13-user-profile)
14. [Admin Panel](#14-admin-panel)
15. [Navigation & Layout](#15-navigation--layout)
16. [Theme & Dark Mode](#16-theme--dark-mode)
17. [PWA (Progressive Web App)](#17-pwa-progressive-web-app)
18. [PayStack Payment Integration](#18-paystack-payment-integration)
19. [Error Handling](#19-error-handling)
20. [Responsive Design](#20-responsive-design)
21. [Performance & Loading States](#21-performance--loading-states)
22. [Multi-Reaction System](#22-multi-reaction-system-pr-68)
23. [Footer Social & Legal Links](#23-footer-social--legal-links-pr-68)
24. [Role-Based Access Pages](#24-role-based-access-pages-pr-68)
25. [Showcase Post Improvements](#25-showcase-post-improvements-pr-68)
26. [Sponsored Challenge Editing](#26-sponsored-challenge-editing-pr-68)
27. [Video Chat Improvements](#27-video-chat-improvements-pr-68)
28. [Cron Jobs & Quote of the Day](#28-cron-jobs--quote-of-the-day-pr-68)
29. [Profile Picture Upload](#29-profile-picture-upload-pr-68)
30. [User Retention: Streaks & Achievements](#30-user-retention-streaks--achievements-pr-68)
31. [Presence Tracking & Boost Features](#31-presence-tracking--boost-features-pr-1)

---

## 1. Test Environment Setup

### Test Accounts

| Role    | Email                          | Password                       | Notes                       |
|---------|--------------------------------|--------------------------------|-----------------------------|
| Regular | okuhle.charlieman@gmail.com    | okuhle.charlieman@gmail.com1   | Primary test account        |
| Admin   | *(same if role=admin in Firestore)* | *(same)*                  | Needs `role: "admin"` in `users` collection |

### PayStack Test Credentials

| Key                              | Value                                                    |
|----------------------------------|----------------------------------------------------------|
| Test Public Key (`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) | `pk_test_f87fa5221eceb22fdc2a2aab0f3421ea3bd9c6d7` |
| Test Secret Key (`PAYSTACK_SECRET_KEY`)             | `sk_test_6c5a84b991e2c3654cc82491741c7d41c4b3fb00` |

> **Important**: Add both keys to Vercel Environment Variables before testing payment flows.

### PayStack Test Card Details

| Field       | Value              |
|-------------|--------------------|
| Card Number | 4084 0840 8408 4081 |
| Expiry      | Any future date    |
| CVV         | 408                |
| OTP/PIN     | 0000 (if prompted) |

> Refer to [PayStack test cards documentation](https://paystack.com/docs/payments/test-payments/) for additional test cards and scenarios.

### Firebase Collections

| Collection             | Purpose                                  |
|------------------------|------------------------------------------|
| `users`                | User profiles, points, roles             |
| `wallPosts`            | Showcase/community wall posts            |
| `sessions`             | Game session logs                        |
| `opportunities`        | Job/opportunity listings                 |
| `creatorBoostOrders`   | Boost purchase orders                    |
| `sponsoredChallenges`  | Challenge listings and submissions       |

---

## 2. Authentication

### TC-2.1: Email/Password Login - Happy Path

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page loads with email, password fields, "Login" button, Google sign-in button, and "Forgot your password?" link |
| 2 | Enter valid email: `okuhle.charlieman@gmail.com` | Email field populates |
| 3 | Enter valid password: `okuhle.charlieman@gmail.com1` | Password field populates (masked by default) |
| 4 | Click "Login" button | Loading spinner appears, then redirects to `/dashboard` |
| 5 | Verify dashboard loads | Welcome message shows user's first name, date is displayed |

### TC-2.2: Login - Wrong Password

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page loads |
| 2 | Enter email: `okuhle.charlieman@gmail.com` | - |
| 3 | Enter wrong password: `wrongpassword1!` | - |
| 4 | Click "Login" | Error: **"Incorrect email or password. Please try again."** (friendly message, not raw Firebase code) |

### TC-2.3: Login - Invalid Email Format

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter `notanemail` in email field | - |
| 2 | Enter any password | - |
| 3 | Click "Login" | Error: **"Please enter a valid email address."** |

### TC-2.4: Login - Password Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter valid email | - |
| 2 | Enter password `short` (< 8 chars, no number/symbol) | - |
| 3 | Click "Login" | Error: **"Password must be at least 8 characters and include a number + symbol."** |

### TC-2.5: Login - Show/Hide Password Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter any text in password field | Password shown as dots/bullets |
| 2 | Click eye icon (FaEye) | Password becomes visible as plain text; icon changes to FaEyeSlash |
| 3 | Click eye-slash icon again | Password masked again |

### TC-2.6: Forgot Password - Happy Path

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | - |
| 2 | Enter valid email: `okuhle.charlieman@gmail.com` | - |
| 3 | Click "Forgot your password?" link | Loading indicator appears briefly |
| 4 | Verify success message | Green text: **"Password reset email sent! Check your inbox."** |

### TC-2.7: Forgot Password - No Email

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave email field empty | - |
| 2 | Click "Forgot your password?" | Error: **"Please enter a valid email address first."** |

### TC-2.8: Google Sign-In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Google sign-in button visible |
| 2 | Click Google sign-in button | Google OAuth popup opens |
| 3 | Complete Google auth flow | Popup closes, user redirected to `/dashboard` |
| 4 | Verify user doc in Firestore | `users` collection contains doc with Google displayName and photoURL |

### TC-2.9: Signup - Happy Path

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/signup` | Signup page loads with Display Name, Email, Password, Confirm Password fields |
| 2 | Enter Display Name: `Test User` | - |
| 3 | Enter Email: `testuser@example.com` | - |
| 4 | Enter Password: `TestPass1!` | No password hint shown (meets all requirements) |
| 5 | Enter Confirm Password: `TestPass1!` | - |
| 6 | Click "Create Account" | Toast: **"Verification email sent! Please check your inbox."** Redirects to `/` |

### TC-2.10: Signup - Password Mismatch

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill in all fields with mismatched passwords | - |
| 2 | Click "Create Account" | Error: **"Passwords do not match."** |

### TC-2.11: Signup - Weak Password Hints

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type `abc` in password field | Hint: **"Password must be at least 8 characters."** |
| 2 | Type `abcdefgh` (no number) | Hint: **"Password should include at least one number."** |
| 3 | Type `abcdefg1` (no symbol) | Hint: **"Password should include at least one symbol."** |
| 4 | Type `abcdefg1!` (valid) | Hint disappears |

### TC-2.12: Signup - Duplicate Email

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try signing up with `okuhle.charlieman@gmail.com` | - |
| 2 | Submit form | Error: **"An account with this email already exists. Try logging in instead."** |

### TC-2.13: Signup - Empty Display Name

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave Display Name empty, fill other fields | - |
| 2 | Click "Create Account" | Error: **"Display name is required."** |

### TC-2.14: Signup - Google Sign-In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Google sign-in button on signup page | Google OAuth popup opens |
| 2 | Complete auth | Redirects to `/`, user doc created in Firestore with Google profile data |

### TC-2.15: Logout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While logged in, click profile avatar in navbar | Dropdown menu appears |
| 2 | Click "Log Out" | User logged out, navbar shows Login/Sign Up links |

---

## 3. Home Page (Landing)

### TC-3.1: Home Page Load

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Page loads with hero section, feature cards, statistics, testimonials |
| 2 | Verify hero text | "Empowering Youth Through Technology" badge visible |
| 3 | Verify feature cards | 4 cards: Games (blue), Opportunities (teal), Showcase (purple), Community (emerald) |
| 4 | Verify "Explore" buttons | Each card has an "Explore" button linking to its respective page |

### TC-3.2: Home Page - Featured Content

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to opportunities section | Up to 3 approved opportunities displayed via ContentCard components |
| 2 | Scroll to showcase section | Up to 3 recent showcase posts displayed |
| 3 | Verify loading state | LoadingSpinner shown while data fetches |
| 4 | Verify error state | If API fails, message: **"Sorry, we couldn't load all content. Please try refreshing."** |

### TC-3.3: Home Page - Install Button

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check for InstallButton component | PWA install button visible (on supported browsers) |

---

## 4. Dashboard

### TC-4.1: Dashboard - Protected Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard` while logged out | Redirected to login page (ProtectedRoute) |
| 2 | Log in, navigate to `/dashboard` | Dashboard loads with welcome header |

### TC-4.2: Dashboard - Welcome Header

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify welcome message | Shows **"Welcome back, {firstName}"** (e.g., "Welcome back, Okuhle") |
| 2 | Verify date | Current date in format: "Monday, May 10" |
| 3 | Verify quote | Daily quote displayed in italics, or fallback: "Your journey to greatness starts now." |

### TC-4.3: Dashboard - Quick Links

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify 4 quick link cards | Video Chat, Showcase, Challenges, Boosts |
| 2 | Click "Video Chat" | Navigates to `/video` |
| 3 | Click "Showcase" | Navigates to `/showcase` |
| 4 | Click "Challenges" | Navigates to `/sponsored-challenges` |
| 5 | Click "Boosts" | Navigates to `/creator-boosts` |

### TC-4.4: Dashboard - Points Card

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify PointsCard component | Shows user's lifetime and weekly points |

### TC-4.5: Dashboard - Leaderboard Preview

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify LeaderboardPreview component | Shows top users summary |

### TC-4.6: Dashboard - Game Quick Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify game icons | RPS, Tic-Tac-Toe, Memory, Hangman game icons displayed |
| 2 | Verify OnlineCount | Shows number of online users (Firestore-based presence with heartbeat) |

### TC-4.7: Dashboard - Admin Link

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in with admin account | Admin shield icon and link visible in navbar profile dropdown |
| 2 | Log in with regular account | No admin link visible |

---

## 5. Games

### TC-5.1: Games Listing Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/games` | Page loads with game cards for: RPS, Tic-Tac-Toe, Memory, Hangman, Quiz, Random Chat |
| 2 | Verify search functionality | Search input filters games by name |
| 3 | Search "rps" | Only RPS game card shown |
| 4 | Search "nonexistent" | Empty state: "No games found" with search icon |
| 5 | Clear search | All 6 game cards shown again |

### TC-5.2: Games - UserRoomsList

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check UserRoomsList component | Shows any active rooms the user has created/joined |

### TC-5.3: Game Page - Room ID Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to any game (e.g., `/games/rps-{id}`) | Game page loads with game name and icon |
| 2 | Verify Room ID bar | Gray bar showing **"Room ID: {gameId}"** with Copy button |
| 3 | Click "Copy" button | Room ID copied to clipboard; button text changes to checkmark icon briefly |
| 4 | Verify "Back to Games" link | Arrow left icon + "Back to Games" text, links to `/games` |

### TC-5.4: Game Page - Mode Selector

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify mode toggle | "Multiplayer" and "Single Player" buttons visible |
| 2 | Default mode | Multiplayer selected by default |
| 3 | Click "Single Player" | Mode switches; game renders in single-player mode |
| 4 | Click "Multiplayer" | Mode switches back |

### TC-5.5: Rock-Paper-Scissors (Single Player)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Single Player mode | RPS game loads with Rock, Paper, Scissors buttons |
| 2 | Click "Rock" | Player choice shown, CPU makes random choice, result displayed ("You win!", "You lose.", or "It's a tie!") |
| 3 | Win a round | Score increases by 5 points |
| 4 | Tie a round | Score increases by 1 point |
| 5 | Lose a round | Score stays the same (0 points for loss) |
| 6 | Click "End Game" | Score submitted; `sessions` and `users` collections updated in Firestore |

### TC-5.6: Tic-Tac-Toe (Single Player)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Single Player mode | 3x3 grid loads, player is X |
| 2 | Click a cell | X placed; CPU (O) makes move after brief delay |
| 3 | Win the game | Victory message displayed; score recorded |
| 4 | Draw the game | Draw message displayed |

### TC-5.7: Memory Match (Single Player)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Single Player mode | Grid of face-down cards loads |
| 2 | Click two cards | Cards flip; if match, they stay revealed |
| 3 | Complete all matches | Success message; score based on performance |

### TC-5.8: Hangman (Single Player)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Single Player mode | Hidden word displayed as blanks, letter buttons shown |
| 2 | Click a correct letter | Letter revealed in word |
| 3 | Click an incorrect letter | Hangman drawing progresses |
| 4 | Guess the full word | Win message and score recorded |
| 5 | Run out of guesses | Loss; word revealed |

### TC-5.9: Quiz (Single Player)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select Single Player mode | Quiz question loads with multiple choice answers |
| 2 | Select correct answer | Points awarded, next question loads |
| 3 | Select wrong answer | No points, next question loads |
| 4 | Complete quiz | Final score displayed and recorded |

### TC-5.10: Multiplayer Game - Room Full Error

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a multiplayer game room (Player A) | Room created, Room ID displayed |
| 2 | Join with Player B (second browser/tab) | Player B joins, game starts |
| 3 | Attempt to join with Player C (third browser/tab) | Error: **"This game room is full. Please create a new game."** |

### TC-5.11: Multiplayer Game - Join via Room ID

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Player A creates game, copies Room ID | Room ID available |
| 2 | Player B navigates to `/games/{room-id}` | Player B joins the room |
| 3 | Both players see game board | Real-time updates via Firestore |

### TC-5.12: Game - Score Recording

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete any game with score > 0 | - |
| 2 | Check Firestore `sessions` collection | New document with `userId`, `gameId`, `score`, `completedAt` |
| 3 | Check Firestore `users/{uid}` | `points.lifetime` and `points.weekly` incremented |

### TC-5.13: Game - Not Logged In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/games/{gameId}` while logged out | Redirected to login (ProtectedRoute wraps game pages) |

---

## 6. Showcase (Community Wall)

### TC-6.1: Showcase Page Load

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/showcase` | Page loads with community posts grid |
| 2 | Verify loading state | SkeletonGrid shown while loading |
| 3 | Verify error state | If API fails: **"Could not load the showcase. Please try again later."** |
| 4 | Verify Featured Creators section | If any post authors have an active boost, a "Featured Creators" section with rocket icon appears above regular posts |
| 5 | Verify boost badges on cards | Posts by boosted creators show a tier-specific badge (Boosted/Pro Creator/Verified Creator) next to the post type tag |

### TC-6.2: Showcase - Create Post (Logged In)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "+" (add post) button | Post editor modal opens |
| 2 | Fill in post title, description, content | - |
| 3 | Submit post | Post submitted via `/api/showcase/submit`; toast: success message |
| 4 | Verify post appears | New post visible in showcase grid |

### TC-6.3: Showcase - Create Post (Logged Out)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to create post while logged out | Toast: **"You must be logged in to save a post."** |

### TC-6.4: Showcase - Edit Own Post

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find a post you created | Edit button visible on your own posts |
| 2 | Click edit | Editor opens pre-filled with post data |
| 3 | Modify content and save | Post updated; toast: success |

### TC-6.5: Showcase - Vote (Thumbs Up)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While logged in, click thumbs-up on a post | Vote count increments by 1 |
| 2 | Click thumbs-up again on same post | Vote count decrements by 1 (toggle behavior) |
| 3 | Verify Firestore | `wallPosts/{id}`: `votes` field updated, `voters` array contains/removes user UID |

### TC-6.6: Showcase - Vote (Logged Out)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click thumbs-up while logged out | Appropriate error/prompt to log in |

### TC-6.7: Showcase - Search/Filter Posts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type in search bar | Posts filtered by title/content matching search term |
| 2 | Clear search | All posts shown again |

### TC-6.8: Showcase - Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If > 20 posts exist | "Load More" button appears at bottom |
| 2 | Click "Load More" | Additional posts appended (no duplicates) |

### TC-6.9: Showcase - Delete Post (Admin)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as admin | Delete option visible on all posts |
| 2 | Click delete on a post | Confirmation prompt; post removed via `/api/showcase/delete` |

---

## 7. Opportunities

### TC-7.1: Opportunities Page - Protected Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/opportunities` while logged out | Redirected to login (ProtectedRoute) |
| 2 | Navigate while logged in | Opportunities listing loads |

### TC-7.2: Opportunities - View Listings

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Page loads | Approved opportunities displayed as OpportunityCard components |
| 2 | Verify card details | Title, description, tags, status visible |
| 3 | Verify loading state | SkeletonCards shown while loading |
| 4 | Verify empty state | If no opportunities: empty state with icon and message |

### TC-7.3: Opportunities - Create New

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Post Opportunity" button | Modal with OpportunityForm opens |
| 2 | Fill in title, description, type, tags (comma-separated), expiry date | - |
| 3 | Submit | Toast: **"Opportunity submitted for review!"**; status = "pending" |

### TC-7.4: Opportunities - Edit Own

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find opportunity you created | Edit button visible |
| 2 | Click edit | Modal opens with pre-filled data (tags as comma-separated string, expiresAt formatted) |
| 3 | Modify and save | Toast: **"Opportunity updated successfully!"** |

### TC-7.5: Opportunities - Delete Own

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on own opportunity | Browser `confirm()` dialog appears |
| 2 | Confirm deletion | Toast: **"Opportunity deleted."**; list refreshes |
| 3 | Cancel deletion | No action taken |

### TC-7.6: Opportunities - Admin Approve/Reject

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as admin | "Pending" tab visible |
| 2 | Switch to "Pending" tab | Pending opportunities shown |
| 3 | Click "Approve" on a pending opportunity | Toast: **"Opportunity approved!"**; status changes |
| 4 | Click "Reject" | Toast: **"Opportunity rejected."** |

### TC-7.7: Opportunities - Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type in search field | Opportunities filtered by title/description matching query |

### TC-7.8: Opportunities - Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If > 12 opportunities | "Load More" button appears |
| 2 | Click "Load More" | Additional opportunities loaded and appended |

---

## 8. Sponsored Challenges

### TC-8.1: Challenges Listing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/sponsored-challenges` | Hero section loads with "Sponsored Challenges" heading |
| 2 | Verify "Create Your Challenge" button | Links to `/sponsored-challenges/create` |
| 3 | Verify "Manage Your Challenges" button | Links to `/sponsored-challenges/manage` |
| 4 | Verify challenge cards | Existing challenges displayed with details |
| 5 | Verify empty state | If no challenges: "No challenges yet" message with trophy icon |

### TC-8.2: Create Challenge

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/sponsored-challenges/create` | Challenge creation form loads |
| 2 | Fill in challenge details (title, description, prize, deadline, etc.) | - |
| 3 | Submit | Challenge created; redirected or confirmation shown |

### TC-8.3: Manage Challenges

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/sponsored-challenges/manage` | Shows challenges created by current user |
| 2 | View submissions | Submissions for each challenge visible |

### TC-8.4: Challenge Detail Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a challenge card | Navigates to `/sponsored-challenges/{id}` |
| 2 | Verify details | Full challenge description, prize info, deadline, submission form |

### TC-8.5: Challenge - Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If many challenges exist | "Load More" button appears |
| 2 | Click "Load More" | More challenges loaded via cursor-based pagination |

---

## 9. Creator Boosts

### TC-9.1: Boosts Page - Not Logged In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/creator-boosts` while logged out | Yellow notice: **"Please log in to purchase a boost."** |

### TC-9.2: Boosts Page - View Plans

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in, navigate to `/creator-boosts` | Three plan cards displayed in grid |
| 2 | Verify Lite Boost card | Label: "Lite Boost", Duration: 24h, Multiplier: x1.2, Price: **R20.00** |
| 3 | Verify Pro Boost card | Label: "Pro Boost", Duration: 72h, Multiplier: x1.8, Price: **R70.00** |
| 4 | Verify Ultra Boost card | Label: "Ultra Boost", Duration: 168h, Multiplier: x2.5, Price: **R150.00** |

### TC-9.3: Boosts - Purchase Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Purchase Boost" on Lite plan | Loading state; API call to `/api/creator-boosts/submit` |
| 2 | Verify success message | Green box: **"Boost order created (ID: {orderId}). Complete payment below."** |
| 3 | Verify PayStack checkout appears | "Complete Payment" section with amount R20.00 and "Pay ZAR 20.00" button |
| 4 | Click "Pay ZAR 20.00" | PayStack popup opens (requires `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` env var) |

### TC-9.4: Boosts - Payment Error (No Key)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt payment without `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` set | Error: **"Payment is not configured. Please contact support."** |

### TC-9.5: Boosts - API Error

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If server error occurs on boost creation | Red error box with error message |

### TC-9.6: Boosts - Activation via Webhook (PR #1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete payment for a boost order | PayStack webhook fires to `/api/payments/paystack-webhook` |
| 2 | Verify Firestore | `creatorBoostOrders/{orderId}` document updated with `paymentStatus: 'paid'` (collection name fixed from previous `creatorBoosts` bug) |
| 3 | Verify boost lifecycle activates | Boost `activationStatus` set to `active` by lifecycle job |

### TC-9.7: Boosts - Active Boost API (PR #1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While logged in with an active boost, call `GET /api/creator-boosts/active` | Returns `{ active: true, boost: { plan, label, videoChatSeconds, badge, badgeColor, badgeLabel, expiresAt } }` |
| 2 | Without an active boost | Returns `{ active: false, boost: null }` |
| 3 | With an expired boost | Returns `{ active: false, boost: null }` |

### TC-9.8: Boosts - Public Badge API (PR #1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `GET /api/creator-boosts/active/public?uid={uid}` for a boosted user | Returns `{ active: true, boost: { plan, badge, badgeLabel } }` |
| 2 | Call for a non-boosted user | Returns `{ active: false, boost: null }` |
| 3 | Call with missing/empty uid | Returns `{ active: false, boost: null }` |

### TC-9.9: Boosts - Plan Metadata (PR #1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify Lite Boost metadata | `videoChatSeconds: 60`, badge: "boosted" (blue, FaBolt icon), label: "Boosted" |
| 2 | Verify Pro Boost metadata | `videoChatSeconds: 180`, badge: "pro" (purple, FaStar icon), label: "Pro Creator" |
| 3 | Verify Ultra Boost metadata | `videoChatSeconds: 300`, badge: "verified" (amber, FaCrown icon), label: "Verified Creator" |

---

## 10. Donate Page

### TC-10.1: Donate Page Load

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/donate` | Page loads with heart icon, "Support IYK Hub" heading |
| 2 | Verify preset amounts | 5 buttons: R10, R25, R50, R100, R250 |
| 3 | Verify custom amount input | Number input with placeholder "Custom amount (ZAR)" |

### TC-10.2: Donate - Select Preset Amount

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "R25" button | Button highlighted (gradient pink-purple); donate button shows **"Donate R25.00"** |
| 2 | Click "R50" button | Previous selection cleared; now shows **"Donate R50.00"** |

### TC-10.3: Donate - Custom Amount

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type `15` in custom amount field | Preset selection cleared; button shows **"Donate R15.00"** |
| 2 | Clear input and type `3` (below minimum) | Button shows **"Select an amount"** (disabled) |

### TC-10.4: Donate - Minimum Amount Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter custom amount `4` (R4.00, below R5 minimum) | - |
| 2 | Click "Donate R4.00" (or button may be disabled) | Error: **"Minimum donation is R5.00"** |

### TC-10.5: Donate - Not Logged In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select an amount while logged out | - |
| 2 | Click donate button | Error: **"Please log in to donate."** |

### TC-10.6: Donate - Payment Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in, select R10 | Donate button shows "Donate R10.00" |
| 2 | Click "Donate R10.00" | PayStack checkout component appears with "Pay ZAR 10.00" button |
| 3 | Click "Pay ZAR 10.00" | PayStack popup opens with payment form |
| 4 | Complete payment with test card | Success: **"Thank you for your generous donation!"**; form resets |
| 5 | Close PayStack popup without paying | No error; checkout hides, user can select amount again |

### TC-10.7: Donate - Payment Failed

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If PayStack returns error | Error: **"Payment failed. Please try again."**; checkout hides |

---

## 11. Leaderboard

### TC-11.1: Leaderboard Page Load

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/leaderboard` | Page loads with trophy icon, "Leaderboard" heading |
| 2 | Verify filter tabs | "Lifetime" and "Weekly" tabs; Lifetime selected by default |
| 3 | Verify Podium | Top 3 users displayed in Podium component (gold/silver/bronze) |
| 4 | Verify list | Users ranked 4+ shown in LeaderboardItem list |

### TC-11.2: Leaderboard - Filter Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Weekly" tab | Tab highlighted; leaderboard refreshes with weekly points |
| 2 | Click "Lifetime" tab | Tab highlighted; leaderboard shows lifetime points |

### TC-11.3: Leaderboard - Refresh

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click refresh button (FaSync icon) | Leaderboard data reloaded |

### TC-11.4: Leaderboard - Empty State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If no users with points | Message: **"The leaderboard is empty. Start playing to get on the board!"** with "View Games" link |

### TC-11.5: Leaderboard - Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If > 20 users | "Load More" button appears |
| 2 | Click "Load More" | Additional users appended |

### TC-11.6: Leaderboard - Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If Firestore index missing | Error: **"Leaderboard unavailable: Firestore index missing. Please contact admin."** |
| 2 | If permission error | Error: **"Leaderboard unavailable: Permission denied. Please contact admin."** |
| 3 | Generic error | Error: **"Unable to load leaderboard. Please try again later."** with retry button |

---

## 12. Video Chat

### TC-12.1: Video Chat - Protected Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/video` while logged out | Redirected to login (ProtectedRoute) |

### TC-12.2: Video Chat - Page Load

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/video` while logged in | Page loads with purple gradient header: "Video Chat" |
| 2 | Verify VideoChat component | Video controls visible (camera, microphone, call buttons) |

### TC-12.3: Video Chat - Start Call

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click start/create room button | Browser requests camera/microphone permissions |
| 2 | Grant permissions | Local video feed appears; room created in Firestore |
| 3 | Room ID generated | Room ID available for sharing |

### TC-12.4: Video Chat - Join Call

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter existing room ID | - |
| 2 | Click join | WebRTC connection established; remote video appears |

### TC-12.5: Video Chat - Controls

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click camera toggle (FaVideo/FaVideoSlash) | Camera on/off |
| 2 | Click microphone toggle (FaMicrophone/FaMicrophoneSlash) | Mic on/off |
| 3 | Click end call (FaPhoneSlash) | Call ended; streams stopped |
| 4 | Click fullscreen (FaExpand/FaCompress) | Video fullscreen toggle |

### TC-12.6: Video Chat - Time Limit

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start a call (no active boost) | Timer starts at 60 seconds (default) |
| 2 | Timer expires | Option to extend by 60 seconds (bonus time) |

### TC-12.7: Video Chat - Extended Time via Boost (PR #1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start a call with Lite Boost active | Timer starts at 60 seconds; toast: "Connected! You have 1 minute." |
| 2 | Start a call with Pro Boost active | Timer starts at 180 seconds; toast: "Connected! You have 3 minutes." |
| 3 | Start a call with Ultra Boost active | Timer starts at 300 seconds; toast: "Connected! You have 5 minutes." |
| 4 | Verify idle state text | Shows "{N}-minute time limit" matching the active boost tier |

---

## 13. User Profile

### TC-13.1: View Own Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile/{your-uid}` | Profile page loads with avatar, display name, bio, skills |
| 2 | Verify edit button | Pencil icon (FaPencilAlt) visible (only on own profile) |
| 3 | Verify boost badge (if active) | If user has active boost, tier-specific badge displayed below name (e.g., "Boosted" blue, "Pro Creator" purple, "Verified Creator" amber) |

### TC-13.2: View Other User's Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile/{other-uid}` | Profile loads; no edit button visible |
| 2 | Verify showcase posts | User's showcase posts displayed below profile info |
| 3 | Verify boost badge (if active) | If viewed user has active boost, tier-specific badge displayed below their name |

### TC-13.3: Edit Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On own profile, click edit button | ProfileEditor modal opens |
| 2 | Verify pre-filled fields | Display Name, Bio, Skills populated with current data |
| 3 | Modify Display Name to "New Name" | - |
| 4 | Add bio: "I love coding" | - |
| 5 | Add skills: "React, Firebase, Next.js" | - |
| 6 | Click "Save Profile" | Modal closes; profile refreshes with updated data |
| 7 | Verify in Firestore | `users/{uid}` document updated with new values |

### TC-13.4: Edit Profile - Empty Display Name

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear Display Name field | - |
| 2 | Click "Save Profile" | Error: **"Display Name is required."** |

### TC-13.5: Edit Profile - Cancel

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make changes in editor | - |
| 2 | Click "Cancel" or X button | Modal closes; no changes saved |

### TC-13.6: Profile - User Not Found

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile/nonexistent-uid` | Error: **"There was an error loading this profile."** or "User not found." |

### TC-13.7: Profile - Skills Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Profile with skills set | Skills shown as blue rounded badges (pills) |
| 2 | Profile with no skills | No skills section shown |

---

## 14. Admin Panel

### TC-14.1: Admin - Access Control

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin` as non-admin user | Access denied / redirected |
| 2 | Navigate to `/admin` as admin user | Admin dashboard loads |

### TC-14.2: Admin Dashboard - Stats

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify stat cards | Total Users, Pending Opps, Approved Opps, Boost Orders displayed |
| 2 | Verify real-time updates | Stats update via Firestore `onSnapshot` listeners |

### TC-14.3: Admin - User Management

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/users` | User list displayed |
| 2 | Verify user data | Email, display name, role, join date visible |

### TC-14.4: Admin - Opportunities Management

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/opportunities` | All opportunities (pending + approved) listed |
| 2 | Approve a pending opportunity | Status changes to "approved" |
| 3 | Reject a pending opportunity | Status changes to "rejected" |

### TC-14.5: Admin - Payments

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/payments` | Payment records listed |
| 2 | Verify PaymentsCard component | Payment details (amount, status, date) visible |

### TC-14.6: Admin - Boost Management

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/boost-management` | Boost orders displayed |
| 2 | Verify order details | Plan type, user, status, created date |

### TC-14.7: Admin - Sponsored Challenges

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/sponsored-challenges` | Challenge management interface |
| 2 | Approve/reject challenges | Status updates reflected |

### TC-14.8: Admin - Monetization Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify MonetizationDashboard component | Revenue summary, financial ledger, export options visible |

### TC-14.9: Admin - Institution Plans

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/InstitutionPlans` | Institution plan management interface loads |

### TC-14.10: Admin - Error State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If Firestore error during stats loading | Error message with "Try Again" button |

---

## 15. Navigation & Layout

### TC-15.1: Navbar - Logged Out

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify visible nav links (logged out) | Games, Showcase, Opportunities, Challenges, Leaderboard, Boosts, Donate |
| 2 | Verify hidden links | Dashboard, Video Chat NOT shown |
| 3 | Verify auth buttons | "Login" and "Sign Up" buttons visible |

### TC-15.2: Navbar - Logged In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify visible nav links | Dashboard, Games, Video Chat, Showcase, Opportunities, Challenges, Leaderboard, Boosts, Donate |
| 2 | Verify profile menu | Avatar/icon in top right; click shows dropdown |
| 3 | Verify dropdown items | Profile link, Admin (if admin), Log Out |

### TC-15.3: Navbar - Active Link Highlighting

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/games` | "Games" link highlighted (blue background) |
| 2 | Navigate to `/showcase` | "Showcase" link highlighted; Games link unhighlighted |

### TC-15.4: Navbar - Mobile Menu

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize to mobile viewport (< 768px) | Hamburger menu icon (FaBars) appears |
| 2 | Click hamburger | Mobile menu slides open with all nav links |
| 3 | Click a link | Menu closes, navigation occurs |
| 4 | Click X (FaTimes) | Menu closes |

### TC-15.5: Navbar - Theme Switcher

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify ThemeSwitcher in navbar | Theme toggle button visible |

### TC-15.6: Navbar - Install Button

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify InstallButton in navbar | PWA install prompt button visible (on supported browsers) |

### TC-15.7: Footer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to bottom of any page | Footer component renders |
| 2 | Verify footer content | Links, copyright, branding visible |

---

## 16. Theme & Dark Mode

### TC-16.1: Theme Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click ThemeSwitcher button | Theme toggles between light and dark |
| 2 | Verify dark mode | Background turns dark gray/black; text turns light |
| 3 | Verify light mode | Background turns white/light; text turns dark |

### TC-16.2: Theme Persistence

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set dark mode | - |
| 2 | Refresh page | Dark mode persists (stored in localStorage or cookie) |

### TC-16.3: Theme - Component Consistency

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In dark mode, visit: `/`, `/dashboard`, `/games`, `/showcase`, `/donate`, `/leaderboard` | All pages render correctly with dark theme classes applied |
| 2 | Verify no white flash | Page transitions don't flash white in dark mode |

---

## 17. PWA (Progressive Web App)

### TC-17.1: Manifest File

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `https://iyk-hub.vercel.app/manifest.json` | JSON response with `name`, `short_name`, `icons`, `start_url`, `display`, `theme_color` |
| 2 | Verify `name` | "IYK Hub" |
| 3 | Verify `display` | "standalone" |
| 4 | Verify `theme_color` | Valid hex color |

### TC-17.2: Install Prompt

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit site in Chrome on Android | InstallButton component shows "Install" option |
| 2 | Click install | App installs to home screen |

### TC-17.3: Installed App Experience

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open installed PWA from home screen | App opens in standalone mode (no browser chrome) |
| 2 | Verify navigation works | All pages accessible within standalone app |

---

## 18. PayStack Payment Integration

### TC-18.1: PayStack Script Loading

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit any page with PaystackCheckout component | PayStack inline.js script loaded dynamically |
| 2 | Check network tab | `https://js.paystack.co/v1/inline.js` loaded successfully |

### TC-18.2: PayStack - Full Payment Flow (Test Mode)

**Prerequisites**: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` set in Vercel environment variables.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/donate`, select R10 | - |
| 2 | Click "Donate R10.00" | PayStack checkout button appears |
| 3 | Click "Pay ZAR 10.00" | PayStack popup/iframe opens |
| 4 | Enter test card: `4084 0840 8408 4081` | - |
| 5 | Enter expiry: any future date, CVV: `408` | - |
| 6 | Submit payment | OTP prompt may appear (enter `0000`) |
| 7 | Payment completes | Success callback fires; message: **"Thank you for your generous donation!"** |

### TC-18.3: PayStack - Cancelled Payment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open PayStack popup | - |
| 2 | Close popup without completing payment | `onClose` callback fires; loading state reset |

### TC-18.4: PayStack - Missing Public Key

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Remove `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` from env | - |
| 2 | Attempt to pay | Error: **"Payment is not configured. Please contact support."** |

### TC-18.5: PayStack - Script Not Loaded

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Block `js.paystack.co` in network | - |
| 2 | Click pay button | Error: **"Payment system is loading. Please try again."** |

### TC-18.6: PayStack Webhook

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After successful payment | Webhook POST to `/api/payments/paystack-webhook` |
| 2 | Verify signature validation | Request verified using HMAC-SHA512 with `PAYSTACK_SECRET_KEY` |
| 3 | Verify order processing | Related order (boost/donation) status updated in Firestore |

### TC-18.7: PayStack - Creator Boost Payment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Purchase Lite Boost (R20) | Boost order created, PayStack checkout shown |
| 2 | Complete payment with test card | Payment succeeds; message: **"Payment successful! Your boost is now active."** |
| 3 | Verify Firestore | `creatorBoostOrders/{orderId}` status updated |

---

## 19. Error Handling

### TC-19.1: Firebase Error Messages

| Error Code | Friendly Message |
|------------|-----------------|
| `auth/invalid-email` | "Please enter a valid email address." |
| `auth/user-disabled` | "This account has been disabled. Please contact support." |
| `auth/user-not-found` | "No account found with this email. Please sign up first." |
| `auth/wrong-password` | "Incorrect password. Please try again." |
| `auth/invalid-credential` | "Incorrect email or password. Please try again." |
| `auth/email-already-in-use` | "An account with this email already exists. Try logging in instead." |
| `auth/weak-password` | "Password is too weak. Use at least 8 characters with a number and symbol." |
| `auth/too-many-requests` | "Too many failed attempts. Please wait a moment and try again." |
| `auth/network-request-failed` | "Network error. Please check your connection and try again." |
| `auth/popup-closed-by-user` | "Sign-in popup was closed. Please try again." |

### TC-19.2: ErrorBoundary Component

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If a component throws a runtime error | ErrorBoundary catches it; fallback UI shown instead of blank page |
| 2 | Pages wrapped with ErrorBoundary | Games, Leaderboard, Video, Opportunities pages |

### TC-19.3: API Error Responses

| Endpoint | Error Scenario | Expected Response |
|----------|---------------|-------------------|
| `POST /api/showcase/submit` | Missing auth token | 401 Unauthorized |
| `POST /api/profile/update` | Invalid token | 401 Unauthorized |
| `POST /api/creator-boosts/submit` | Missing plan field | 400 Bad Request |
| `POST /api/opportunities/submit` | Missing required fields | 400 Bad Request |

### TC-19.4: Network Errors

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disable network (airplane mode) | - |
| 2 | Navigate between pages | Error messages displayed (not blank screens) |
| 3 | Re-enable network | Pages load normally on retry/refresh |

### TC-19.5: Toast Notifications

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger success action (e.g., save post) | Green success toast appears briefly |
| 2 | Trigger error action (e.g., failed API call) | Red error toast appears |
| 3 | Trigger warning (e.g., not logged in) | Yellow warning toast |

---

## 20. Responsive Design

### TC-20.1: Mobile Layout (< 640px)

| Page | Expected Behavior |
|------|-------------------|
| Home | Hero text stacks vertically; feature cards single column |
| Dashboard | Welcome header stacks; quick links 2-column grid |
| Games | Game cards single column; search full width |
| Showcase | Posts single column; editor modal fills screen |
| Donate | Preset amounts 3-column grid; input full width |
| Leaderboard | Filter tabs responsive; podium adapts |
| Login/Signup | Form centered, full width on mobile |

### TC-20.2: Tablet Layout (640px - 1024px)

| Page | Expected Behavior |
|------|-------------------|
| Home | Feature cards 2-column grid |
| Dashboard | Quick links 4-column grid |
| Games | Game cards 2-column grid |
| Showcase | Posts 2-column grid |

### TC-20.3: Desktop Layout (> 1024px)

| Page | Expected Behavior |
|------|-------------------|
| Home | Feature cards 4-column grid; max-width container |
| Games | Game cards 3-column grid |
| Showcase | Posts 3+ column grid |
| Admin | Sidebar layout with content area |

---

## 21. Performance & Loading States

### TC-21.1: Loading Spinners

| Page | Loading Component |
|------|-------------------|
| Home | LoadingSpinner while fetching opportunities/posts |
| Dashboard | LoadingSpinner during initial data load |
| Showcase | SkeletonGrid (skeleton loading cards) |
| Opportunities | SkeletonCards |
| Leaderboard | SkeletonTable (5 rows, 4 columns) |
| Admin | LoadingSpinner with "Loading dashboard..." text |

### TC-21.2: Skeleton Loaders

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/showcase` | Skeleton card placeholders shown before posts load |
| 2 | Navigate to `/leaderboard` | Skeleton table shown before data loads |
| 3 | Skeletons replaced | Real content replaces skeletons once data arrives |

### TC-21.3: Button Loading States

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Login" | Button shows loading state; disabled to prevent double-submit |
| 2 | Click "Purchase Boost" | Button text changes to "Processing..."; disabled |
| 3 | Click "Pay ZAR X.XX" | Button text changes to "Processing..."; disabled |

---

## Appendix: API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/showcase` | No | List showcase posts (paginated) |
| POST | `/api/showcase/submit` | Yes (Bearer token) | Create new showcase post |
| POST | `/api/showcase/delete` | Yes | Delete showcase post |
| POST | `/api/profile/update` | Yes (Bearer token) | Update user profile |
| GET | `/api/leaderboard` | No | Get leaderboard data |
| GET | `/api/opportunities` | No | List opportunities |
| POST | `/api/opportunities/submit` | Yes | Submit new opportunity |
| GET | `/api/sponsored-challenges` | No | List challenges (paginated) |
| POST | `/api/creator-boosts/submit` | Yes (Bearer token) | Create boost order |
| GET | `/api/creator-boosts/me` | Yes | Get user's boost orders |
| GET | `/api/creator-boosts/active` | Yes (Bearer token) | Get user's active boost with full metadata |
| GET | `/api/creator-boosts/active/public?uid={uid}` | No | Get public badge info for a user |
| POST | `/api/payments/paystack-webhook` | No (signature verified) | PayStack webhook handler |
| POST | `/api/payments/create-intent` | Yes | Create payment intent |
| GET | `/api/list-users` | No | List users |
| POST | `/api/set-user-role` | Admin | Set user role |
| POST | `/api/admin/updatePost` | Admin | Admin update post |
| POST | `/api/admin/deletePost` | Admin | Admin delete post |
| GET | `/api/admin/users` | Admin | Admin user management |
| GET | `/api/admin/opportunities` | Admin | Admin opportunities |
| GET | `/api/admin/monetization` | Admin | Monetization data |
| GET | `/api/admin/monetization/summary` | Admin | Revenue summary |
| GET | `/api/admin/monetization/export` | Admin | Export monetization data |
| GET | `/api/admin/creator-boosts` | Admin | Boost management |
| GET | `/api/admin/sponsored-challenges` | Admin | Challenge management |
| GET | `/api/admin/financial-ledger` | Admin | Financial ledger |
| GET | `/api/admin/payments/reconciliation` | Admin | Payment reconciliation |
| GET | `/api/admin/audit-logs/download` | Admin | Download audit logs |

---

## Appendix: Firestore Data Model

### `users/{uid}`
```json
{
  "displayName": "string",
  "email": "string",
  "photoURL": "string | null",
  "bio": "string",
  "skills": ["string"],
  "role": "user | admin",
  "points": {
    "lifetime": "number",
    "weekly": "number"
  },
  "createdAt": "Timestamp"
}
```

### `wallPosts/{postId}`
```json
{
  "uid": "string (author UID)",
  "title": "string",
  "description": "string",
  "votes": "number",
  "voters": ["uid1", "uid2"],
  "createdAt": "Timestamp"
}
```

### `sessions/{sessionId}`
```json
{
  "userId": "string",
  "gameId": "string",
  "baseGameId": "string",
  "score": "number",
  "baseScore": "number",
  "multiplier": "number",
  "mode": "singleplayer | multiplayer",
  "completedAt": "Timestamp"
}
```

### `opportunities/{oppId}`
```json
{
  "title": "string",
  "description": "string",
  "ownerId": "string",
  "status": "pending | approved | rejected",
  "tags": ["string"],
  "expiresAt": "Timestamp",
  "createdAt": "Timestamp"
}
```

### `creatorBoostOrders/{orderId}`
```json
{
  "userId": "string",
  "ownerUid": "string",
  "plan": "lite | pro | ultra",
  "targetType": "profile",
  "targetId": "string",
  "paymentStatus": "pending | paid",
  "activationStatus": "pending | active | expired",
  "feeCents": "number",
  "expiresAt": "Timestamp | null",
  "createdAt": "Timestamp"
}
```

### `presence/{uid}` (PR #1)
```json
{
  "state": "online | offline",
  "lastSeen": "Timestamp"
}
```

> **Note**: Presence uses Firestore with a 60-second heartbeat. Documents with `lastSeen` older than 2 minutes are considered stale and excluded from the online count.

---

## 22. Multi-Reaction System (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-22.1 | Like reaction (thumbs up)                    | Click thumbs up on a showcase post | Count increments, icon highlights |
| TC-22.2 | Fire reaction                                | Click fire icon on a showcase post | Fire count increments independently |
| TC-22.3 | Heart reaction                               | Click heart icon on a showcase post | Heart count increments independently |
| TC-22.4 | Toggle off reaction                          | Click same reaction again | Count decrements, reaction removed |
| TC-22.5 | Cross-auth consistency                       | Vote with Google account, check with email account | Same vote counts displayed |

---

## 23. Footer Social & Legal Links (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-23.1 | Social media icons visible                   | Scroll to footer | LinkedIn, Instagram, TikTok, website icons visible |
| TC-23.2 | Social links navigate correctly              | Click each social icon | Opens correct external URL in new tab |
| TC-23.3 | Legal links visible                          | Scroll to footer | Privacy Policy and Terms of Service links visible |
| TC-23.4 | Privacy Policy page                          | Click Privacy Policy link | Navigates to `/privacy` page |
| TC-23.5 | Terms of Service page                        | Click Terms link | Navigates to `/terms` page |

---

## 24. Role-Based Access Pages (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-24.1 | Admin page as regular user                   | Navigate to `/admin` as non-admin | Shows "Admin Area" restricted page with current role |
| TC-24.2 | Required roles displayed                     | View restricted page | Shows list of required role badges |
| TC-24.3 | Navigation buttons                           | View restricted page | "Go to Dashboard" and "Go Back" buttons functional |

---

## 25. Showcase Post Improvements (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-25.1 | Post creation date displayed                 | View showcase post | Date shown at bottom of card (e.g., "10 May 2026") |
| TC-25.2 | Author name displayed                        | View showcase post | Author name shown if available |
| TC-25.3 | Description preview                          | View post with long description | Description truncated to 3 lines |
| TC-25.4 | Edit/delete controls for owner               | View own post | Edit (pencil) and delete (trash) icons visible |
| TC-25.5 | No edit/delete for non-owner                 | View another user's post | No edit/delete controls shown |

---

## 26. Sponsored Challenge Editing (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-26.1 | Edit button on manage page                   | Go to `/sponsored-challenges/manage` | Edit button visible for pending/approved challenges |
| TC-26.2 | Edit form loads data                         | Click Edit on a challenge | Form pre-populated with existing data |
| TC-26.3 | Update challenge                             | Modify fields and save | Challenge updated, redirect to manage page |
| TC-26.4 | Banner image upload                          | Upload new banner on edit | New banner shown, old one replaced |
| TC-26.5 | Non-owner cannot edit                        | Try to edit another user's challenge | Error: "You can only edit your own challenges" |

---

## 27. Video Chat Improvements (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-27.1 | Active partner polling                       | Start search, no partner available | System polls every 5 seconds for new matches |
| TC-27.2 | Search timeout                               | Wait 60 seconds with no partner | Toast: "No one available right now. Try again later!" |
| TC-27.3 | iOS fullscreen fallback                      | Test on iOS device, tap fullscreen | Video container goes full-screen via CSS |

---

## 28. Cron Jobs & Quote of the Day (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-28.1 | Daily quote cron                             | Call `GET /api/jobs/daily-quote` | Returns quote from API Ninjas, stored in Firestore |
| TC-28.2 | Quote on dashboard                           | Log in to dashboard | Quote text and author shown in welcome header |
| TC-28.3 | Cron auth without CRON_SECRET                | Call cron endpoint without auth | Vercel cron user-agent accepted |
| TC-28.4 | Cron auth with CRON_SECRET                   | Set CRON_SECRET, call with Bearer token | Authorized and executes |

---

## 29. Profile Picture Upload (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-29.1 | Photo upload in editor                       | Open profile editor, click camera icon | File picker opens |
| TC-29.2 | Photo preview                                | Select an image file | Preview shown in circular frame |
| TC-29.3 | Photo saved to GCS                           | Save profile with new photo | Photo uploaded to GCS, URL saved to Firestore |
| TC-29.4 | File size validation                         | Try to upload 6MB image | Error: "Photo must be under 5MB" |
| TC-29.5 | Non-image rejection                          | Try to upload a PDF | Error: "Please select an image file" |

---

## 30. User Retention: Streaks & Achievements (PR #68)

| TC     | Test Case                                     | Steps | Expected Result |
|--------|-----------------------------------------------|-------|-----------------|
| TC-30.1 | Streak card on dashboard                     | Log in to dashboard | "Daily Streak" card shows current and best streak |
| TC-30.2 | Streak increments on consecutive login       | Log in on consecutive days | Current streak count increases |
| TC-30.3 | Streak resets after missed day               | Skip a day, log in | Current streak resets to 1 |
| TC-30.4 | Achievement badges                           | Reach 3-day streak | "3-Day Streak" badge appears on dashboard |
| TC-30.5 | Points-based achievements                    | Accumulate 100+ total points | "Centurion" badge appears |

---

## 31. Presence Tracking & Boost Features (PR #1)

### TC-31.1: Online Presence Counter (Firestore-based)

| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Log in to the app | Presence document created in Firestore `presence/{uid}` with `state: "online"` |
| 2 | Verify OnlineCount on dashboard | Counter shows >= 1 (includes current user) |
| 3 | Open a second browser/incognito and log in with a different account | Counter increments |
| 4 | Close the second browser tab | Counter decrements after stale threshold (~2 minutes) |
| 5 | Log out from the app | Presence document updated to `state: "offline"`; counter decrements |

### TC-31.2: Presence Heartbeat

| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Log in and stay on page for > 60 seconds | Firestore `presence/{uid}.lastSeen` updates every 60 seconds |
| 2 | Verify stale filtering | Users whose `lastSeen` is > 2 minutes old are not counted as online |

### TC-31.3: Boost Badge Component

| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | View profile of user with Lite Boost | Blue badge with bolt icon: "Boosted" |
| 2 | View profile of user with Pro Boost | Purple badge with star icon: "Pro Creator" |
| 3 | View profile of user with Ultra Boost | Amber badge with crown icon: "Verified Creator" |
| 4 | View profile of user with no active boost | No badge displayed |

### TC-31.4: Showcase Featured Creators Section

| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Navigate to `/showcase` with boosted creators' posts present | "Featured Creators" section with rocket icon appears above regular posts |
| 2 | Verify featured post order | Posts by Ultra boost users appear before Pro, which appear before Lite |
| 3 | Search for posts | Featured section hides during search; all matching posts shown in single grid |
| 4 | Navigate to `/showcase` with no boosted creators | No "Featured Creators" section; all posts in regular grid |

### TC-31.5: Boost Badge on Content Cards

| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | View a showcase post by a boosted creator | Tier badge (e.g., "Boosted", "Pro Creator") shown next to the post type tag |
| 2 | View a showcase post by a non-boosted creator | No boost badge on the card |

---

*End of QA Test Guide*
