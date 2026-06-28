import { fmtWeight } from '../lib/logic'

interface StepperProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  step: number
  min?: number
  /** Decimal entry for weight, integer for reps. */
  decimal?: boolean
  suffix?: string
}

/**
 * Big +/- stepper with a tappable number field in the middle.
 * Designed for one-thumb gym use: 44px+ targets, no spinner chrome.
 */
export default function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  decimal = false,
  suffix,
}: StepperProps) {
  const bump = (dir: 1 | -1) => {
    const base = value ?? 0
    const next = Math.max(min, Math.round((base + dir * step) * 100) / 100)
    onChange(next)
  }

  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex items-stretch overflow-hidden rounded-xl ring-1 ring-slate-700">
        <button
          type="button"
          aria-label={`decrease ${label}`}
          onClick={() => bump(-1)}
          className="flex h-12 w-11 items-center justify-center bg-slate-800 text-2xl text-slate-300 active:bg-slate-700"
        >
          −
        </button>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value == null ? '' : decimal ? fmtWeight(value) : value}
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (raw === '') return onChange(null)
            const n = decimal ? parseFloat(raw) : parseInt(raw, 10)
            onChange(Number.isNaN(n) ? null : n)
          }}
          placeholder="—"
          className="h-12 w-16 bg-slate-900 text-center text-lg font-semibold text-white outline-none"
        />
        <button
          type="button"
          aria-label={`increase ${label}`}
          onClick={() => bump(1)}
          className="flex h-12 w-11 items-center justify-center bg-slate-800 text-2xl text-slate-300 active:bg-slate-700"
        >
          +
        </button>
      </div>
      {suffix && <span className="mt-1 text-[11px] text-slate-500">{suffix}</span>}
    </div>
  )
}
