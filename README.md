# Sanskara Planner 🌸

A collaborative wedding planning web application for the modern bride.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting**: Vercel
- **Charts**: Recharts

---

## Setup Instructions

### 1. Clone and install
```bash
git clone https://github.com/jjsungeeth/SanskaraPlanner.git
cd SanskaraPlanner
npm install
```

### 2. Set up environment variables
Create a `.env` file in the root (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://mdatytmfwzkxoawvonwn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
⚠️ Never commit your `.env` file to GitHub.

### 3. Set up Supabase Database
1. Go to **Supabase → SQL Editor → New Query**
2. Paste the entire contents of `schema.sql`
3. Click **Run**

### 4. Set up Supabase Storage Buckets
In **Supabase → Storage**, create three buckets:
| Bucket name     | Public? |
|-----------------|---------|
| `profile-photos` | ✅ Yes |
| `uploads`        | ❌ No  |
| `moodboard`      | ❌ No  |

### 5. Set up Vercel environment variables
In **Vercel → Project → Settings → Environment Variables**, add:
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your anon key

### 6. Run locally
```bash
npm run dev
```

---

## Features
- 🔐 Auth (email/password, password reset)
- 👰 Onboarding (names, wedding date, photo)
- 💰 Budget overview with bar & pie charts
- 📋 Multi-vendor quotes with line items & auto-totalling
- ✅ One-click booking that updates budget actuals
- 👥 Guestlist with RSVP tracking & CSV export
- 📅 Calendar with Google Calendar sync
- 🪑 Seating plan with drag-to-assign
- 🎨 Mood board with image upload & drawing
- 📝 Notes and stationery sections

## Offline Support
The app is designed as a PWA (Progressive Web App). For full offline support, a service worker can be added using `vite-plugin-pwa`.

---

## Adding a New Client (Manual)
Until purchase integration is set up:
1. Ask the client to sign up at your app URL
2. In **Supabase → Table Editor → chapters**, manually add a row:
   - `user_id`: their UUID (from auth.users)
   - `chapter_type`: `wedding`
   - `end_date`: their subscription end date
   - `is_active`: `true`
