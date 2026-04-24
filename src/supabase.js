import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// If env vars aren't set yet, export a null client — AppContext handles this gracefully
export const supabase = (url && key) ? createClient(url, key) : null
export const supabaseReady = !!(url && key)
