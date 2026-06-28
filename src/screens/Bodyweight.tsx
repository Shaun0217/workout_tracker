import { useMemo, useState, type FormEvent } from 'react'
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
import { getBodyweightLogs, logBodyweight } from '../lib/queries'
import { fmtWeight } from '../lib/logic'
import { chartLabel, fmtDate, relativeDay, todayISO } from '../lib/dates'
import {
  EmptyState,
  ErrorNote,
  PageContainer,
  ScreenHeader,
  Spinner,
} from '../components/ui'

/** 7-day trailing average over date-sorted (ascending) points. */
function rollingAvg(
  points: { date: string; weight: number }[],
  window = 7,
): (number | null)[] {
  return points.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = points.slice(start, i + 1)
    const sum = slice.reduce((a, p) => a + p.weight, 0)
    return Math.round((sum / slice.length) * 10) / 10
  })
}

export default function Bodyweight() {
  const state = useAsync(() => getBodyweightLogs(365), [])
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const today = useMemo(() => {
    const t = state.data?.find((l) => l.logged_on === todayISO())
    return t ?? null
  }, [state.data])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const w = parseFloat(value)
    if (Number.isNaN(w) || w <= 0) return
    setSaving(true)
    try {
      await logBodyweight(w)
      setValue('')
      state.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (state.loading) return <Spinner label="Loading…" />
  if (state.error) return <ErrorNote error={state.error} />
  const logs = state.data!

  const asc = [...logs].reverse()
  const avgs = rollingAvg(asc.map((l) => ({ date: l.logged_on, weight: l.weight })))
  const chartData = asc.map((l, i) => ({
    date: l.logged_on,
    weight: l.weight,
    avg: avgs[i],
  }))

  return (
    <PageContainer>
      <ScreenHeader title="Bodyweight" />

      <form onSubmit={onSubmit} className="flex items-end gap-2 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {today ? "Today's weight (logged)" : "Today's weight"}
          </label>
          <input
            inputMode="decimal"
            placeholder={today ? fmtWeight(today.weight) : 'lb'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving || value === ''}
          className="rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
        >
          {today ? 'Update' : 'Log'}
        </button>
      </form>

      {logs.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="No weigh-ins yet"
          subtitle="Log your weight to start a trend."
        />
      ) : (
        <>
          {chartData.length >= 2 && (
            <div className="mx-4 h-60 rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
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
                    domain={['dataMin - 1', 'dataMax + 1']}
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
                    formatter={(v: number | string, name) => [
                      `${fmtWeight(Number(v))} lb`,
                      name === 'avg' ? '7-day avg' : 'Weight',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#38bdf8' }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <ul className="space-y-2 p-4">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 ring-1 ring-slate-700"
              >
                <span className="text-sm text-slate-400">
                  {relativeDay(l.logged_on)}
                </span>
                <span className="font-semibold text-white">
                  {fmtWeight(l.weight)} lb
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  )
}
