import type { WorkoutSet } from './types'

/** Estimated 1-rep max (Epley). */
export const e1rm = (weight: number, reps: number): number =>
  weight * (1 + reps / 30)

/** e1RM for a set, or null if it has no usable weight/reps. */
export function setE1rm(set: Pick<WorkoutSet, 'weight' | 'reps'>): number | null {
  if (set.weight == null || set.reps == null || set.reps <= 0) return null
  return e1rm(set.weight, set.reps)
}

/** Max e1RM across a list of sets (the chart point for a day). */
export function bestE1rm(
  sets: Pick<WorkoutSet, 'weight' | 'reps'>[],
): number | null {
  let best: number | null = null
  for (const s of sets) {
    const v = setE1rm(s)
    if (v != null && (best == null || v > best)) best = v
  }
  return best
}

/** Heaviest top-set weight across a list of sets. */
export function topSetWeight(
  sets: Pick<WorkoutSet, 'weight' | 'reps'>[],
): number | null {
  let best: number | null = null
  for (const s of sets) {
    if (s.weight != null && (best == null || s.weight > best)) best = s.weight
  }
  return best
}

/** Render a number without trailing ".00" — 135 not 135.00, 137.5 stays. */
export function fmtWeight(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}

/** "135×8, 135×8, 135×7" from a set list. */
export function fmtSetLine(
  sets: Pick<WorkoutSet, 'weight' | 'reps'>[],
): string {
  return sets
    .filter((s) => s.weight != null || s.reps != null)
    .map((s) => `${fmtWeight(s.weight)}×${s.reps ?? '—'}`)
    .join(', ')
}

/**
 * Prefill rule: new set N defaults to last time's set N. If last time had
 * fewer sets, default to its final set's values.
 */
export function prefillForSet(
  setNumber: number,
  lastSets: Pick<WorkoutSet, 'set_number' | 'weight' | 'reps'>[],
): { weight: number | null; reps: number | null } {
  if (lastSets.length === 0) return { weight: null, reps: null }
  const exact = lastSets.find((s) => s.set_number === setNumber)
  const src = exact ?? lastSets[lastSets.length - 1]
  return { weight: src.weight ?? null, reps: src.reps ?? null }
}
