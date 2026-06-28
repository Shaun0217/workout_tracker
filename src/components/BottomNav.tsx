import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/history', label: 'History', icon: '📋', end: false },
  { to: '/progress', label: 'Progress', icon: '📈', end: false },
  { to: '/bodyweight', label: 'Weight', icon: '⚖️', end: false },
]

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`
            }
          >
            <span className="text-xl leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
