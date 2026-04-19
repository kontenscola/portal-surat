import { SignJWT, jwtVerify } from 'jose'
import type { SiswaSession } from '@/types/database'

const SESSION_COOKIE_NAME = 'siswa_session'
const SESSION_DURATION_HOURS = 24

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Membuat JWT custom untuk sesi siswa.
 * Masa berlaku: 24 jam.
 */
export async function signSiswaSession(
  payload: Omit<SiswaSession, 'exp'>
): Promise<string> {
  const secret = getJwtSecret()

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secret)

  return token
}

/**
 * Memverifikasi dan mendekode JWT sesi siswa.
 * Mengembalikan payload jika valid, null jika tidak valid atau kedaluwarsa.
 */
export async function verifySiswaSession(
  token: string
): Promise<SiswaSession | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)

    // Validasi bahwa payload memiliki field yang diperlukan
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

export { SESSION_COOKIE_NAME }
