import { useNavigate } from 'react-router-dom'
import { useAsync } from '../lib/useAsync'
import { getExercises } from '../lib/queries'
import type { Category } from '../lib/types'
import {
  EmptyState,
  ErrorNote,
  PageContainer,
  ScreenHeader,
  Spinner,
} from '../components/ui'

const order: Category[] = ['push', 'pull', 'legs', 'core']
const label: Record<Category, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
}

export default function Progress() {
  const navigate = useNavigate()
  const state = useAsync(getExercises, [])

  if (state.loading) return <Spinner label="Loading…" />
  if (state.error) return <ErrorNote error={state.error} />
  const exercises = state.data!

  if (exercises.length === 0)
    return (
      <PageContainer>
        <ScreenHeader title="Progress" />
        <EmptyState icon="📈" title="No exercises yet" />
      </PageContainer>
    )

  const groups = order
    .map((cat) => ({
      cat,
      items: exercises.filter((e) => e.category === cat),
    }))
    .filter((g) => g.items.length > 0)
  const uncategorized = exercises.filter(
    (e) => !order.includes(e.category as Category),
  )

  return (
    <PageContainer>
      <ScreenHeader title="Progress" />
      <div className="space-y-5 p-4">
        {groups.map((g) => (
          <section key={g.cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              {label[g.cat]}
            </h2>
            <ul className="space-y-2">
              {g.items.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => navigate(`/progress/${e.id}`)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 text-left ring-1 ring-slate-700 active:bg-slate-800"
                  >
                    <span className="font-medium text-white">{e.name}</span>
                    <span className="text-slate-500">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Other
            </h2>
            <ul className="space-y-2">
              {uncategorized.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => navigate(`/progress/${e.id}`)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3 text-left ring-1 ring-slate-700 active:bg-slate-800"
                  >
                    <span className="font-medium text-white">{e.name}</span>
                    <span className="text-slate-500">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageContainer>
  )
}
