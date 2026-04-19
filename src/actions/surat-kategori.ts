'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createKategoriSchema } from '@/lib/validations/akses-surat'
import type { CreateKategoriInput } from '@/lib/validations/akses-surat'

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

export async function createKategori(data: CreateKategoriInput): Promise<ActionResult> {
  const parsed = createKategoriSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const { nama_kategori, deskripsi } = parsed.data
  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('surat_kategori')
    .insert({ nama_kategori, deskripsi: deskripsi ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Nama kategori sudah terdaftar' }
    }
    console.error('[createKategori] DB error:', error)
    return { success: false, error: 'Gagal menambahkan kategori' }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true, data: inserted }
}

export async function deleteKategori(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('surat_kategori').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error: 'Kategori tidak dapat dihapus karena masih memiliki data surat siswa',
      }
    }
    console.error('[deleteKategori] DB error:', error)
    return { success: false, error: 'Gagal menghapus kategori' }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true }
}
