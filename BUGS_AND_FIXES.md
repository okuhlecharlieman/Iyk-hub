# Bugs and Fixes

This document tracks the bugs reported and the plan to fix them.

## 1. Paystack Donation Not Recorded
- **Bug:** Donations made via Paystack are not reflected in the app's revenue records.
- **Plan:**
    1.  Examine the Paystack webhook handler at `src/app/api/payments/paystack-webhook/route.js`.
    2.  Verify that the webhook is correctly receiving data from Paystack.
    3.  Inspect the logic in `src/lib/monetization/ledger.js` to ensure that successful payments are being recorded in the financial ledger.
    4.  Add logging to trace the entire process from webhook receipt to ledger entry.

## 2. Video Chat Permission Error
- **Bug:** Users are told they don't have permission to use video chat, even when they should.
- **Plan:**
    1.  Review the `VideoChat.jsx` component to understand how permissions are checked on the frontend.
    2.  Check the Firestore rules for `/videoRooms/{roomId}` to ensure they are not too restrictive.
    3.  Examine the logic that determines if a user has the required role or subscription to access the feature.

## 3. Rename "Video Chat" to "Random Chat"
- **Bug:** The feature is called "Video Chat" but should be "Random Chat".
- **Plan:**
    1.  Perform a global search for "Video Chat" and replace it with "Random Chat" in all relevant files.
    2.  Pay close attention to UI components, page titles, and any user-facing text.

## 4. Add Skip Feature to Random Chat
- **Bug:** No way to skip to the next person in Random Chat.
- **Plan:**
    1.  Add a "Skip" button to the `VideoChat.jsx` component.
    2.  Implement the logic to end the current WebRTC connection.
    3.  Create a function to find a new, random chat partner from the list of available users.
    4.  Initiate a new WebRTC connection with the new partner.

## 5. "Start Your Journey" Logic Error
- **Bug:** Logged-in users see a sign-in form when they click "Start Your Journey".
- **Plan:**
    1.  Locate the component containing the "Start Your Journey" button.
    2.  Investigate the conditional logic that is supposed to differentiate between logged-in and logged-out users.
    3.  Correct the logic to redirect logged-in users to the dashboard or the appropriate starting page.

## 6. Responsive Game Buttons
- **Bug:** "Join" and "Leave" buttons in the game section do not stack on small screens.
- **Plan:**
    1.  Identify the component that renders the game buttons.
    2.  Use Tailwind CSS's responsive prefixes (e.g., `sm:`, `md:`) to apply different styles for different screen sizes.
    3.  Ensure the buttons are displayed as a column (`flex-col`) on small screens and a row (`flex-row`) on larger screens.

## 7. Showcase Reactions Not Stored/Hot-reloading
- **Bug:** Reactions on showcase posts are not saved, and the UI doesn't update without a manual refresh.
- **Plan:**
    1.  Inspect the `PostCard.jsx` component and the code that handles reaction clicks.
    2.  Review the backend API endpoint for storing reactions to ensure it's working correctly and saving the data to Firestore.
    3.  Implement a real-time listener (e.g., using Firebase's `onSnapshot`) in the `PostCard.jsx` component to automatically update the UI when the reaction count changes.
