'use client'

import { useState, useMemo } from 'react'
import type { User } from '@/types/database'
import type { SuratSiswa, SuratSiswaRow } from '@/types/akses-surat'
import Badge from '@/components/ui/Badge'
import Toggle from '@/components/ui/Toggle'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import UploadFileModal from './UploadFileModal'
import { toggleAksesDownload, hapusSuratSiswa, getFileViewUrl } from '@/actions/surat-siswa'

interface SiswaKategoriTableProps {
  siswaList: User[]
  suratSiswaList: SuratSiswaRow[]
  kategoriId: string
  kategoriNama: string
}

interface SiswaRow {
  siswa: User
  suratSiswa: SuratSiswaRow | null
}

// Tipe untuk override optimistic
interface OptimisticOverride {
  [suratSiswaId: string]: Partial<SuratSiswaRow>
}

export default function SiswaKategoriTable({
  siswaList,
  suratSiswaList,
  kategoriId,
  kategoriNama,
}: SiswaKategoriTableProps) {
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterUpload, setFilterUpload] = useState<'semua' | 'sudah' | 'belum'>('semua')
  const [filterAkses, setFilterAkses] = useState<'semua' | 'dibuka' | 'ditutup'>('semua')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<User | null>(null)
  const [selectedSuratSiswa, setSelectedSuratSiswa] = useState<SuratSiswaRow | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<SuratSiswaRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Optimistic overrides — hanya menyimpan perubahan sementara di atas data server
  const [optimisticOverrides, setOptimisticOverrides] = useState<OptimisticOverride>({})
  // Siswa yang baru diupload (belum ada di suratSiswaList dari server)
  const [newUploads, setNewUploads] = useState<Map<string, SuratSiswaRow>>(new Map())
  // Siswa yang dihapus secara optimistic
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // Build map dari suratSiswaList (dari server) + newUploads, dikurangi deletedIds
  const suratSiswaMap = useMemo(() => {
    const map = new Map<string, SuratSiswaRow>()
    // Data dari server
    for (const s of suratSiswaList) {
      if (!deletedIds.has(s.id)) {
        const override = optimisticOverrides[s.id]
        map.set(s.siswa_id, override ? { ...s, ...override } : s)
      }
    }
    // Data baru dari upload (belum di server)
    Array.from(newUploads.entries()).forEach(([siswaId, s]) => {
      if (!deletedIds.has(s.id)) {
        const override = optimisticOverrides[s.id]
        map.set(siswaId, override ? { ...s, ...override } as SuratSiswaRow : s)
      }
    })
    return map
  }, [suratSiswaList, newUploads, optimisticOverrides, deletedIds])

  const kelasList = useMemo(() => {
    const set = new Set(siswaList.map((s) => s.kelas).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [siswaList])

  const rows: SiswaRow[] = useMemo(() => {
    return siswaList.map((siswa) => ({
      siswa,
      suratSiswa: suratSiswaMap.get(siswa.id) ?? null,
    }))
  }, [siswaList, suratSiswaMap])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(({ siswa, suratSiswa }) => {
      if (q && !siswa.nama_lengkap.toLowerCase().includes(q) && !(siswa.nis ?? '').toLowerCase().includes(q)) return false
      if (filterKelas && siswa.kelas !== filterKelas) return false
      if (filterUpload === 'sudah' && !suratSiswa?.file_path) return false
      if (filterUpload === 'belum' && suratSiswa?.file_path) return false
      if (filterAkses === 'dibuka' && !suratSiswa?.akses_download) return false
      if (filterAkses === 'ditutup' && suratSiswa?.akses_download) return false
      return true
    })
  }, [rows, search, filterKelas, filterUpload, filterAkses])

  const handleToggle = async (suratSiswaId: string, currentValue: boolean) => {
    if (togglingIds.has(suratSiswaId)) return
    setTogglingIds((prev) => new Set(prev).add(suratSiswaId))

    // Optimistic update
    setOptimisticOverrides((prev) => ({
      ...prev,
      [suratSiswaId]: { akses_download: !currentValue },
    }))

    try {
      const result = await toggleAksesDownload(suratSiswaId)
      if (!result.success) {
        // Rollback
        setOptimisticOverrides((prev) => ({
          ...prev,
          [suratSiswaId]: { akses_download: currentValue },
        }))
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(suratSiswaId)
        return next
      })
    }
  }

  const handleUploadClick = (siswa: User, suratSiswa: SuratSiswaRow | null) => {
    setSelectedSiswa(siswa)
    setSelectedSuratSiswa(suratSiswa)
    setUploadModalOpen(true)
  }

  const handleUploadSuccess = (updated: SuratSiswa) => {
    if (!selectedSiswa) return
    // Cek apakah sudah ada di suratSiswaList dari server
    const existsInServer = suratSiswaList.some((s) => s.siswa_id === selectedSiswa.id)
    if (existsInServer) {
      // Update via optimistic override
      setOptimisticOverrides((prev) => ({
        ...prev,
        [updated.id]: {
          file_path: updated.file_path,
          file_name: updated.file_name,
          uploaded_at: updated.uploaded_at,
        },
      }))
    } else {
      // Tambah ke newUploads
      setNewUploads((prev) => {
        const next = new Map(prev)
        next.set(selectedSiswa.id, {
          ...updated,
          siswa_nis: selectedSiswa.nis,
          siswa_nama: selectedSiswa.nama_lengkap,
          siswa_kelas: selectedSiswa.kelas,
        } as SuratSiswaRow)
        return next
      })
    }
  }

  const handleDeleteClick = (suratSiswa: SuratSiswaRow) => {
    setDeletingRecord(suratSiswa)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return
    setIsDeleting(true)
    try {
      const result = await hapusSuratSiswa(deletingRecord.id)
      if (!result.success) {
        setConfirmOpen(false)
        return
      }
      setDeletedIds((prev) => new Set(prev).add(deletingRecord.id))
      setNewUploads((prev) => {
        const next = new Map(prev)
        next.delete(deletingRecord.siswa_id)
        return next
      })
      setConfirmOpen(false)
      setDeletingRecord(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Kategori: <span className="text-blue-600">{kategoriNama}</span>
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{filteredRows.length} dari {siswaList.length} siswa</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari nama atau NIS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Cari siswa"
        />
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select
          value={filterUpload}
          onChange={(e) => setFilterUpload(e.target.value as 'semua' | 'sudah' | 'belum')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="semua">Semua Status File</option>
          <option value="sudah">Sudah Upload</option>
          <option value="belum">Belum Upload</option>
        </select>
        <select
          value={filterAkses}
          onChange={(e) => setFilterAkses(e.target.value as 'semua' | 'dibuka' | 'ditutup')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="semua">Semua Akses</option>
          <option value="dibuka">Akses Dibuka</option>
          <option value="ditutup">Akses Ditutup</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIS</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status File</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akses Download</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada siswa yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ siswa, suratSiswa }) => (
                <tr key={siswa.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{siswa.nis ?? '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{siswa.nama_lengkap}</td>
                  <td className="px-4 py-3 text-gray-600">{siswa.kelas ?? '-'}</td>
                  <td className="px-4 py-3">
                    {suratSiswa?.file_path
                      ? <Badge variant="uploaded" />
                      : <Badge variant="not-uploaded" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    {suratSiswa ? (
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={suratSiswa.akses_download}
                          onChange={() => handleToggle(suratSiswa.id, suratSiswa.akses_download)}
                          disabled={togglingIds.has(suratSiswa.id)}
                        />
                        {!suratSiswa.akses_download && <Badge variant="blocked" />}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {suratSiswa?.file_path && (
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await getFileViewUrl(suratSiswa.file_path!)
                            if (result.success) window.open(result.data as string, '_blank')
                          }}
                          className="rounded px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          Lihat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUploadClick(siswa, suratSiswa)}
                        className="rounded px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        {suratSiswa?.file_path ? 'Ganti' : 'Upload'}
                      </button>
                      {suratSiswa && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(suratSiswa)}
                          className="rounded px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedSiswa && (
        <UploadFileModal
          isOpen={uploadModalOpen}
          onClose={() => { setUploadModalOpen(false); setSelectedSiswa(null); setSelectedSuratSiswa(null) }}
          siswaId={selectedSiswa.id}
          kategoriId={kategoriId}
          existingRecord={selectedSuratSiswa}
          onSuccess={handleUploadSuccess}
        />
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!isDeleting) { setConfirmOpen(false); setDeletingRecord(null) } }}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Surat Siswa"
        message={
          deletingRecord
            ? `Hapus data surat untuk ${deletingRecord.siswa_nama}?${deletingRecord.file_path ? ' File juga akan dihapus dari penyimpanan.' : ''}`
            : 'Hapus data ini?'
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
