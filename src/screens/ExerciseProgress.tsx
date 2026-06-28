import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAsync } from '../lib/useAsync'
import { getExercises, getExerciseHistory } from '../lib/queries'
import { bestE1rm, fmtSetLine, fmtWeight, topSetWeight } from '../lib/logic'
import { chartLabel, fmtDate } from '../lib/dates'
import { ErrorNote, PageContainer, Spinner } from '../components/ui'

type Metric = 'e1rm' | 'top'

export default function ExerciseProgress() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  const [metric, setMetric] = useState<Metric>('e1rm')

  const state = useAsync(async () => {
    const [history, exercises] = await Promise.all([
      getExerciseHistory(exerciseId!),
      getExercises(),
    ])
    const exercise = exercises.find((e) => e.id === exerciseId) ?? null
    return { history, exercise }
  }, [exerciseId])

  const points = useMemo(() => {
    if (!state.data) return []
    return state.data.history.map((row) => ({
      date: row.performed_on,
      e1rm:
        bestE1rm(row.sets) != null
          ? Math.round((bestE1rm(row.sets) as number) * 10) / 10
          : null,
      top: topSetWeight(row.sets),
    }))
  }, [state.data])

  if (state.loading) return <Spinner label="Loading…" />
  if (state.error) return <ErrorNote error={state.error} />
  const { history, exercise } = state.data!

  const key = metric === 'e1rm' ? 'e1rm' : 'top'
  const unit = exercise?.unit ?? 'lb'

  return (
    <PageContainer>
      <header className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-900/85 px-4 pb-3 backdrop-blur">
        <button
          onClick={() => navigate('/progress')}
          className="text-sm text-slate-400 active:text-slate-200"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-white">
          {exercise?.name ?? 'Exercise'}
        </h1>
      </header>

      <div className="p-4">
        <div className="mb-3 inline-flex rounded-lg bg-slate-800 p-0.5 ring-1 ring-slate-700">
          <ToggleBtn active={metric === 'e1rm'} onClick={() => setMetric('e1rm')}>
            Est. 1RM
          </ToggleBtn>
          <ToggleBtn active={metric === 'top'} onClick={() => setMetric('top')}>
            Top set
          </ToggleBtn>
        </div>

        {points.length < 2 ? (
          <div className="rounded-xl bg-slate-800/60 p-6 text-center text-sm text-slate-400 ring-1 ring-slate-700">
            Log this exercise on at least two days to see a trend line.
          </div>
        ) : (
          <div className="h-64 w-full rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={chartLabel}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                  labelFormatter={(d) => fmtDate(String(d))}
                  formatter={(v: number | string) => [
                    `${fmtWeight(Number(v))} ${unit}`,
                    metric === 'e1rm' ? 'Est. 1RM' : 'Top set',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={key}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Every session
        </h2>
        <ul className="space-y-2">
          {[...history].reverse().map((row) => (
            <li
              key={row.workout_id}
              className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 ring-1 ring-slate-700"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {fmtDate(row.performed_on)}
                </p>
                <p className="text-sm text-slate-400">{fmtSetLine(row.sets)}</p>
              </div>
              <span className="text-right text-sm">
                <span className="block font-semibold text-blue-400">
                  {fmtWeight(bestE1rm(row.sets))}
                </span>
                <span className="text-xs text-slate-500">est 1RM</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400'
      }`}
    >
      {children}
    </button>
  )
}
