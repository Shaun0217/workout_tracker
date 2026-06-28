import { useState } from 'react'
import { useAsync } from '../lib/useAsync'
import {
  getCompletedWorkouts,
  getExercises,
  getWorkoutSets,
} from '../lib/queries'
import { fmtDate } from '../lib/dates'
import { fmtWeight } from '../lib/logic'
import type { Exercise, WorkoutSet } from '../lib/types'
import {
  EmptyState,
  ErrorNote,
  PageContainer,
  ScreenHeader,
  Spinner,
} from '../components/ui'

export default function History() {
  const state = useAsync(async () => {
    const [workouts, exercises] = await Promise.all([
      getCompletedWorkouts(60),
      getExercises(),
    ])
    const byId = new Map(exercises.map((e) => [e.id, e]))
    return { workouts, byId }
  }, [])

  if (state.loading) return <Spinner label="Loading history…" />
  if (state.error) return <ErrorNote error={state.error} />
  const { workouts, byId } = state.data!

  return (
    <PageContainer>
      <ScreenHeader title="History" />
      {workouts.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No finished workouts yet"
          subtitle="Completed sessions show up here."
        />
      ) : (
        <ul className="space-y-2 p-4">
          {workouts.map((w) => (
            <WorkoutRow
              key={w.id}
              id={w.id}
              name={w.name ?? 'Workout'}
              date={fmtDate(w.performed_on)}
              byId={byId}
            />
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

function WorkoutRow({
  id,
  name,
  date,
  byId,
}: {
  id: string
  name: string
  date: string
  byId: Map<string, Exercise>
}) {
  const [open, setOpen] = useState(false)
  const [sets, setSets] = useState<WorkoutSet[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && sets == null) {
      setLoading(true)
      try {
        const data = await getWorkoutSets(id)
        setSets(data.filter((x) => x.completed))
      } finally {
        setLoading(false)
      }
    }
  }

  // group sets by exercise, preserving first-seen order
  const groups: { exId: string; sets: WorkoutSet[] }[] = []
  if (sets) {
    const idx = new Map<string, number>()
    for (const s of sets) {
      if (!idx.has(s.exercise_id)) {
        idx.set(s.exercise_id, groups.length)
        groups.push({ exId: s.exercise_id, sets: [] })
      }
      groups[idx.get(s.exercise_id)!].sets.push(s)
    }
  }

  return (
    <li className="overflow-hidden rounded-xl bg-slate-800/60 ring-1 ring-slate-700">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-slate-800"
      >
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="text-sm text-slate-400">{date}</p>
        </div>
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-700 px-4 py-3">
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {sets && sets.length === 0 && (
            <p className="text-sm text-slate-500">No completed sets.</p>
          )}
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.exId}>
                <p className="text-sm font-medium text-slate-200">
                  {byId.get(g.exId)?.name ?? 'Exercise'}
                </p>
                <p className="text-sm text-slate-400">
                  {g.sets
                    .map((s) => `${fmtWeight(s.weight)}×${s.reps ?? '—'}`)
                    .join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}
