import { REST_PRESETS, type RestTimer as RestTimerState } from '../lib/useRestTimer'

function mmss(s: number): string {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

export default function RestTimer({ timer }: { timer: RestTimerState }) {
  const { remaining, total, finished, duration } = timer
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0

  return (
    <div
      className={`mb-2 rounded-2xl p-3 ring-1 ${
        finished
          ? 'bg-emerald-950/60 ring-emerald-700'
          : 'bg-slate-800 ring-slate-700'
      }`}
    >
      <div className="mb-1.5 flex items-baseline justify-between">
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            finished ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {finished ? 'Rest complete' : 'Resting'}
        </span>
        <span
          className={`text-2xl font-bold tabular-nums ${
            finished ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {mmss(remaining)}
        </span>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${
            finished ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${finished ? 100 : pct}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => timer.addTime(-15)}
          className="h-9 rounded-lg bg-slate-700 px-3 text-sm font-medium text-slate-200 active:bg-slate-600"
        >
          −15s
        </button>
        <button
          onClick={() => timer.addTime(15)}
          className="h-9 rounded-lg bg-slate-700 px-3 text-sm font-medium text-slate-200 active:bg-slate-600"
        >
          +15s
        </button>
        <button
          onClick={timer.skip}
          className={`ml-auto h-9 rounded-lg px-4 text-sm font-semibold ${
            finished
              ? 'bg-emerald-600 text-white active:bg-emerald-700'
              : 'bg-slate-700 text-slate-200 active:bg-slate-600'
          }`}
        >
          {finished ? 'Done' : 'Skip'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="mr-1 text-[11px] text-slate-500">Default</span>
        {REST_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => timer.setDuration(p)}
            className={`h-7 rounded-md px-2 text-xs font-medium tabular-nums ${
              duration === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/60 text-slate-300 active:bg-slate-700'
            }`}
          >
            {mmss(p)}
          </button>
        ))}
      </div>
    </div>
  )
}
