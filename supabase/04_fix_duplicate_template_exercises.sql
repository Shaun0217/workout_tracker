-- ============================================================
-- One-time fix: remove duplicated template_exercises rows and add the
-- unique constraint that prevents it from happening again.
--
-- Run this once in the Supabase SQL editor if your templates show each
-- exercise twice. Safe to run again (idempotent).
-- ============================================================

-- 1. Delete duplicate rows, keeping the earliest id per (template, exercise).
delete from template_exercises t
using template_exercises d
where t.template_id = d.template_id
  and t.exercise_id = d.exercise_id
  and t.id > d.id;

-- 2. Add the unique constraint (no-op if it already exists).
do $$
begin
  alter table template_exercises
    add constraint template_exercises_template_id_exercise_id_key
    unique (template_id, exercise_id);
exception
  when duplicate_table then null;  -- constraint already present
  when duplicate_object then null;
end $$;
