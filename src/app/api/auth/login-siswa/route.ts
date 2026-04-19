import { NextRequest, NextResponse } from 'next/server'
import { loginSiswaSchema } from '@/lib/validations/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { signSiswaSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validasi input
    const parsed = loginSiswaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { username, nis } = parsed.data

    // Query users dengan Supabase admin client
    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('nis', nis)
      .eq('role', 'siswa')
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Username atau NIS salah' },
        { status: 401 }
      )
    }

    // Buat JWT custom
    const token = await signSiswaSession({
      user_id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      nis: user.nis!,
      kelas: user.kelas!,
      role: 'siswa',
    })

    // Set cookie dan return JSON sukses (client yang handle navigate)
    const response = NextResponse.json({ success: true }, { status: 200 })
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
