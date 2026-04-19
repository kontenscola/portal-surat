import { createClient } from '@supabase/supabase-js'

// Service role client — hanya digunakan di server-side
// JANGAN gunakan di browser atau client components
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
