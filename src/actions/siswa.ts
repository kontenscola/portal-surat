'use server'

import { revalidatePath } from 'next/cache'
// Menggunakan service role client karena ini adalah Server Action admin.
// Service role melewati RLS sehingga admin dapat membaca dan memodifikasi
// data semua siswa. Persyaratan 7.6 — admin memiliki akses penuh ke tabel
// users, surat_types, dan surat_access.
import { createAdminClient } from '@/lib/supabase/admin'
import { createSiswaSchema, updateSiswaSchema } from '@/lib/validations/siswa'
import type { CreateSiswaInput, UpdateSiswaInput } from '@/lib/validations/siswa'

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

export async function createSiswa(data: CreateSiswaInput): Promise<ActionResult> {
  const parsed = createSiswaSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Input tidak valid'
    return { success: false, error: firstError }
  }

  const { nama_lengkap, username, nis, kelas } = parsed.data
  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({ nama_lengkap, username, nis, kelas, role: 'siswa' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('nis')) {
        return { success: false, error: 'NIS sudah terdaftar' }
      }
      if (error.message.includes('username')) {
        return { success: false, error: 'Username sudah terdaftar' }
      }
      return { success: false, error: 'Data sudah terdaftar' }
    }
    console.error('[createSiswa] DB error:', error)
    return { success: false, error: 'Gagal menambahkan siswa' }
  }

  revalidatePath('/admin')
  return { success: true, data: inserted }
}

export async function updateSiswa(id: string, data: UpdateSiswaInput): Promise<ActionResult> {
  const parsed = updateSiswaSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Input tidak valid'
    return { success: false, error: firstError }
  }

  const { nama_lengkap, username, nis, kelas } = parsed.data
  const supabase = createAdminClient()

  const { data: updated, error } = await supabase
    .from('users')
    .update({ nama_lengkap, username, nis, kelas })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('nis')) {
        return { success: false, error: 'NIS sudah terdaftar' }
      }
      if (error.message.includes('username')) {
        return { success: false, error: 'Username sudah terdaftar' }
      }
      return { success: false, error: 'Data sudah terdaftar' }
    }
    console.error('[updateSiswa] DB error:', error)
    return { success: false, error: 'Gagal memperbarui data siswa' }
  }

  revalidatePath('/admin')
  return { success: true, data: updated }
}

export async function deleteSiswa(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  // ON DELETE CASCADE di DB akan otomatis menghapus surat_access terkait
  const { error } = await supabase.from('users').delete().eq('id', id)

  if (error) {
    console.error('[deleteSiswa] DB error:', error)
    return { success: false, error: 'Gagal menghapus siswa' }
  }

  revalidatePath('/admin')
  return { success: true }
}
