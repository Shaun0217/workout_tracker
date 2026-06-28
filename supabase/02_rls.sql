-- ============================================================
-- Workout Tracker — Row Level Security
-- Run this after 01_schema.sql.
-- ============================================================

alter table exercises enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table bodyweight_logs enable row level security;

-- Owner-only access on user-owned tables
create policy "own_exercises" on exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_templates" on workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_workouts" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_sets" on workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_bodyweight" on bodyweight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- template_exercises has no user_id; gate through parent template
create policy "own_template_exercises" on template_exercises
  for all using (
    exists (select 1 from workout_templates t
            where t.id = template_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from workout_templates t
            where t.id = template_id and t.user_id = auth.uid())
  );
