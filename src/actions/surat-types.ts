'use server'

import { revalidatePath } from 'next/cache'
// Menggunakan service role client karena ini adalah Server Action admin.
// Service role melewati RLS sehingga admin dapat membaca dan memodifikasi
// semua jenis surat. Persyaratan 7.6 — admin memiliki akses penuh ke tabel
// surat_types.
import { createAdminClient } from '@/lib/supabase/admin'
import { createSuratTypeSchema } from '@/lib/validations/surat-type'
import type { CreateSuratTypeInput } from '@/lib/validations/surat-type'

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

export async function createSuratType(data: CreateSuratTypeInput): Promise<ActionResult> {
  const parsed = createSuratTypeSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Input tidak valid'
    return { success: false, error: firstError }
  }

  const { nama_surat, kode, deskripsi } = parsed.data
  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('surat_types')
    .insert({ nama_surat, kode, deskripsi: deskripsi ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kode sudah terdaftar' }
    }
    console.error('[createSuratType] DB error:', error)
    return { success: false, error: 'Gagal menambahkan jenis surat' }
  }

  revalidatePath('/admin')
  return { success: true, data: inserted }
}

export async function toggleSuratTypeStatus(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  // Fetch current is_active value
  const { data: current, error: fetchError } = await supabase
    .from('surat_types')
    .select('is_active')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    console.error('[toggleSuratTypeStatus] Fetch error:', fetchError)
    return { success: false, error: 'Jenis surat tidak ditemukan' }
  }

  // Update to opposite value
  const { data: updated, error: updateError } = await supabase
    .from('surat_types')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[toggleSuratTypeStatus] Update error:', updateError)
    return { success: false, error: 'Gagal memperbarui status jenis surat' }
  }

  revalidatePath('/admin')
  return { success: true, data: updated }
}

export async function deleteSuratType(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('surat_types').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error: 'Jenis surat tidak dapat dihapus karena sudah memiliki data akses',
      }
    }
    console.error('[deleteSuratType] DB error:', error)
    return { success: false, error: 'Gagal menghapus jenis surat' }
  }

  revalidatePath('/admin')
  return { success: true }
}
