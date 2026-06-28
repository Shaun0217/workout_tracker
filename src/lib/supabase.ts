import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until the Supabase env vars are set — App shows a setup screen. */
export const isConfigured = Boolean(url && anonKey)

// Untyped client: query results are cast to the hand-written row types in
// queries.ts at the boundary, which is simpler than maintaining a full
// generated Database type. Fall back to placeholder values when unconfigured
// so the module imports cleanly and App can render the setup screen.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
