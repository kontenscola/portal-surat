import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySiswaSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import SuratSayaList from '@/components/akses-surat/SuratSayaList'
import type { SuratSayaItem } from '@/types/akses-surat'

export default async function SuratSayaPage() {
  // Verifikasi sesi siswa
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) redirect('/')

  const session = await verifySiswaSession(token)
  if (!session) redirect('/')

  // Fetch surat_siswa milik siswa ini, join dengan surat_kategori
  const supabase = createAdminClient()
  const { data: suratSiswaRaw } = await supabase
    .from('surat_siswa')
    .select('*, surat_kategori(nama_kategori)')
    .eq('siswa_id', session.user_id)
    .order('uploaded_at', { ascending: false })

  const items: SuratSayaItem[] = (suratSiswaRaw ?? []).map((row) => ({
    id: row.id,
    kategori_id: row.kategori_id,
    kategori_nama:
      (row.surat_kategori as { nama_kategori: string } | null)?.nama_kategori ?? 'Tidak diketahui',
    file_name: row.file_name,
    file_path: row.file_path,
    akses_download: row.akses_download,
    uploaded_at: row.uploaded_at,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{session.nama_lengkap}</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Kelas {session.kelas} &middot; NIS {session.nis}
              </p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Konten */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Teks sambutan */}
        <div className="mb-10 text-center">
          <p className="text-base text-gray-700">Selamat Anda telah dinyatakan</p>
          <p className="mt-5 mb-5 text-5xl font-bold text-gray-900 tracking-wide">LULUS</p>
          <p className="text-base text-gray-700">dari SMA Antartika Sidoarjo</p>
          <p className="mt-1 text-base text-gray-700">Tahun Ajaran 2025/2026.</p>
        </div>

        <h2 className="mb-6 text-lg font-medium text-gray-700">Surat Saya</h2>
        <SuratSayaList items={items} />
      </main>
    </div>
  )
}
