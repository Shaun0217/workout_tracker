import { useCallback, useEffect, useRef, useState } from 'react'
import {
  finishWorkout,
  getAllTimeBestE1rmBeforeToday,
  getLastPerformance,
  getTemplateExercises,
  getWorkout,
  getWorkoutSets,
  insertSet,
  updateSet,
  deleteSet,
} from '../lib/queries'
import { prefillForSet } from '../lib/logic'
import type {
  TemplateExerciseWithExercise,
  Workout,
  WorkoutSet,
} from '../lib/types'

export interface Slot {
  uid: string // stable client-side id (survives renumbering)
  id: string | null // DB row id once persisted
  setNumber: number
  weight: number | null
  reps: number | null
  completed: boolean
}

export interface SessionExercise {
  templateExerciseId: string
  exerciseId: string
  name: string
  category: string | null
  unit: string
  perSide: boolean
  targetSets: number
  repLow: number | null
  repHigh: number | null
  lastSets: Pick<WorkoutSet, 'set_number' | 'weight' | 'reps'>[]
  prBest: number | null // best e1RM before today
  slots: Slot[]
}

const newUid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `s_${Date.now()}_${Math.random().toString(36).slice(2)}`

export function useSession(workoutId: string) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [finishing, setFinishing] = useState(false)

  // refs for reading latest state inside async write chains
  const exRef = useRef<SessionExercise[]>([])
  exRef.current = exercises
  const chainRef = useRef<Record<string, Promise<void>>>({})
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // --- load ---------------------------------------------------------------
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const w = await getWorkout(workoutId)
        if (!w) throw new Error('Workout not found')
        if (!w.template_id)
          throw new Error('This workout has no template attached')

        const [tmplExs, existing] = await Promise.all([
          getTemplateExercises(w.template_id),
          getWorkoutSets(workoutId),
        ])

        const built = await Promise.all(
          tmplExs.map((te) => buildExercise(te, existing, workoutId)),
        )
        if (!alive) return
        setWorkout(w)
        setExercises(built)
      } catch (e) {
        if (alive) setError(e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [workoutId])

  // --- helpers ------------------------------------------------------------
  const findSlot = (uid: string): { exIdx: number; slotIdx: number } | null => {
    const exs = exRef.current
    for (let i = 0; i < exs.length; i++) {
      const j = exs[i].slots.findIndex((s) => s.uid === uid)
      if (j >= 0) return { exIdx: i, slotIdx: j }
    }
    return null
  }

  /** Serialize writes per slot so we never double-insert. Persists full slot. */
  const persist = useCallback(
    (uid: string) => {
      const prev = chainRef.current[uid] ?? Promise.resolve()
      const next = prev.then(async () => {
        const loc = findSlot(uid)
        if (!loc) return
        const ex = exRef.current[loc.exIdx]
        const slot = ex.slots[loc.slotIdx]
        const payload = {
          weight: slot.weight,
          reps: slot.reps,
          completed: slot.completed,
        }
        if (slot.id) {
          await updateSet(slot.id, payload)
        } else {
          const row = await insertSet({
            workout_id: workoutId,
            exercise_id: ex.exerciseId,
            set_number: slot.setNumber,
            ...payload,
          })
          setExercises((cur) =>
            cur.map((e) =>
              e.exerciseId !== ex.exerciseId
                ? e
                : {
                    ...e,
                    slots: e.slots.map((s) =>
                      s.uid === uid ? { ...s, id: row.id } : s,
                    ),
                  },
            ),
          )
        }
      })
      chainRef.current[uid] = next.catch((e) => {
        console.error('set save failed', e)
      })
      return chainRef.current[uid]
    },
    [workoutId],
  )

  const debouncedPersist = useCallback(
    (uid: string) => {
      clearTimeout(debounceRef.current[uid])
      debounceRef.current[uid] = setTimeout(() => {
        delete debounceRef.current[uid]
        void persist(uid)
      }, 500)
    },
    [persist],
  )

  const patchSlot = (uid: string, patch: Partial<Slot>) => {
    setExercises((cur) =>
      cur.map((e) => ({
        ...e,
        slots: e.slots.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
      })),
    )
  }

  // --- actions ------------------------------------------------------------
  const setWeight = (uid: string, weight: number | null) => {
    patchSlot(uid, { weight })
    debouncedPersist(uid)
  }
  const setReps = (uid: string, reps: number | null) => {
    patchSlot(uid, { reps })
    debouncedPersist(uid)
  }
  const toggleDone = (uid: string) => {
    const loc = findSlot(uid)
    if (!loc) return
    const current = exRef.current[loc.exIdx].slots[loc.slotIdx].completed
    clearTimeout(debounceRef.current[uid])
    delete debounceRef.current[uid]
    patchSlot(uid, { completed: !current })
    void persist(uid)
  }

  const addSet = (exerciseId: string) => {
    setExercises((cur) =>
      cur.map((e) => {
        if (e.exerciseId !== exerciseId) return e
        const setNumber = e.slots.length + 1
        const pre = prefillForSet(setNumber, e.lastSets)
        return {
          ...e,
          slots: [
            ...e.slots,
            {
              uid: newUid(),
              id: null,
              setNumber,
              weight: pre.weight,
              reps: pre.reps,
              completed: false,
            },
          ],
        }
      }),
    )
  }

  const removeSet = (uid: string) => {
    const loc = findSlot(uid)
    if (!loc) return
    const ex = exRef.current[loc.exIdx]
    const slot = ex.slots[loc.slotIdx]
    clearTimeout(debounceRef.current[uid])
    delete debounceRef.current[uid]

    // delete the row (if persisted), then renumber the survivors
    if (slot.id) void deleteSet(slot.id).catch((e) => console.error(e))

    setExercises((cur) =>
      cur.map((e) => {
        if (e.exerciseId !== ex.exerciseId) return e
        const remaining = e.slots
          .filter((s) => s.uid !== uid)
          .map((s, i) => ({ ...s, setNumber: i + 1 }))
        return { ...e, slots: remaining }
      }),
    )
    // persist renumbered survivors that already exist in the DB
    setTimeout(() => {
      const e = exRef.current.find((x) => x.exerciseId === ex.exerciseId)
      e?.slots.forEach((s) => {
        if (s.id) void persist(s.uid)
      })
    }, 0)
  }

  const finish = useCallback(async (): Promise<boolean> => {
    setFinishing(true)
    try {
      // flush any debounced edits, then wait for all pending writes
      for (const uid of Object.keys(debounceRef.current)) {
        clearTimeout(debounceRef.current[uid])
        delete debounceRef.current[uid]
        void persist(uid)
      }
      await Promise.all(Object.values(chainRef.current))
      await finishWorkout(workoutId)
      return true
    } catch (e) {
      setError(e)
      setFinishing(false)
      return false
    }
  }, [persist, workoutId])

  return {
    workout,
    exercises,
    loading,
    error,
    finishing,
    setWeight,
    setReps,
    toggleDone,
    addSet,
    removeSet,
    finish,
  }
}

