import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { useAsync } from '../lib/useAsync'
import {
  getActiveWorkout,
  getBodyweightLogs,
  getRecentWorkouts,
  getTemplates,
  startWorkout,
} from '../lib/queries'
import type { WorkoutTemplate } from '../lib/types'
import { fmtWeight } from '../lib/logic'
import { relativeDay } from '../lib/dates'
import { ErrorNote, PageContainer, Spinner } from '../components/ui'

const templateColors: Record<string, string> = {
  'Upper A': 'from-blue-600 to-blue-500',
  'Lower A': 'from-emerald-600 to-emerald-500',
  'Upper B': 'from-violet-600 to-violet-500',
  'Lower B': 'from-amber-600 to-amber-500',
}

export default function Home() {
  const navigate = useNavigate()
  const [starting, setStarting] = useState<string | null>(null)

  const state = useAsync(
    async () => {
      const [templates, recent, active, bw] = await Promise.all([
        getTemplates(),
        getRecentWorkouts(5),
        getActiveWorkout(),
        getBodyweightLogs(14),
      ])
      return { templates, recent, active, bw }
    },
    [],
  )

  async function begin(t: WorkoutTemplate) {
    try {
      setStarting(t.id)
      // Resume an in-progress session for the same template instead of duplicating.
      const active = state.data?.active
      if (active && active.template_id === t.id) {
        navigate(`/session/${active.id}`)
        return
      }
      const w = await startWorkout(t)
      navigate(`/session/${w.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
      setStarting(null)
    }
  }

  if (state.loading) return <Spinner label="Loading…" />
  if (state.error) return <ErrorNote error={state.error} />
  const { templates, recent, active, bw } = state.data!

  // bodyweight sparkline wants oldest→newest
  const bwAsc = [...bw].reverse().map((b) => ({ x: b.logged_on, y: b.weight }))
  const latestBw = bw[0]

  return (
    <PageContainer>
      <header className="safe-top px-4 pb-4">
        <h1 className="text-2xl font-bold text-white">Lift</h1>
        <p className="text-sm text-slate-400">What are we beating today?</p>
      </header>

      {active && (
        <button
          onClick={() => navigate(`/session/${active.id}`)}
          className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-xl bg-blue-950 px-4 py-3 text-left ring-1 ring-blue-800 active:bg-blue-900"
        >
          <span>
            <span className="block text-xs font-medium uppercase tracking-wide text-blue-400">
              In progress
            </span>
            <span className="text-base font-semibold text-white">
              {active.name ?? 'Workout'}
            </span>
          </span>
          <span className="text-blue-300">Resume →</span>
        </button>
      )}

      <section className="grid grid-cols-2 gap-3 px-4">
        {templates.map((t) => (
          <button
            key={t.id}
            disabled={starting != null}
            onClick={() => begin(t)}
            className={`flex aspect-[4/3] flex-col justify-end rounded-2xl bg-gradient-to-br p-4 text-left shadow-lg active:scale-[0.98] disabled:opacity-60 ${
              templateColors[t.name] ?? 'from-slate-600 to-slate-500'
            }`}
          >
            <span className="text-lg font-bold text-white">{t.name}</span>
            <span className="text-xs text-white/80">
              {starting === t.id ? 'Starting…' : 'Start workout'}
            </span>
          </button>
        ))}
      </section>

      {/* Bodyweight card */}
      <section className="mt-4 px-4">
        <button
          onClick={() => navigate('/bodyweight')}
          className="flex w-full items-center justify-between rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700 active:bg-slate-800"
        >
          <div className="text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Bodyweight
            </p>
            <p className="text-xl font-bold text-white">
              {latestBw ? `${fmtWeight(latestBw.weight)} lb` : 'Not logged'}
            </p>
            {latestBw && (
              <p className="text-xs text-slate-500">
                {relativeDay(latestBw.logged_on)}
              </p>
            )}
          </div>
          {bwAsc.length > 1 && (
            <div className="h-12 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bwAsc}>
                  <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </button>
      </section>

      {/* Recent workouts */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Recent
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">
            No workouts yet. Tap a card above to start your first one.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 ring-1 ring-slate-700"
              >
                <span className="font-medium text-white">
                  {w.name ?? 'Workout'}
                </span>
                <span className="text-sm text-slate-400">
                  {relativeDay(w.performed_on)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  )
}
