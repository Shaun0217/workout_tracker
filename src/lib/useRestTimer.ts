import { useCallback, useEffect, useRef, useState } from 'react'
import { playBeep, unlockAudio, vibrate } from './sound'

export const REST_PRESETS = [60, 90, 120, 180] as const
const STORAGE_KEY = 'lift.restDuration'

function loadDuration(): number {
  const v = Number(localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(v) && v > 0 ? v : 120
}

export interface RestTimer {
  active: boolean
  finished: boolean
  remaining: number // whole seconds left
  total: number // length of the current rest (for the progress bar)
  duration: number // default rest length (preference)
  /** Begin a rest. Pass a length, or use the saved default. */
  start: (seconds?: number) => void
  /** Shift the current rest by ±delta seconds. */
  addTime: (delta: number) => void
  /** Set the default rest length (and restart the current rest to match). */
  setDuration: (seconds: number) => void
  /** End the current rest now. */
  skip: () => void
}

/**
 * A countdown rest timer. Tracks an absolute `endsAt` timestamp so it stays
 * correct even if the device sleeps or the tab is backgrounded.
 */
export function useRestTimer(): RestTimer {
  const [duration, setDurationState] = useState(loadDuration)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const notified = useRef(false)

  // tick only while a rest is running
  useEffect(() => {
    if (endsAt == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const remainingMs = endsAt == null ? 0 : Math.max(0, endsAt - now)
  const remaining = Math.ceil(remainingMs / 1000)
  const active = endsAt != null
  const finished = active && remainingMs === 0

  // fire the alert exactly once per rest when it hits zero
  useEffect(() => {
    if (finished && !notified.current) {
      notified.current = true
      playBeep()
      vibrate()
    }
  }, [finished])

  const start = useCallback(
    (seconds?: number) => {
      const len = seconds ?? duration
      unlockAudio() // we're inside the tap gesture — prime audio for the beep
      notified.current = false
      setTotal(len)
      setEndsAt(Date.now() + len * 1000)
      setNow(Date.now())
    },
    [duration],
  )

  const addTime = useCallback((delta: number) => {
    setEndsAt((prev) => {
      if (prev == null) return prev
      const next = Math.max(Date.now(), prev + delta * 1000)
      if (next > Date.now()) notified.current = false // re-arm if extended past 0
      return next
    })
    setTotal((t) => Math.max(15, t + delta))
  }, [])

  const setDuration = useCallback(
    (seconds: number) => {
      localStorage.setItem(STORAGE_KEY, String(seconds))
      setDurationState(seconds)
      if (endsAt != null) start(seconds) // restart current rest to the new length
    },
    [endsAt, start],
  )

  const skip = useCallback(() => {
    setEndsAt(null)
    notified.current = false
  }, [])

  return {
    active,
    finished,
    remaining,
    total,
    duration,
    start,
    addTime,
    setDuration,
    skip,
  }
}
