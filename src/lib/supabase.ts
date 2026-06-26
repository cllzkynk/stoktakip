import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || ''

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL ve Key tanımlı değil. Environment variable\'ları kontrol edin.')
    }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

// Default export for convenience (lazy init)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  }
})
