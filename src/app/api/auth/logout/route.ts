import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Hapus cookie sesi siswa
  const cookieStore = cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)

  // Sign out dari Supabase Auth (untuk sesi admin)
  const supabase = createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', request.url))
}
