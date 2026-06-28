/** Today as a local `YYYY-MM-DD` string (matches Postgres `date`). */
export function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

/** "Jun 28", "Yesterday", "Today", or "Mon" for recent dates. */
export function relativeDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(todayISO() + 'T00:00:00')
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days > 1 && days < 7)
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** "Jun 28, 2026" */
export function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "Mon Jun 28" short label for chart axes. */
export function chartLabel(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
