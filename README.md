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
3. **Create the single app user** (the app auto-logs-in as this account — no login screen,
   no email): **Authentication → Users → Add user**, enter an email + password, and check
   **Auto Confirm User**. Remember these — they go in your env vars below.

The app calls `seed_default_program()` automatically on first load (only if you have no
templates yet), creating the 4 templates and 21 exercises.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the four VITE_ values
npm run dev
```

Open the printed URL — it signs in automatically and goes straight to the four workout cards
(seeding the program on first run).

`.env.local` needs:
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — from **Supabase → Project Settings → API**.
  The anon key is safe in the client because RLS restricts every row to its owner. **Never**
  ship the `service_role` key.
- `VITE_APP_AUTH_EMAIL` + `VITE_APP_AUTH_PASSWORD` — the user you created in step 1.3.

> **Auth model:** this is a personal, single-user app. Instead of a login screen it signs in
> with one fixed account whose credentials live in env vars. Those get bundled into the
> client, so they're not truly secret — fine here because RLS still gates the database and the
> data is just your own workout logs. Don't reuse a password you use elsewhere.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (it auto-detects Vite — build `npm run build`, output `dist`).
3. Add all four env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_APP_AUTH_EMAIL`, `VITE_APP_AUTH_PASSWORD` (apply to Production). **Redeploy** after
   adding them — env changes don't rebuild an existing deployment.
4. Make sure **Deployment Protection** is off (Settings → Deployment Protection) so the app
   is reachable on your phone without a Vercel login.

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
