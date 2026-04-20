import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySiswaSessionFromRequest } from '@/lib/auth/middleware-helpers'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

function createSupabaseMiddlewareClient(request: NextRequest, response: ReturnType<typeof NextResponse.next>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )
}

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
    const response = NextResponse.next()
    const supabase = createSupabaseMiddlewareClient(request, response)

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Blokir siswa dari mengakses /admin/*
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

    const response = NextResponse.next()
    const supabase = createSupabaseMiddlewareClient(request, response)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
