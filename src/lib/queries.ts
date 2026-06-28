import { supabase } from './supabase'
import { setE1rm } from './logic'
import { todayISO } from './dates'
import type {
  BodyweightLog,
  Exercise,
  TemplateExerciseWithExercise,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from './types'

// ---------------------------------------------------------------------------
// Program setup
// ---------------------------------------------------------------------------

let seedInFlight: Promise<void> | null = null

/** Seed the default program once, if the user has no templates yet. */
export async function ensureSeeded(): Promise<void> {
  // Guard against React StrictMode double-invoking the seed effect: share a
  // single in-flight promise so we never fire two concurrent seeds.
  if (seedInFlight) return seedInFlight
  seedInFlight = (async () => {
    const { count, error } = await supabase
      .from('workout_templates')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    if ((count ?? 0) > 0) return
    const { error: seedErr } = await supabase.rpc('seed_default_program')
    if (seedErr) throw seedErr
  })()
  try {
    await seedInFlight
  } finally {
    seedInFlight = null
  }
}

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .order('position')
  if (error) throw error
  return data ?? []
}

export async function getTemplateExercises(
  templateId: string,
): Promise<TemplateExerciseWithExercise[]> {
  const { data, error } = await supabase
    .from('template_exercises')
    .select('*, exercise:exercises(*)')
    .eq('template_id', templateId)
    .order('position')
  if (error) throw error
  return (data ?? []) as unknown as TemplateExerciseWithExercise[]
}

export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Create a new in-progress workout from a template. */
export async function startWorkout(
  template: WorkoutTemplate,
): Promise<Workout> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: uid,
      template_id: template.id,
      name: template.name,
      performed_on: todayISO(),
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Workout
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Workout) ?? null
}

/** Newest in-progress (not yet completed) workout, if any. */
export async function getActiveWorkout(): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Workout) ?? null
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('exercise_id')
    .order('set_number')
  if (error) throw error
  return (data ?? []) as WorkoutSet[]
}

export async function insertSet(
  row: Pick<
    WorkoutSet,
    'workout_id' | 'exercise_id' | 'set_number'
  > &
    Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>,
): Promise<WorkoutSet> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workout_sets')
    .insert({ ...row, user_id: uid })
    .select('*')
    .single()
  if (error) throw error
  return data as WorkoutSet
}

export async function updateSet(
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>,
): Promise<void> {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id)
  if (error) throw error
}

export async function finishWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Delete a workout (and its sets, via cascade). */
export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// "Last time" + PR detection
// ---------------------------------------------------------------------------

/**
 * The most recent prior workout's completed sets for one exercise,
 * excluding the current workout. Returns sets ordered by set_number.
 */
export async function getLastPerformance(
  exerciseId: string,
  currentWorkoutId: string,
): Promise<Pick<WorkoutSet, 'set_number' | 'weight' | 'reps'>[] | null> {
  // 1. find the most recent prior workout containing this exercise.
  //    (Ordering by an embedded to-one column is unreliable in PostgREST, so
  //    we pull the candidate rows and pick the latest workout in JS.)
  const { data: rows, error: rowsErr } = await supabase
    .from('workout_sets')
    .select('workout_id, workouts!inner(performed_on, started_at)')
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
    .neq('workout_id', currentWorkoutId)
  if (rowsErr) throw rowsErr

  const candidates = (rows ?? []) as unknown as Array<{
    workout_id: string
    workouts: { performed_on: string; started_at: string }
  }>
  if (candidates.length === 0) return null

  const latest = candidates.reduce((best, r) => {
    const a = r.workouts
    const b = best.workouts
    if (a.performed_on !== b.performed_on)
      return a.performed_on > b.performed_on ? r : best
    return a.started_at > b.started_at ? r : best
  })

  // 2. fetch that workout's completed sets for this exercise, in order
  const { data: sets, error: setsErr } = await supabase
    .from('workout_sets')
    .select('set_number, weight, reps')
    .eq('workout_id', latest.workout_id)
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
    .order('set_number')
  if (setsErr) throw setsErr
  return (sets ?? []) as Pick<WorkoutSet, 'set_number' | 'weight' | 'reps'>[]
}

/**
 * All-time best e1RM for an exercise from sets logged strictly before today.
 * Used for PR detection — a set logged today beats this to be a PR.
 */
export async function getAllTimeBestE1rmBeforeToday(
  exerciseId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, workouts!inner(performed_on)')
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
  if (error) throw error
  const today = todayISO()
  const rows = (data ?? []) as unknown as Array<{
    weight: number | null
    reps: number | null
    workouts: { performed_on: string }
  }>
  let best: number | null = null
  for (const s of rows) {
    if (s.workouts.performed_on >= today) continue // PR baseline = before today
    const v = setE1rm(s)
    if (v != null && (best == null || v > best)) best = v
  }
  return best
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getCompletedWorkouts(limit = 60): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .not('completed_at', 'is', null)
    .order('performed_on', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Workout[]
}

export async function getRecentWorkouts(limit = 5): Promise<Workout[]> {
  return getCompletedWorkouts(limit)
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface PerformanceRow {
  workout_id: string
  performed_on: string
  sets: Pick<WorkoutSet, 'set_number' | 'weight' | 'reps'>[]
}

/** Every completed set for an exercise, grouped by workout/day, oldest first. */
export async function getExerciseHistory(
  exerciseId: string,
): Promise<PerformanceRow[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('set_number, weight, reps, workout_id, workouts!inner(performed_on)')
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
    .order('set_number')
  if (error) throw error

  const byWorkout = new Map<string, PerformanceRow>()
  for (const r of (data ?? []) as unknown as Array<{
    set_number: number
    weight: number | null
    reps: number | null
    workout_id: string
    workouts: { performed_on: string }
  }>) {
    let row = byWorkout.get(r.workout_id)
    if (!row) {
      row = {
        workout_id: r.workout_id,
        performed_on: r.workouts.performed_on,
        sets: [],
      }
      byWorkout.set(r.workout_id, row)
    }
    row.sets.push({ set_number: r.set_number, weight: r.weight, reps: r.reps })
  }
  return [...byWorkout.values()].sort((a, b) =>
    a.performed_on < b.performed_on ? -1 : a.performed_on > b.performed_on ? 1 : 0,
  )
}

// ---------------------------------------------------------------------------
// Bodyweight
// ---------------------------------------------------------------------------

export async function getBodyweightLogs(limit = 365): Promise<BodyweightLog[]> {
  const { data, error } = await supabase
    .from('bodyweight_logs')
    .select('*')
    .order('logged_on', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as BodyweightLog[]
}

/** Upsert one day's bodyweight (one entry per day). */
export async function logBodyweight(
  weight: number,
  loggedOn: string = todayISO(),
  notes: string | null = null,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('bodyweight_logs')
    .upsert(
      { user_id: uid, logged_on: loggedOn, weight, notes },
      { onConflict: 'user_id,logged_on' },
    )
  if (error) throw error
}
