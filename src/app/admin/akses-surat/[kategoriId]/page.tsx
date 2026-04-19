import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import SiswaKategoriTable from '@/components/akses-surat/SiswaKategoriTable'
import type { User } from '@/types/database'
import type { SuratSiswaRow } from '@/types/akses-surat'

interface PageProps {
  params: { kategoriId: string }
}

export default async function KategoriDetailPage({ params }: PageProps) {
  const { kategoriId } = params
  const supabase = createAdminClient()

  // Fetch kategori
  const { data: kategori, error: kategoriError } = await supabase
    .from('surat_kategori')
    .select('id, nama_kategori')
    .eq('id', kategoriId)
    .single()

  if (kategoriError || !kategori) {
    notFound()
  }

  // Fetch semua siswa
  const { data: siswaList } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'siswa')
    .order('nama_lengkap')

  // Fetch surat_siswa untuk kategori ini
  const { data: suratSiswaRaw, error: suratSiswaError } = await supabase
    .from('surat_siswa')
    .select('*')
    .eq('kategori_id', kategoriId)

  // DEBUG — hapus setelah masalah terselesaikan
  console.log('[DEBUG] kategoriId:', kategoriId)
  console.log('[DEBUG] suratSiswaRaw count:', suratSiswaRaw?.length ?? 0)
  console.log('[DEBUG] suratSiswaRaw siswa_ids:', suratSiswaRaw?.map(r => r.siswa_id))
  console.log('[DEBUG] siswaList ids:', (siswaList ?? []).map(s => ({ id: s.id, nama: s.nama_lengkap })))
  console.log('[DEBUG] suratSiswaError:', JSON.stringify(suratSiswaError))

  if (suratSiswaError) {
    console.error('[KategoriDetailPage] surat_siswa error:', JSON.stringify(suratSiswaError))
  }

  // Build map siswa untuk lookup cepat
  const siswaMap = new Map((siswaList ?? []).map((s) => [s.id, s]))

  // Transform ke SuratSiswaRow
  const suratSiswaList: SuratSiswaRow[] = (suratSiswaRaw ?? []).map((row) => {
    const siswa = siswaMap.get(row.siswa_id)
    return {
      id: row.id,
      siswa_id: row.siswa_id,
      kategori_id: row.kategori_id,
      file_path: row.file_path,
      file_name: row.file_name,
      akses_download: row.akses_download,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at,
      siswa_nis: siswa?.nis ?? null,
      siswa_nama: siswa?.nama_lengkap ?? 'Unknown',
      siswa_kelas: siswa?.kelas ?? null,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/akses-surat" className="hover:text-blue-600 transition-colors">
            Akses Surat
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{kategori.nama_kategori}</span>
        </nav>

        <SiswaKategoriTable
          siswaList={(siswaList ?? []) as User[]}
          suratSiswaList={suratSiswaList}
          kategoriId={kategoriId}
          kategoriNama={kategori.nama_kategori}
        />
      </div>
    </div>
  )
}
