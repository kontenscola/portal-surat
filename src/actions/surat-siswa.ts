'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function buildStoragePath(kategoriId: string, siswaId: string, fileName: string): string {
  const timestamp = Date.now()
  // Sanitize filename: replace spaces with underscores
  const safeName = fileName.replace(/\s+/g, '_')
  return `${kategoriId}/${siswaId}/${timestamp}_${safeName}`
}

export async function uploadFileSurat(
  siswaId: string,
  kategoriId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'File wajib dipilih' }
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Format file harus PDF, JPG, atau PNG' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'Ukuran file maksimal 5 MB' }
  }

  const supabase = createAdminClient()
  const storagePath = buildStoragePath(kategoriId, siswaId, file.name)

  // Upload ke Storage (upsert: true untuk handle retry)
  const { error: uploadError } = await supabase.storage
    .from('surat-files')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) {
    console.error('[uploadFileSurat] Storage error:', JSON.stringify(uploadError))
    return { success: false, error: `Gagal mengunggah file: ${uploadError.message}` }
  }

  // Cek apakah sudah ada record untuk siswa+kategori ini
  const { data: existing } = await supabase
    .from('surat_siswa')
    .select('id')
    .eq('siswa_id', siswaId)
    .eq('kategori_id', kategoriId)
    .single()

  let record
  let dbError

  if (existing) {
    // Update record yang sudah ada
    const { data, error } = await supabase
      .from('surat_siswa')
      .update({
        file_path: storagePath,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    record = data
    dbError = error
  } else {
    // Insert record baru
    const { data, error } = await supabase
      .from('surat_siswa')
      .insert({
        siswa_id: siswaId,
        kategori_id: kategoriId,
        file_path: storagePath,
        file_name: file.name,
        akses_download: false,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()
    record = data
    dbError = error
  }

  if (dbError) {
    // Hapus file yang sudah terupload jika DB gagal
    await supabase.storage.from('surat-files').remove([storagePath])
    console.error('[uploadFileSurat] DB error:', JSON.stringify(dbError))
    return { success: false, error: `Gagal menyimpan data: ${dbError.message}` }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true, data: record }
}

export async function gantiFileSurat(
  suratSiswaId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'File wajib dipilih' }
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Format file harus PDF, JPG, atau PNG' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'Ukuran file maksimal 5 MB' }
  }

  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('surat_siswa')
    .select('file_path, siswa_id, kategori_id')
    .eq('id', suratSiswaId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Rekaman surat tidak ditemukan' }
  }

  const storagePath = buildStoragePath(existing.kategori_id, existing.siswa_id, file.name)

  const { error: uploadError } = await supabase.storage
    .from('surat-files')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) {
    console.error('[gantiFileSurat] Storage upload error:', JSON.stringify(uploadError))
    return { success: false, error: `Gagal mengunggah file baru: ${uploadError.message}` }
  }

  const { data: updated, error: dbError } = await supabase
    .from('surat_siswa')
    .update({
      file_path: storagePath,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', suratSiswaId)
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('surat-files').remove([storagePath])
    console.error('[gantiFileSurat] DB error:', JSON.stringify(dbError))
    return { success: false, error: `Gagal memperbarui data: ${dbError.message}` }
  }

  // Hapus file lama (non-fatal)
  if (existing.file_path && existing.file_path !== storagePath) {
    const { error: deleteOldError } = await supabase.storage
      .from('surat-files')
      .remove([existing.file_path])
    if (deleteOldError) {
      console.error('[gantiFileSurat] Failed to delete old file (non-fatal):', deleteOldError)
    }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true, data: updated }
}

export async function getFileViewUrl(filePath: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from('surat-files')
    .createSignedUrl(filePath, 300) // 5 menit untuk preview

  if (error || !data?.signedUrl) {
    console.error('[getFileViewUrl] Error:', error)
    return { success: false, error: 'Gagal membuat URL preview' }
  }

  return { success: true, data: data.signedUrl }
}

export async function toggleAksesDownload(suratSiswaId: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { data: current, error: fetchError } = await supabase
    .from('surat_siswa')
    .select('akses_download')
    .eq('id', suratSiswaId)
    .single()

  if (fetchError || !current) {
    return { success: false, error: 'Rekaman surat tidak ditemukan' }
  }

  const { data: updated, error: updateError } = await supabase
    .from('surat_siswa')
    .update({ akses_download: !current.akses_download })
    .eq('id', suratSiswaId)
    .select()
    .single()

  if (updateError) {
    console.error('[toggleAksesDownload] DB error:', updateError)
    return { success: false, error: 'Gagal memperbarui status akses download' }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true, data: updated }
}

export async function hapusSuratSiswa(suratSiswaId: string): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { data: record, error: fetchError } = await supabase
    .from('surat_siswa')
    .select('file_path')
    .eq('id', suratSiswaId)
    .single()

  if (fetchError || !record) {
    return { success: false, error: 'Rekaman surat tidak ditemukan' }
  }

  const { error: deleteError } = await supabase
    .from('surat_siswa')
    .delete()
    .eq('id', suratSiswaId)

  if (deleteError) {
    console.error('[hapusSuratSiswa] DB error:', deleteError)
    return { success: false, error: 'Gagal menghapus rekaman surat' }
  }

  if (record.file_path) {
    const { error: storageError } = await supabase.storage
      .from('surat-files')
      .remove([record.file_path])
    if (storageError) {
      console.error('[hapusSuratSiswa] Storage delete error (non-fatal):', storageError)
    }
  }

  revalidatePath('/admin/akses-surat')
  return { success: true }
}
