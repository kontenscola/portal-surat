'use server'

import { revalidatePath } from 'next/cache'
// Menggunakan service role client karena ini adalah Server Action admin.
// Service role melewati RLS sehingga admin dapat membaca, membuat, memperbarui,
// dan menghapus rekaman akses surat untuk semua siswa, serta mengelola file
// di Supabase Storage. Persyaratan 7.6 — admin memiliki akses penuh ke tabel
// surat_access.
import { createAdminClient } from '@/lib/supabase/admin'
import { buildStoragePath } from '@/lib/storage'
import { createSuratAccessSchema } from '@/lib/validations/surat-access'
import type { CreateSuratAccessInput } from '@/lib/validations/surat-access'

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

export async function createSuratAccess(data: CreateSuratAccessInput): Promise<ActionResult> {
  const parsed = createSuratAccessSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Input tidak valid'
    return { success: false, error: firstError }
  }

  const { user_id, surat_type_id } = parsed.data
  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('surat_access')
    .insert({
      user_id,
      surat_type_id,
      file_url: null,
      file_name: null,
      can_download: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Siswa tersebut sudah terdaftar sebagai penerima untuk jenis surat ini',
      }
    }
    console.error('[createSuratAccess] DB error:', error)
    return { success: false, error: 'Gagal mendaftarkan penerima surat' }
  }

  revalidatePath('/admin')
  return { success: true, data: inserted }
}

export async function uploadSuratFile(accessId: string, file: File): Promise<ActionResult> {
  const supabase = createAdminClient()

  // Fetch the access record to get user_id and surat_type_id
  const { data: accessRecord, error: accessError } = await supabase
    .from('surat_access')
    .select('user_id, surat_type_id')
    .eq('id', accessId)
    .single()

  if (accessError || !accessRecord) {
    console.error('[uploadSuratFile] Fetch access error:', accessError)
    return { success: false, error: 'Rekaman akses surat tidak ditemukan' }
  }

  // Fetch surat_type to get kode
  const { data: suratType, error: suratTypeError } = await supabase
    .from('surat_types')
    .select('kode')
    .eq('id', accessRecord.surat_type_id)
    .single()

  if (suratTypeError || !suratType) {
    console.error('[uploadSuratFile] Fetch surat_type error:', suratTypeError)
    return { success: false, error: 'Jenis surat tidak ditemukan' }
  }

  // Build storage path: {kode}/{user_id}/{file.name}
  const storagePath = buildStoragePath(suratType.kode, accessRecord.user_id, file.name)

  // Upload to bucket 'surat-files'
  const { error: uploadError } = await supabase.storage
    .from('surat-files')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) {
    console.error('[uploadSuratFile] Storage upload error:', uploadError)
    return { success: false, error: 'Gagal mengunggah file ke penyimpanan' }
  }

  // Update surat_access: file_url = path, file_name = file.name
  const { data: updated, error: updateError } = await supabase
    .from('surat_access')
    .update({ file_url: storagePath, file_name: file.name })
    .eq('id', accessId)
    .select()
    .single()

  if (updateError) {
    console.error('[uploadSuratFile] DB update error:', updateError)
    return { success: false, error: 'Gagal memperbarui rekaman akses surat' }
  }

  revalidatePath('/admin')
  return { success: true, data: updated }
}

export async function toggleCanDownload(accessId: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  // Fetch current can_download value
  const { data: current, error: fetchError } = await supabase
    .from('surat_access')
    .select('can_download')
    .eq('id', accessId)
    .single()

  if (fetchError || !current) {
    console.error('[toggleCanDownload] Fetch error:', fetchError)
    return { success: false, error: 'Rekaman akses surat tidak ditemukan' }
  }

  // Update to opposite value
  const { data: updated, error: updateError } = await supabase
    .from('surat_access')
    .update({ can_download: !current.can_download })
    .eq('id', accessId)
    .select()
    .single()

  if (updateError) {
    console.error('[toggleCanDownload] Update error:', updateError)
    return { success: false, error: 'Gagal memperbarui status akses unduhan' }
  }

  revalidatePath('/admin')
  return { success: true, data: updated }
}

export async function deleteSuratAccess(accessId: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  // Fetch record to get file_url
  const { data: record, error: fetchError } = await supabase
    .from('surat_access')
    .select('file_url')
    .eq('id', accessId)
    .single()

  if (fetchError || !record) {
    console.error('[deleteSuratAccess] Fetch error:', fetchError)
    return { success: false, error: 'Rekaman akses surat tidak ditemukan' }
  }

  // Delete from DB first
  const { error: deleteError } = await supabase
    .from('surat_access')
    .delete()
    .eq('id', accessId)

  if (deleteError) {
    console.error('[deleteSuratAccess] DB delete error:', deleteError)
    return { success: false, error: 'Gagal menghapus rekaman akses surat' }
  }

  // If file_url is not null, delete from Storage
  if (record.file_url !== null) {
    const { error: storageError } = await supabase.storage
      .from('surat-files')
      .remove([record.file_url])

    if (storageError) {
      // Log error but don't fail the operation (Requirement 6.18)
      console.error('[deleteSuratAccess] Storage delete error (non-fatal):', storageError)
    }
  }

  revalidatePath('/admin')
  return { success: true }
}
