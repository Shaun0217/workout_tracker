-- ============================================================
-- Workout Tracker — schema
-- Run this first in the Supabase SQL editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- Exercise catalog (one row per unique movement)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,                           -- 'push' | 'pull' | 'legs' | 'core'
  unit text not null default 'lb',         -- 'lb' | 'kg'
  per_side boolean not null default false, -- true for unilateral (lunges, Bulgarians)
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Workout templates: Upper A / Lower A / Upper B / Lower B
create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Prescribed exercises inside a template (sets + rep range)
create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references workout_templates(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  position int not null default 0,
  target_sets int not null,
  rep_low int,
  rep_high int,
  unique (template_id, exercise_id)
);

-- A logged session
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references workout_templates(id) on delete set null,
  name text,                               -- snapshot of template name at log time
  performed_on date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

-- Logged sets
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number int not null,
  weight numeric(6,2),
  reps int,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Bodyweight log (one entry per day)
create table bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  weight numeric(6,2) not null,
  notes text,
  unique (user_id, logged_on)
);

-- Indexes for the hot paths
create index idx_sets_user_ex on workout_sets(user_id, exercise_id, created_at desc);
create index idx_sets_workout on workout_sets(workout_id);
create index idx_workouts_user_date on workouts(user_id, performed_on desc);
create index idx_bw_user_date on bodyweight_logs(user_id, logged_on desc);
create index idx_tmpl_ex_template on template_exercises(template_id);