async function buildExercise(
  te: TemplateExerciseWithExercise,
  existing: WorkoutSet[],
  workoutId: string,
): Promise<SessionExercise> {
  const [lastSets, prBest] = await Promise.all([
    getLastPerformance(te.exercise_id, workoutId),
    getAllTimeBestE1rmBeforeToday(te.exercise_id),
  ])
  const last = lastSets ?? []

  const mine = existing
    .filter((s) => s.exercise_id === te.exercise_id)
    .sort((a, b) => a.set_number - b.set_number)

  let slots: Slot[]
  if (mine.length > 0) {
    slots = mine.map((s) => ({
      uid: newUid(),
      id: s.id,
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
      completed: s.completed,
    }))
  } else {
    slots = Array.from({ length: te.target_sets }, (_, i) => {
      const setNumber = i + 1
      const pre = prefillForSet(setNumber, last)
      return {
        uid: newUid(),
        id: null,
        setNumber,
        weight: pre.weight,
        reps: pre.reps,
        completed: false,
      }
    })
  }

  return {
    templateExerciseId: te.id,
    exerciseId: te.exercise_id,
    name: te.exercise.name,
    category: te.exercise.category,
    unit: te.exercise.unit,
    perSide: te.exercise.per_side,
    targetSets: te.target_sets,
    repLow: te.rep_low,
    repHigh: te.rep_high,
    lastSets: last,
    prBest,
    slots,
  }
}
