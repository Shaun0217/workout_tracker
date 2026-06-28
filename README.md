# Lift — Workout Tracker

A personal, mobile-first workout tracker with cross-device sync. Log in the gym on your
phone, review on desktop. Built around **progressive overload** — always know what to beat.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Charts:** Recharts (e1RM / bodyweight trends)
- **Backend:** Supabase (Postgres + Auth, Row Level Security)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **App feel:** PWA manifest + minimal service worker (installable, fullscreen)

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run, in order:
   - [`supabase/01_schema.sql`](supabase/01_schema.sql)
   - [`supabase/02_rls.sql`](supabase/02_rls.sql)
   - [`supabase/03_seed_function.sql`](supabase/03_seed_function.sql)
3. **Auth → Providers → Email:** enable email (magic link is on by default).
4. **Auth → URL Configuration:** add your local (`http://localhost:5173`) and production
   (`https://your-app.vercel.app`) URLs to the redirect allow-list.

The app calls `seed_default_program()` automatically on your first login (only if you have
no templates yet), creating the 4 templates and 21 exercises.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Project URL + anon key
npm run dev
```

Open the printed URL, enter your email, and click the magic link. On first login the default
program is seeded and the four workout cards appear.

Find the URL + anon key in **Supabase → Project Settings → API**. The anon key is safe in the
client because RLS restricts every row to its owner. **Never** ship the `service_role` key.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (it auto-detects Vite — build `npm run build`, output `dist`).
3. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Add the Vercel URL to Supabase's auth redirect allow-list (step 1.4).

Installs to your phone home screen via **Share → Add to Home Screen**.

---

## How it works

| Area | Where |
|---|---|
| Supabase client | [`src/lib/supabase.ts`](src/lib/supabase.ts) |
| Data access (all queries) | [`src/lib/queries.ts`](src/lib/queries.ts) |
| Core math (Epley e1RM, prefill, PR) | [`src/lib/logic.ts`](src/lib/logic.ts) |
| Session state machine | [`src/screens/useSession.ts`](src/screens/useSession.ts) |
| Screens | [`src/screens/`](src/screens/) |

**Estimated 1RM** uses Epley: `weight × (1 + reps / 30)`. A day's chart point is the max
e1RM across that day's sets. **PR badge** shows when a completed set's e1RM beats the
all-time best recorded *before today*. **Prefill:** a new set N defaults to last session's
set N (or its final set if last time had fewer sets).

## Scripts

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # preview the production build
npm run typecheck  # types only
```

## Out of scope for v1

Rest timer · plate calculator · RPE/notes per set · multiple programs · CSV export ·
deload/auto-progression. The schema leaves room for all of these.
# workout_tracker
# workout_tracker
