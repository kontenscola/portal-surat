'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/database'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createSiswa, updateSiswa, deleteSiswa, importSiswa, archiveSiswa, unarchiveSiswa } from '@/actions/siswa'
import type { ImportSiswaRow, ImportSiswaResult } from '@/actions/siswa'

interface SiswaTableProps {
  initialData: User[]
  totalCount: number
}

interface FormState {
  nama_lengkap: string
  username: string
  nis: string
  kelas: string
  password: string
}

const EMPTY_FORM: FormState = {
  nama_lengkap: '',
  username: '',
  nis: '',
  kelas: '',
  password: '',
}

const PAGE_SIZE = 20

export default function SiswaTable({ initialData }: SiswaTableProps) {
  const router = useRouter()

  // Tab aktif / arsip
  const [tab, setTab] = useState<'aktif' | 'arsip'>('aktif')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkActing, setIsBulkActing] = useState(false)

  // Form modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [siswaToDelete, setSiswaToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState<ImportSiswaResult | null>(null)
  const [importResultOpen, setImportResultOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Filter by tab then search
  const tabFiltered = useMemo(
    () => initialData.filter((s) => (tab === 'aktif' ? !s.is_archived : s.is_archived)),
    [initialData, tab]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tabFiltered
    return tabFiltered.filter(
      (s) =>
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.nis ?? '').toLowerCase().includes(q)
    )
  }, [tabFiltered, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleTabChange = (t: 'aktif' | 'arsip') => {
    setTab(t)
    setPage(1)
    setSearch('')
    setSelectedIds(new Set())
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  // Checkbox handlers
  const isAllSelected = paginated.length > 0 && paginated.every((s) => selectedIds.has(s.id))
  const isIndeterminate = paginated.some((s) => selectedIds.has(s.id)) && !isAllSelected

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginated.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginated.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Bulk archive / unarchive
  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return
    setIsBulkActing(true)
    try {
      const ids = Array.from(selectedIds)
      const result = tab === 'aktif' ? await archiveSiswa(ids) : await unarchiveSiswa(ids)
      if (!result.success) { alert(result.error); return }
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setIsBulkActing(false)
    }
  }

  // Form modal
  const handleAddSiswa = () => {
    setSelectedSiswa(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const handleEdit = (siswa: User) => {
    setSelectedSiswa(siswa)
    setForm({
      nama_lengkap: siswa.nama_lengkap,
      username: siswa.username,
      nis: siswa.nis ?? '',
      kelas: siswa.kelas ?? '',
      password: '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    if (isSubmitting) return
    setModalOpen(false)
    setSelectedSiswa(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.nama_lengkap.trim() || !form.username.trim() || !form.nis.trim() || !form.kelas.trim()) {
      setFormError('Semua field wajib diisi')
      return
    }
    setIsSubmitting(true)
    try {
      let result
      if (selectedSiswa) {
        result = await updateSiswa(selectedSiswa.id, {
          nama_lengkap: form.nama_lengkap.trim(),
          username: form.username.trim(),
          nis: form.nis.trim(),
          kelas: form.kelas.trim(),
          password: form.password || undefined,
        })
      } else {
        result = await createSiswa({
          nama_lengkap: form.nama_lengkap.trim(),
          username: form.username.trim(),
          nis: form.nis.trim(),
          kelas: form.kelas.trim(),
          password: form.password || undefined,
        })
      }
      if (!result.success) { setFormError(result.error); return }
      setModalOpen(false)
      setSelectedSiswa(null)
      setForm(EMPTY_FORM)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete
  const handleDeleteClick = (siswa: User) => {
    setSiswaToDelete(siswa)
    setConfirmOpen(true)
  }

  const handleConfirmClose = () => {
    if (isDeleting) return
    setConfirmOpen(false)
    setSiswaToDelete(null)
  }

  const handleDeleteConfirm = async () => {
    if (!siswaToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteSiswa(siswaToDelete.id)
      if (!result.success) { alert(result.error); return }
      setConfirmOpen(false)
      setSiswaToDelete(null)
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  // Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setIsImporting(true)
    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: string[][] = utils.sheet_to_json(ws, { header: 1, defval: '' })

      const headerRowIndex = rows.findIndex((row) =>
        row.some((cell) => String(cell).trim().toUpperCase() === 'NIS')
      )
      if (headerRowIndex === -1) {
        alert('Format file tidak sesuai. Pastikan ada kolom NIS.')
        return
      }

      const header = rows[headerRowIndex].map((h) => String(h).trim().toUpperCase())
      const colNama = header.findIndex((h) => h === 'NAMA')
      const colNIS = header.findIndex((h) => h === 'NIS')
      const colKelas = header.findIndex((h) => h === 'KELAS')

      const dataRows: ImportSiswaRow[] = []
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i]
        const nama = String(row[colNama] ?? '').trim()
        const nis = String(row[colNIS] ?? '').trim()
        const kelas = String(row[colKelas] ?? '').trim()
        if (!nama || !nis || !kelas) continue
        dataRows.push({ nama_lengkap: nama, nis, kelas })
      }

      if (dataRows.length === 0) {
        alert('Tidak ada data siswa yang valid ditemukan di file.')
        return
      }

      const BATCH_SIZE = 20
      const total = dataRows.length
      setImportProgress({ current: 0, total })

      const accumulated: ImportSiswaResult = { imported: 0, skipped: 0, errors: [] }
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE)
        const result = await importSiswa(batch)
        accumulated.imported += result.imported
        accumulated.skipped += result.skipped
        accumulated.errors.push(...result.errors)
        setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total })
      }

      setImportResult(accumulated)
      setImportResultOpen(true)
      router.refresh()
    } catch {
      alert('Gagal membaca file. Pastikan file berformat .xlsx yang valid.')
    } finally {
      setIsImporting(false)
      setImportProgress({ current: 0, total: 0 })
    }
  }

  const aktifCount = initialData.filter((s) => !s.is_archived).length
  const arsipCount = initialData.filter((s) => s.is_archived).length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => handleTabChange('aktif')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'aktif'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Siswa Aktif
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'aktif' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {aktifCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('arsip')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'arsip'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Arsip
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'arsip' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {arsipCount}
            </span>
          </button>
        </div>

        {/* Toolbar kanan */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-52 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {tab === 'aktif' && (
            <>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors whitespace-nowrap"
              >
                Import Excel
              </button>
              <button
                type="button"
                onClick={handleAddSiswa}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <span aria-hidden="true">+</span>
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} siswa dipilih
          </span>
          <button
            type="button"
            onClick={handleBulkArchive}
            disabled={isBulkActing}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              tab === 'aktif'
                ? 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
            }`}
          >
            {isBulkActing
              ? 'Memproses...'
              : tab === 'aktif'
              ? 'Arsipkan'
              : 'Pulihkan ke Aktif'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Batalkan pilihan
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3 cursor-pointer" onClick={handleSelectAll}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate }}
                  onChange={handleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  aria-label="Pilih semua"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Lengkap
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NIS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kelas
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {search
                    ? 'Tidak ada siswa yang cocok dengan pencarian.'
                    : tab === 'aktif'
                    ? 'Belum ada data siswa aktif.'
                    : 'Belum ada siswa yang diarsipkan.'}
                </td>
              </tr>
            ) : (
              paginated.map((siswa) => (
                <tr
                  key={siswa.id}
                  className={`hover:bg-gray-50 transition-colors ${selectedIds.has(siswa.id) ? 'bg-blue-50' : ''}`}
                >
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => handleSelectOne(siswa.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(siswa.id)}
                      onChange={() => handleSelectOne(siswa.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{siswa.nama_lengkap}</td>
                  <td className="px-4 py-3 text-gray-600">{siswa.nis ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{siswa.kelas ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(siswa)}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(siswa)}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} siswa
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedIds(new Set()) }}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPage(p); setSelectedIds(new Set()) }}
                className={`px-3 py-1 border rounded transition-colors ${
                  p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelectedIds(new Set()) }}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Modal Form: Tambah / Edit Siswa */}
      <Modal isOpen={modalOpen} onClose={handleModalClose} title={selectedSiswa ? 'Edit Siswa' : 'Tambah Siswa'}>
        <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="siswa-nama" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input id="siswa-nama" type="text" value={form.nama_lengkap}
              onChange={(e) => handleFormChange('nama_lengkap', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan nama lengkap" disabled={isSubmitting} required />
          </div>
          <div>
            <label htmlFor="siswa-username" className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input id="siswa-username" type="text" value={form.username}
              onChange={(e) => handleFormChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan username" disabled={isSubmitting} required />
          </div>
          <div>
            <label htmlFor="siswa-nis" className="block text-sm font-medium text-gray-700 mb-1">
              NIS <span className="text-red-500">*</span>
            </label>
            <input id="siswa-nis" type="text" value={form.nis}
              onChange={(e) => handleFormChange('nis', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan NIS" disabled={isSubmitting} required />
          </div>
          <div>
            <label htmlFor="siswa-kelas" className="block text-sm font-medium text-gray-700 mb-1">
              Kelas <span className="text-red-500">*</span>
            </label>
            <input id="siswa-kelas" type="text" value={form.kelas}
              onChange={(e) => handleFormChange('kelas', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: XII IPA 1" disabled={isSubmitting} required />
          </div>
          <div>
            <label htmlFor="siswa-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input id="siswa-password" type="password" value={form.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={selectedSiswa ? 'Kosongkan jika tidak ingin mengubah' : 'Kosongkan untuk pakai NIS sebagai password'}
              disabled={isSubmitting} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleModalClose} disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : selectedSiswa ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Loading Progress Import */}
      <Modal isOpen={isImporting} onClose={() => {}} title="Mengimpor Data Siswa">
        {(() => {
          const { current, total } = importProgress
          const pct = total > 0 ? Math.round((current / total) * 100) : 0
          return (
            <div className="space-y-4 py-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{current} dari {total} siswa</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-3 rounded-full bg-green-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-center">Mohon tunggu, jangan tutup halaman ini...</p>
            </div>
          )
        })()}
      </Modal>

      {/* Modal Import Excel */}
      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Import Data Siswa">
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx"
              disabled={isImporting}
              onChange={async (e) => {
                setTemplateModalOpen(false)
                await handleFileChange(e)
              }}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          <a href="/template-import-siswa.xlsx" download className="inline-block text-sm text-blue-600 hover:underline">
            Unduh file template
          </a>
        </div>
      </Modal>

      {/* Modal Hasil Import */}
      <Modal isOpen={importResultOpen} onClose={() => setImportResultOpen(false)} title="Hasil Import Excel">
        {importResult && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                <p className="text-green-600">Berhasil diimpor</p>
              </div>
              {importResult.skipped > 0 && (
                <div className="flex-1 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{importResult.skipped}</p>
                  <p className="text-yellow-600">Dilewati</p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="flex-1 rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                  <p className="text-red-600">Gagal</p>
                </div>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((err) => (
                  <li key={err.nis} className="text-red-600 bg-red-50 px-3 py-1.5 rounded text-xs">
                    NIS {err.nis} — {err.message}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500">Username dan password default = NIS masing-masing.</p>
            <div className="flex justify-end">
              <button type="button" onClick={() => setImportResultOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog: Hapus Siswa */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleDeleteConfirm}
        title="Hapus Siswa"
        message={
          siswaToDelete
            ? `Apakah Anda yakin ingin menghapus siswa "${siswaToDelete.nama_lengkap}"? Seluruh data akses surat milik siswa ini juga akan dihapus.`
            : 'Apakah Anda yakin ingin menghapus siswa ini?'
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
