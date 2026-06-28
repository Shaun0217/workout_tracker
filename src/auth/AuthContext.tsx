import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthValue {
  session: Session | null
  loading: boolean
  /** Set when the silent auto-login failed (bad/missing credentials). */
  authError: string | null
}

const AuthCtx = createContext<AuthValue>({
  session: null,
  loading: true,
  authError: null,
})

const AUTH_EMAIL = import.meta.env.VITE_APP_AUTH_EMAIL
const AUTH_PASSWORD = import.meta.env.VITE_APP_AUTH_PASSWORD

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return

      // Already signed in (token persisted from a previous visit) — done.
      if (data.session) {
        setSession(data.session)
        setLoading(false)
        return
      }

      // No session: silently sign in as the single app user. No screen, no
      // email, no rate limit — the credentials live in env vars.
      if (AUTH_EMAIL && AUTH_PASSWORD) {
        const { data: signIn, error } = await supabase.auth.signInWithPassword({
          email: AUTH_EMAIL,
          password: AUTH_PASSWORD,
        })
        if (!active) return
        if (error) setAuthError(error.message)
        else setSession(signIn.session)
      } else {
        setAuthError(
          'Missing VITE_APP_AUTH_EMAIL / VITE_APP_AUTH_PASSWORD env vars.',
        )
      }
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthCtx.Provider value={{ session, loading, authError }}>
      {children}
    </AuthCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthCtx)
}
