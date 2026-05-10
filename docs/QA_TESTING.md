# QA Testing Guide for Intwana Hub

This guide is for quality assurance testing across the full Intwana Hub app. Use it for manual QA, regression checks, and preparing handoff notes for developers.

## 1. Setup

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/okuhlecharlieman/Iyk-hub.git
   cd Iyk-hub
   npm install
   ```
2. Create `.env.local` using your Firebase config. Use the same settings as `README.md` and `docs/STRIPE_SETUP.md`.
3. Start the app locally:
   ```bash
   npm run dev
   ```
4. Open the app at `http://localhost:3000`.

## 2. Testing Scope

Validate these major areas:
- Authentication and account access
- Dashboard and home experience
- Games and points
- Creativity Wall / Showcase
- Opportunities board and sponsored opportunities
- Leaderboard and weekly challenges
- Profile management
- Admin portal and content moderation
- New Revenue Management feature
- Payments, subscriptions, and monetization flows

## 3. Authentication / User Flow

### Sign up
- Open `/signup`
- Complete the form with a valid email, strong password, and display name
- Verify new account creation succeeds
- Confirm redirect to dashboard or welcome page

### Login
- Open `/login`
- Sign in with valid credentials
- Verify successful login and dashboard access
- Confirm invalid credential shows error
- Confirm missing fields show validation messages

### Logout
- Click logout from the app header
- Verify user is signed out and redirected to login

## 4. Dashboard

### Landing experience
- Confirm greeting text and featured cards display
- Verify the latest quote or message appears
- Check the dashboard can show games, uploads, and opportunity previews

### Navigation
- Click through main navigation links
- Confirm pages open correctly: Games, Showcase, Opportunities, Leaderboard, Profile

## 5. Games

Test the main games collection:
- Rock-paper-scissors
- Tic-tac-toe
- Memory match
- Hangman
- Quiz

For each game:
- Start the game
- Complete one full round if possible
- Verify score or points update appears
- Check UI messages for wins/losses/draws
- Ensure no broken buttons or unresponsive controls

## 6. Creativity Wall / Showcase

### Browse submissions
- Open the creativity wall or showcase page
- Confirm posts load correctly, including images or text
- Verify reactions or likes display

### Create a post
- If the feature is available, submit a new creation
- Confirm required fields validate correctly
- Verify upload succeeds and the post appears on the wall

### Delete or moderate content
- Confirm user-owned posts can be removed
- For admin users, confirm moderation controls appear and work

## 7. Opportunities Board

### Browse opportunities
- Open the opportunities page
- Confirm listings show title, description, location, and expiration
- Verify filters / categories work if present

### Submit a sponsored opportunity
- If available, fill out the sponsored opportunity form
- Confirm validation errors show for missing or invalid data
- Verify successful submission flow and review messaging

### Admin opportunity review
- Log in as admin
- Confirm sponsored opportunity review screens display pending items
- Approve or reject a test opportunity if possible

## 8. Leaderboard

### View rankings
- Open the leaderboard page
- Confirm the top users are displayed with points and rank
- Verify weekly and lifetime filters if available

### Weekly challenge behavior
- Confirm challenge status, score resets, or point updates appear as expected

## 9. Profile and Account Settings

### View profile
- Open your profile page
- Confirm personal details and points are visible
- Verify uploads, achievements, or recent activity appear correctly

### Edit profile
- Update profile fields (display name, bio, photo if supported)
- Confirm validation and successful save feedback

## 10. Admin Portal

### Access control
- Confirm only admin users can access `/admin`
- Verify normal users are blocked or redirected

### Admin dashboard
- Confirm summary cards, management links, and revenue panels load
- Verify admin navigation items work

### Content management
- Review admin screens for:
  - user management
  - boost management
  - institution plans
  - sponsored challenges
  - sponsored opportunities
  - placements and payments

### Search and filter behavior
- Test search boxes, filters, and status selectors in admin pages
- Confirm results update correctly and no JS errors occur

## 11. Revenue Management (New Feature)

### Revenue dashboard
- Open `/admin/payments`
- Confirm total revenue and stream breakdowns display
- Verify the new revenue streams appear:
  - Creator Boosts
  - Sponsored Challenges
  - Institution Plans
  - Sponsored Opportunities
  - Placement Fees

### Transaction history
- Search by order ID, description, or revenue type
- Confirm filters narrow the transaction list
- Verify the date formatting is readable and amounts show currency correctly

### Time period filtering
- Switch between `Last 7 days`, `Last 30 days`, `Last 90 days`, and `Last year`
- Confirm dashboard summary updates accordingly

## 12. Payments / Monetization

### Creator boosts and subscriptions
- Confirm checkout or payment flows open where required
- Verify Stripe or payment intent generation returns success messages
- Confirm pending and paid statuses behave correctly for orders

### Payment history and invoices
- Check payment history pages for correct amount, status, and order details
- Verify paid transactions appear under the proper revenue stream

## 13. Security and Error Handling

### Access protection
- Attempt to access admin or protected pages without login
- Confirm redirect to login or access denied behavior

### API validation
- Trigger invalid form submissions
- Confirm visible validation feedback and error messages

### Error pages
- Force errors where possible (missing page, invalid route)
- Confirm friendly fallback pages or error messages appear

## 14. Regression Testing Checklist

Run this checklist after changes or before release:
- [ ] Authentication works for sign up, login, logout
- [ ] Dashboard content loads successfully
- [ ] Games are playable and scores update
- [ ] Creativity Wall displays and accepts new submissions
- [ ] Opportunities board lists current items correctly
- [ ] Sponsored opportunity submission works
- [ ] Leaderboard shows correct ranking data
- [ ] Profile updates save successfully
- [ ] Admin portal is protected and pages load
- [ ] Revenue Management dashboard shows totals and transaction filters
- [ ] Payment flows complete or show correct statuses
- [ ] Validation errors are shown for invalid input
- [ ] No broken navigation or page errors on desktop/mobile

## 15. Reporting Bugs

When filing issues, include:
- steps to reproduce
- expected behavior
- actual behavior
- browser / device used
- screenshots when available
- app URL or local route

## 16. Notes for QA Automation

If automated testing is added later, use these areas:
- authentication & role checks
- admin page access control
- revenue dashboard filters
- transaction search
- game actions and score changes
- showcase post creation and moderation
- opportunity submission and approval

## 17. Helpful References

- App setup: `README.md`
- Automated test template: `src/__tests__/api.integration.test.js`
- Testing checklist: `docs/QUICK_REFERENCE.md#-testing-checklist`
- Security checklist: `docs/SECURITY_CHECKLIST.md`
