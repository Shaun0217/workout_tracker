import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div className="m-4 rounded-xl bg-red-950/60 p-4 text-sm text-red-300 ring-1 ring-red-900">
      {msg}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="font-medium text-slate-200">{title}</p>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

export function ScreenHeader({
  title,
  right,
}: {
  title: string
  right?: ReactNode
}) {
  return (
    <header className="safe-top sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 px-4 pb-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {right}
      </div>
    </header>
  )
}

export function PageContainer({ children }: { children: ReactNode }) {
  // pb leaves room for the fixed bottom nav (4rem) + safe area
  return <div className="mx-auto max-w-2xl pb-24">{children}</div>
}
