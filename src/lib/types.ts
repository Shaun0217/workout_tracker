// Hand-written types matching the Supabase schema in /supabase.
// (For a larger app you'd generate these with `supabase gen types`.)

export type Category = 'push' | 'pull' | 'legs' | 'core'
export type Unit = 'lb' | 'kg'

export interface Exercise {
  id: string
  user_id: string
  name: string
  category: Category | null
  unit: Unit
  per_side: boolean
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  position: number
  target_sets: number
  rep_low: number | null
  rep_high: number | null
}

export interface Workout {
  id: string
  user_id: string
  template_id: string | null
  name: string | null
  performed_on: string
  started_at: string
  completed_at: string | null
  notes: string | null
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  user_id: string
  set_number: number
  weight: number | null
  reps: number | null
  completed: boolean
  created_at: string
}

export interface BodyweightLog {
  id: string
  user_id: string
  logged_on: string
  weight: number
  notes: string | null
}

// A template exercise joined with its catalog exercise, used on the session screen.
export interface TemplateExerciseWithExercise extends TemplateExercise {
  exercise: Exercise
}
