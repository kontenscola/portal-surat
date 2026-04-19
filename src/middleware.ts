import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySiswaSessionFromRequest } from '@/lib/auth/middleware-helpers'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rute /dashboard dan /surat-saya — proteksi dengan JWT custom siswa
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/surat-saya')) {
    const session = await verifySiswaSessionFromRequest(request)
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Rute /admin/* — proteksi dengan Supabase Auth
  if (pathname.startsWith('/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const response = NextResponse.next()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Blokir siswa dari mengakses /admin/*
    // Siswa menggunakan JWT custom, bukan Supabase Auth — jika ada sesi siswa, tolak akses
    const siswaSession = await verifySiswaSessionFromRequest(request)
    if (siswaSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  }

  // Halaman landing `/` — redirect jika sudah ada sesi aktif
  if (pathname === '/') {
    const siswaSession = await verifySiswaSessionFromRequest(request)
    if (siswaSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Cek sesi admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const response = NextResponse.next()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
  }

  // Semua rute lain — izinkan
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua path kecuali:
     * - _next/static (file statis)
     * - _next/image (optimasi gambar)
     * - favicon.ico
     * - file dengan ekstensi (gambar, font, dll)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
