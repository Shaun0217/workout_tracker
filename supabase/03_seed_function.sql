-- ============================================================
-- Workout Tracker — default program seed function
-- Run after 02_rls.sql. The app calls `select seed_default_program();`
-- once, on first login, when the user has no templates.
-- Runs as the authenticated user (security invoker) so RLS is
-- respected and every row gets the right user_id.
-- ============================================================

create or replace function seed_default_program()
returns void language plpgsql security invoker as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into workout_templates(user_id,name,position) values
    (uid,'Upper A',1),(uid,'Lower A',2),(uid,'Upper B',3),(uid,'Lower B',4)
  on conflict (user_id,name) do nothing;

  insert into exercises(user_id,name,category,unit,per_side) values
    (uid,'Bench Press','push','lb',false),
    (uid,'Overhead Press','push','lb',false),
    (uid,'Pull-ups','pull','lb',false),
    (uid,'Incline DB Press','push','lb',false),
    (uid,'Lateral Raises','push','lb',false),
    (uid,'Triceps Pushdown','push','lb',false),
    (uid,'Back Squat','legs','lb',false),
    (uid,'Romanian Deadlift','legs','lb',false),
    (uid,'Walking Lunges','legs','lb',true),
    (uid,'Leg Curl','legs','lb',false),
    (uid,'Standing Calf Raise','legs','lb',false),
    (uid,'Barbell Row','pull','lb',false),
    (uid,'Lat Pulldown','pull','lb',false),
    (uid,'Face Pulls','pull','lb',false),
    (uid,'DB Curls','pull','lb',false),
    (uid,'Hammer Curls','pull','lb',false),
    (uid,'Deadlift','legs','lb',false),
    (uid,'Bulgarian Split Squats','legs','lb',true),
    (uid,'Leg Press','legs','lb',false),
    (uid,'Hanging Leg Raises','core','lb',false),
    (uid,'Seated Calf Raise','legs','lb',false)
  on conflict (user_id,name) do nothing;

  insert into template_exercises(template_id,exercise_id,position,target_sets,rep_low,rep_high)
  select t.id, e.id, v.position, v.sets, v.rep_low, v.rep_high
  from (values
    -- Upper A (push focus)
    ('Upper A','Bench Press',1,4,6,8),
    ('Upper A','Overhead Press',2,3,8,10),
    ('Upper A','Pull-ups',3,4,6,10),
    ('Upper A','Incline DB Press',4,3,10,12),
    ('Upper A','Lateral Raises',5,3,12,15),
    ('Upper A','Triceps Pushdown',6,3,12,15),
    -- Lower A
    ('Lower A','Back Squat',1,4,6,8),
    ('Lower A','Romanian Deadlift',2,3,8,10),
    ('Lower A','Walking Lunges',3,3,10,12),
    ('Lower A','Leg Curl',4,3,12,15),
    ('Lower A','Standing Calf Raise',5,4,12,20),
    -- Upper B (pull focus)
    ('Upper B','Barbell Row',1,4,8,10),
    ('Upper B','Lat Pulldown',2,3,10,12),
    ('Upper B','Incline DB Press',3,3,8,10),
    ('Upper B','Face Pulls',4,3,15,20),
    ('Upper B','DB Curls',5,3,10,12),
    ('Upper B','Hammer Curls',6,3,12,15),
    -- Lower B
    ('Lower B','Deadlift',1,4,4,6),
    ('Lower B','Bulgarian Split Squats',2,3,8,10),
    ('Lower B','Leg Press',3,3,12,15),
    ('Lower B','Leg Curl',4,3,12,15),
    ('Lower B','Hanging Leg Raises',5,3,12,15),
    ('Lower B','Seated Calf Raise',6,4,15,20)
  ) as v(template_name,exercise_name,position,sets,rep_low,rep_high)
  join workout_templates t on t.user_id=uid and t.name=v.template_name
  join exercises e on e.user_id=uid and e.name=v.exercise_name
  on conflict (template_id, exercise_id) do nothing;
end;
$$;
