// Lightweight beep + haptic for the rest timer. No audio assets needed.
// iOS only allows audio after a user gesture, so we create/resume the
// AudioContext from `unlockAudio()` (called when a set is tapped done) and
// reuse it for the later beep.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

/** Prime/resume the audio context during a user gesture. */
export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

/** Two short rising beeps when rest is over. */
export function playBeep(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume().catch(() => {})
  const t = c.currentTime
  ;[0, 0.22].forEach((offset, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.value = i === 0 ? 784 : 1046 // G5 then C6
    const start = t + offset
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

/** Best-effort haptic (Android; no-op on iOS Safari). */
export function vibrate(): void {
  try {
    navigator.vibrate?.([120, 60, 120])
  } catch {
    /* ignore */
  }
}
