import { NextRequest, NextResponse } from 'next/server'
import { loginAdminSchema } from '@/lib/validations/auth'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validasi input dengan loginAdminSchema
    const parsed = loginAdminSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { username, password } = parsed.data

    // Buat response object lebih awal agar cookie bisa diset/dihapus pada response yang sama
    const successResponse = NextResponse.redirect(new URL('/admin', request.url))
    const errorResponse = NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    )

    // Gunakan createServerClient langsung dengan response yang kita kontrol
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Set cookie di kedua response agar konsisten
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options)
              errorResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    })

    if (authError || !authData.user) {
      return errorResponse
    }

    // Verifikasi role='admin' di tabel users menggunakan admin client
    const adminClient = createAdminClient()
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('auth_user_id', authData.user.id)
      .eq('role', 'admin')
      .single()

    if (userError || !user) {
      // Bukan admin — sign out dan hapus semua cookie sesi dari errorResponse
      await supabase.auth.signOut()

      // Hapus semua cookie Supabase Auth dari error response
      const supabaseCookieNames = request.cookies
        .getAll()
        .filter((c) => c.name.startsWith('sb-'))
        .map((c) => c.name)

      supabaseCookieNames.forEach((name) => {
        errorResponse.cookies.set(name, '', {
          maxAge: 0,
          path: '/',
        })
      })

      return errorResponse
    }

    // Login berhasil — set cookie dari successResponse ke JSON response
    const jsonSuccess = NextResponse.json({ success: true }, { status: 200 })
    // Copy semua cookie dari successResponse ke jsonSuccess
    successResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      jsonSuccess.cookies.set(name, value, options)
    })
    return jsonSuccess
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
