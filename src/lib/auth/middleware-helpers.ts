import { jwtVerify } from 'jose'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import type { SiswaSession } from '@/types/database'

const SESSION_COOKIE_NAME = 'siswa_session'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Verifikasi JWT sesi siswa dari cookie request.
 * Mengembalikan payload sesi jika valid, null jika tidak valid atau tidak ada.
 */
export async function verifySiswaSessionFromRequest(
  request: NextRequest
): Promise<SiswaSession | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)

    if (
      typeof payload.user_id !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.nama_lengkap !== 'string' ||
      typeof payload.nis !== 'string' ||
      typeof payload.kelas !== 'string' ||
      payload.role !== 'siswa' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }

    return {
      user_id: payload.user_id,
      username: payload.username,
      nama_lengkap: payload.nama_lengkap,
      nis: payload.nis,
      kelas: payload.kelas,
      role: 'siswa',
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

/**
 * Verifikasi sesi admin Supabase Auth dari cookie request.
 * Mengembalikan user jika sesi valid, null jika tidak.
 */
export async function verifyAdminSessionFromRequest(
  request: NextRequest
): Promise<{ id: string; email?: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return null

  // Buat response sementara untuk menampung cookie yang di-refresh
  const response = new Response()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.headers.append(
            'Set-Cookie',
            `${name}=${value}; Path=/; ${options?.httpOnly ? 'HttpOnly;' : ''} ${options?.secure ? 'Secure;' : ''}`
          )
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  return { id: user.id, email: user.email }
}
