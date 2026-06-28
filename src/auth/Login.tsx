import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
            🏋️
          </div>
          <h1 className="text-2xl font-bold text-white">Lift</h1>
          <p className="mt-1 text-sm text-slate-400">
            Progressive overload, tracked.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-xl bg-slate-800 p-5 text-center">
            <p className="text-white">Check your email</p>
            <p className="mt-2 text-sm text-slate-400">
              We sent a magic sign-in link to{' '}
              <span className="text-slate-200">{email}</span>. Open it on this
              device to log in.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base text-white outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-red-400">{message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
