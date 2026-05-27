# 🌟 Intwana Hub

![Intwana Hub Logo](./assets/logo.png)

Intwana Hub is a **digital kasi community center** — a positive, chat-free platform designed to help young people **relax, create, and grow**.  
It combines **fun mini games, a creativity wall for showcasing art/music/code, a leaderboard with weekly challenges, and curated real-world opportunities**.  

This project was built for **Virtu-Hack 2025** 🚀  

---

## 🎯 Purpose
The Hub is focused on 3 vibes:
- 🧘 **Stress Relief** – play mini-games and enjoy positive quotes.  
- 🚀 **Empowerment** – discover curated gigs, resources, and learning opportunities.  
- 🎨 **Showcase Talent** – upload and share creations (art, music, code, poems) in a safe space.  

No chats, no negativity — just a space for kasi youth to shine.

---

## 🛠️ Features
- **Dashboard experience**: Personalized welcome messages, featured content, daily quotes, and quick access to games, talent showcase, and opportunities.
- **Mini Games collection**: Play fun, casual games like rock-paper-scissors, tic-tac-toe, memory match, hangman, quizzes, and more to relax and earn points.
- **Leaderboard system**: Track progress with weekly challenges, compare scores, and celebrate top performers in the community.
- **Creativity Wall**: Upload and share creations across art, music, code snippets, stories, and poems. Users can react with emojis and discover new talent.
- **Opportunities Board**: Browse curated jobs, gigs, and collaboration opportunities that are reviewed and approved by administrators.
- **User profiles**: Create a profile to showcase your skills, earned points, uploaded content, and participation history.
- **Admin portal**: Manage platform content, users, and monetization settings through a protected admin interface.
- **Creator Boosts (Monetization)**: Offer tiered plans (Lite, Pro, and Ultra) for creators to enhance their visibility and unlock exclusive features.
    - **Lite Boost**: Blue "Boosted" badge, 1.2x visibility on posts, featured section placement.
    - **Pro Boost**: Purple "Pro Creator" badge, 1.8x visibility, extended video chat (3 min), portfolio analytics.
    - **Ultra Boost**: Gold "Verified Creator" badge, 2.5x visibility, 5 min video chat, full analytics, custom profile accent, homepage carousel, early access to sponsors.
- **Points-Based Boost Purchasing**: Users can spend their earned lifetime points (500/2,000/5,000) to buy Lite/Pro/Ultra boosts as an alternative to ZAR payment.
- **In-App Feedback Survey**: Users can share feedback via a dedicated /survey page or a random popup. Admins can view all responses with stats at /admin/survey.
- **Account Management**: Full self-service account lifecycle — data export (JSON download), 30-day soft-delete with cooling-off period, account restoration, and password re-authentication before deletion.
- **Admin Account Suspension**: Admins can suspend/unsuspend users with audit logging. Suspended and deleted users are hidden from showcase and leaderboard.
- **Revenue Management**: Admin-only financial dashboard for tracking paid revenue streams, transaction history, and revenue breakdown across creator boosts, sponsored challenges, institution plans, sponsored opportunities, and placement fees.
- **Reactive search and filters**: Search transactions by order ID, description, or type, filter revenue streams, and view performance over different time periods.
- **Secure authentication**: Firebase Auth protects user and admin access while supporting a safe, moderated community.

---

## 🚀 Tech Stack
- **Frontend**: Next.js (React + TailwindCSS)  
- **Backend**: Firebase (Auth, Firestore, Storage)  
- **Games**: Built with React components  
- **Hosting**: Vercel  

---

## 📦 Installation

1. Clone this repo:
   ```bash
   git clone https://github.com/okuhlecharlieman/Iyk-hub.git
   cd Iyk-hub
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root with your Firebase config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
   ```

4. (For file uploads) Set Firebase Storage CORS:
   - Create a `cors.json` file:
     ```json
     [
       {
         "origin": ["http://localhost:3000","https://intwanahub.netlify.app","https://your-vercel-domain.vercel.app"],
         "method": ["GET","POST","PUT","HEAD"],
         "responseHeader": ["Authorization","Content-Type","x-goog-meta-*"] ,
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Run:
     ```bash
     gcloud auth login
     gcloud config set project YOUR_PROJECT_ID
     gsutil cors set cors.json gs://YOUR_BUCKET_NAME
     ```

4. Run locally:
   ```bash
   npm run dev
   ```

🌍 Deployment

Deployed easily on Vercel:

```bash
vercel
```

📸 Screenshots
Dashboard

Creativity Wall

Opportunities Board

👥 Team

Okuhle Charlieman & contributors 💡

🏆 Hackathon Goal

Build a safe, creative hub for township youth — merging gaming, creativity, and opportunities into one uplifting platform.

📜 License

MIT License – free to use and adapt.


## 📸 Screenshots and Images

### Logo
![Intwana Hub Logo](./assets/logo.png)

### Additional Assets
![Image 1](./assets/{108CFF45-09A4-4C23-B69D-CF08B3AA52BD}.png)  
![Image 2](./assets/{29FD198B-5FB5-463E-8819-F13275C31997}.png)  
![Image 3](./assets/{3C702713-F703-453E-B74D-B6BBF11082F2}.png)  
![Image 4](./assets/{4A4DE9A8-36CA-475E-A69D-5562372955F1}.png)  
![Image 5](./assets/{5C7D0CC8-7DCB-4158-9611-4DF9B5D62F81}.png)  
![Image 6](./assets/{6B54B333-43C5-4D53-B050-5CC35A7EB1BB}.png)  



## Background Jobs

Cron jobs configured in `vercel.json`:

- **`GET /api/jobs/weekly-leaderboard-reset`** — Runs every Monday at 00:00 UTC. Resets `users.points.weekly` to `0` and records metadata in `systemJobs/weeklyLeaderboardReset`.

- **`GET /api/jobs/ttl-cleanup`** — Runs daily. Cleans expired rate limits, resolved moderation items (30d), old daily quotes (24h), stale video chat rooms (24h), and purges user accounts past the 30-day deletion cooling-off period (reassigns posts, soft-deletes user doc, removes Firebase Auth user).

Set `CRON_SECRET` in Vercel environment variables. The cron routes require:

- `Authorization: Bearer $CRON_SECRET`

