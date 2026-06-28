import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './auth/Login'
import BottomNav from './components/BottomNav'
import { Spinner, ErrorNote } from './components/ui'
import { ensureSeeded } from './lib/queries'
import { isConfigured } from './lib/supabase'
import Home from './screens/Home'
import ActiveSession from './screens/ActiveSession'
import History from './screens/History'
import Progress from './screens/Progress'
import ExerciseProgress from './screens/ExerciseProgress'
import Bodyweight from './screens/Bodyweight'

export default function App() {
  const { session, loading } = useAuth()
  const [seedErr, setSeedErr] = useState<unknown>(null)
  const [seeding, setSeeding] = useState(false)
  const location = useLocation()

  // Seed the default program once, on first authenticated load.
  useEffect(() => {
    if (!session) return
    setSeeding(true)
    ensureSeeded()
      .catch(setSeedErr)
      .finally(() => setSeeding(false))
  }, [session])

  if (!isConfigured) return <SetupScreen />
  if (loading) return <Spinner label="Loading…" />
  if (!session) return <Login />
  if (seeding) return <Spinner label="Setting up your program…" />
  if (seedErr) return <ErrorNote error={seedErr} />

  // The active-session screen is full-screen (no bottom nav).
  const isSession = location.pathname.startsWith('/session/')

  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:workoutId" element={<ActiveSession />} />
        <Route path="/history" element={<History />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/progress/:exerciseId" element={<ExerciseProgress />} />
        <Route path="/bodyweight" element={<Bodyweight />} />
      </Routes>
      {!isSession && <BottomNav />}
    </div>
  )
}

function SetupScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="max-w-sm">
        <div className="mb-3 text-4xl">⚙️</div>
        <h1 className="text-xl font-bold text-white">Almost there</h1>
        <p className="mt-2 text-sm text-slate-400">
          Set your Supabase credentials to start. Copy{' '}
          <code className="text-slate-200">.env.example</code> to{' '}
          <code className="text-slate-200">.env.local</code> and fill in{' '}
          <code className="text-slate-200">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-slate-200">VITE_SUPABASE_ANON_KEY</code>, then
          restart the dev server. See the README for the full setup.
        </p>
      </div>
    </div>
  )
}
