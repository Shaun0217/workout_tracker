import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Stepper from '../components/Stepper'
import RestTimer from '../components/RestTimer'
import { ErrorNote, Spinner } from '../components/ui'
import { fmtSetLine, setE1rm } from '../lib/logic'
import { useRestTimer } from '../lib/useRestTimer'
import { useSession, type SessionExercise, type Slot } from './useSession'

export default function ActiveSession() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const s = useSession(workoutId!)
  const rest = useRestTimer()

  // Start a rest only when a set transitions into "done".
  const toggleDone = s.toggleDone
  const exercises = s.exercises
  const handleToggle = useCallback(
    (uid: string) => {
      const slot = exercises
        .flatMap((e) => e.slots)
        .find((sl) => sl.uid === uid)
      if (slot && !slot.completed) rest.start()
      toggleDone(uid)
    },
    [exercises, rest, toggleDone],
  )

  if (s.loading) return <Spinner label="Loading session…" />
  if (s.error) return <ErrorNote error={s.error} />

  async function onFinish() {
    const ok = await s.finish()
    if (ok) navigate('/', { replace: true })
  }

  const completedCount = s.exercises.reduce(
    (n, e) => n + e.slots.filter((sl) => sl.completed).length,
    0,
  )

  return (
    <div className="mx-auto min-h-full max-w-2xl pb-28">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/85 px-4 pb-3 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-slate-400 active:text-slate-200"
        >
          ← Home
        </button>
        <h1 className="text-base font-bold text-white">
          {s.workout?.name ?? 'Workout'}
        </h1>
        <span className="text-sm text-slate-500">{completedCount} sets</span>
      </header>

      <div className="space-y-4 px-3 pt-4">
        {s.exercises.map((ex) => (
          <ExerciseCard
            key={ex.templateExerciseId}
            ex={ex}
            onWeight={s.setWeight}
            onReps={s.setReps}
            onToggle={handleToggle}
            onAdd={() => s.addSet(ex.exerciseId)}
            onRemove={s.removeSet}
          />
        ))}
      </div>

      {/* Sticky finish bar (with the rest timer stacked above it when active) */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-900/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {rest.active && <RestTimer timer={rest} />}
          <button
            onClick={onFinish}
            disabled={s.finishing}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white active:bg-emerald-700 disabled:opacity-60"
          >
            {s.finishing ? 'Finishing…' : 'Finish workout'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExerciseCard({
  ex,
  onWeight,
  onReps,
  onToggle,
  onAdd,
  onRemove,
}: {
  ex: SessionExercise
  onWeight: (uid: string, v: number | null) => void
  onReps: (uid: string, v: number | null) => void
  onToggle: (uid: string) => void
  onAdd: () => void
  onRemove: (uid: string) => void
}) {
  const repRange =
    ex.repLow != null && ex.repHigh != null
      ? `${ex.repLow}–${ex.repHigh}`
      : ex.repLow != null
        ? `${ex.repLow}+`
        : ''
  const target = `${ex.targetSets} × ${repRange}`.trim()

  return (
    <section className="rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-base font-bold text-white">
          {ex.name}
          {ex.perSide && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              (per leg)
            </span>
          )}
        </h2>
        <span className="text-sm text-slate-400">{target}</span>
      </div>

      <p className="mb-3 px-1 text-xs text-slate-400">
        {ex.lastSets.length > 0 ? (
          <>
            <span className="font-medium text-slate-500">Last time:</span>{' '}
            {fmtSetLine(ex.lastSets)}
          </>
        ) : (
          <span className="text-slate-500">No previous data — set the pace.</span>
        )}
      </p>

      <ul className="space-y-2">
        {ex.slots.map((slot) => (
          <SetRow
            key={slot.uid}
            slot={slot}
            unit={ex.unit}
            prBest={ex.prBest}
            onWeight={(v) => onWeight(slot.uid, v)}
            onReps={(v) => onReps(slot.uid, v)}
            onToggle={() => onToggle(slot.uid)}
            onRemove={() => onRemove(slot.uid)}
          />
        ))}
      </ul>

      <button
        onClick={onAdd}
        className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-blue-400 ring-1 ring-slate-700 active:bg-slate-800"
      >
        + Add set
      </button>
    </section>
  )
}

function SetRow({
  slot,
  unit,
  prBest,
  onWeight,
  onReps,
  onToggle,
  onRemove,
}: {
  slot: Slot
  unit: string
  prBest: number | null
  onWeight: (v: number | null) => void
  onReps: (v: number | null) => void
  onToggle: () => void
  onRemove: () => void
}) {
  const e1 = setE1rm(slot)
  const isPR = slot.completed && e1 != null && (prBest == null || e1 > prBest)

  return (
    <li
      className={`flex items-center gap-2 rounded-xl p-2 ${
        slot.completed ? 'bg-emerald-950/40 ring-1 ring-emerald-800' : 'bg-slate-900/60'
      }`}
    >
      <span className="ml-1 w-5 text-center text-sm font-semibold text-slate-500">
        {slot.setNumber}
      </span>

      <Stepper
        label={unit}
        value={slot.weight}
        onChange={onWeight}
        step={5}
        decimal
      />
      <Stepper label="reps" value={slot.reps} onChange={onReps} step={1} />

      {isPR && (
        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
          PR
        </span>
      )}

      <button
        onClick={onToggle}
        aria-label={slot.completed ? 'mark set not done' : 'mark set done'}
        className={`ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
          slot.completed
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-slate-400 active:bg-slate-600'
        }`}
      >
        ✓
      </button>

      <button
        onClick={onRemove}
        aria-label="remove set"
        className="flex h-12 w-7 shrink-0 items-center justify-center text-lg text-slate-600 active:text-red-400"
      >
        ×
      </button>
    </li>
  )
}
