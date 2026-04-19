import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifySiswaSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Verifikasi sesi siswa dari cookie
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifySiswaSession(token)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const suratSiswaId = params.id
  const supabase = createAdminClient()

  // 2. Query surat_siswa — verifikasi kepemilikan dan akses
  const { data: record, error: fetchError } = await supabase
    .from('surat_siswa')
    .select('id, file_path, akses_download')
    .eq('id', suratSiswaId)
    .eq('siswa_id', session.user_id)
    .eq('akses_download', true)
    .single()

  if (fetchError || !record) {
    return NextResponse.json(
      { error: 'Akses ditolak atau rekaman tidak ditemukan' },
      { status: 403 }
    )
  }

  if (!record.file_path) {
    return NextResponse.json({ error: 'File belum tersedia' }, { status: 404 })
  }

  // 3. Generate signed URL dengan masa berlaku 60 detik
  const { data: signedData, error: signedError } = await supabase.storage
    .from('surat-files')
    .createSignedUrl(record.file_path, 60)

  if (signedError || !signedData?.signedUrl) {
    console.error('[download] Signed URL error:', signedError)
    return NextResponse.json(
      { error: 'File tidak dapat diunduh saat ini' },
      { status: 500 }
    )
  }

  // 4. Redirect ke signed URL
  return NextResponse.redirect(signedData.signedUrl)
}
