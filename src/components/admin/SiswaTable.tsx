'use client'

import { useState, useMemo, useRef } from 'react'
import type { User } from '@/types/database'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createSiswa, updateSiswa, deleteSiswa, importSiswa } from '@/actions/siswa'
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<User | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [siswaToDelete, setSiswaToDelete] = useState<User | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportSiswaResult | null>(null)
  const [importResultOpen, setImportResultOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Client-side filtering (case-insensitive, by nama_lengkap or nis)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialData
    return initialData.filter(
      (s) =>
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.nis ?? '').toLowerCase().includes(q)
    )
  }, [initialData, search])

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Open modal for create
  const handleAddSiswa = () => {
    setSelectedSiswa(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  // Open modal for edit
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

  // Open confirm dialog for delete
  const handleDeleteClick = (siswa: User) => {
    setSiswaToDelete(siswa)
    setConfirmOpen(true)
  }

  const handleModalClose = () => {
    if (isSubmitting) return
    setModalOpen(false)
    setSelectedSiswa(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleConfirmClose = () => {
    if (isDeleting) return
    setConfirmOpen(false)
    setSiswaToDelete(null)
  }

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Client-side: all fields required
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

      if (!result.success) {
        setFormError(result.error)
        return
      }

      setModalOpen(false)
      setSelectedSiswa(null)
      setForm(EMPTY_FORM)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!siswaToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteSiswa(siswaToDelete.id)
      if (!result.success) {
        // Close confirm dialog and show error via alert (simple inline approach)
        setConfirmOpen(false)
        setSiswaToDelete(null)
        // Re-open with error — use formError pattern via a separate state if needed
        // For now, alert is acceptable for delete errors
        alert(result.error)
        return
      }
      setConfirmOpen(false)
      setSiswaToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

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

      // Cari baris header (yang mengandung "NIS")
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

      const result = await importSiswa(dataRows)
      setImportResult(result)
      setImportResultOpen(true)
    } catch {
      alert('Gagal membaca file. Pastikan file berformat .xlsx yang valid.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input
          type="text"
          placeholder="Cari nama atau NIS..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Cari siswa"
        />
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors whitespace-nowrap"
          >
            Import Excel
          </button>
          <button
            type="button"
            onClick={handleAddSiswa}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nama Lengkap
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                NIS
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Kelas
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {search ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada data siswa.'}
                </td>
              </tr>
            ) : (
              paginated.map((siswa) => (
                <tr key={siswa.id} className="hover:bg-gray-50 transition-colors">
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman sebelumnya"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-3 py-1 border rounded transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                aria-label={`Halaman ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman berikutnya"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Modal Form: Tambah / Edit Siswa */}
      <Modal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={selectedSiswa ? 'Edit Siswa' : 'Tambah Siswa'}
      >
        <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md"
            >
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="siswa-nama" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="siswa-nama"
              type="text"
              value={form.nama_lengkap}
              onChange={(e) => handleFormChange('nama_lengkap', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan nama lengkap"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="siswa-username" className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="siswa-username"
              type="text"
              value={form.username}
              onChange={(e) => handleFormChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan username"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="siswa-nis" className="block text-sm font-medium text-gray-700 mb-1">
              NIS <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="siswa-nis"
              type="text"
              value={form.nis}
              onChange={(e) => handleFormChange('nis', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan NIS"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="siswa-kelas" className="block text-sm font-medium text-gray-700 mb-1">
              Kelas <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="siswa-kelas"
              type="text"
              value={form.kelas}
              onChange={(e) => handleFormChange('kelas', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: XII IPA 1"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="siswa-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="siswa-password"
              type="password"
              value={form.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={selectedSiswa ? 'Kosongkan jika tidak ingin mengubah' : 'Kosongkan untuk pakai NIS sebagai password'}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Menyimpan...
                </span>
              ) : selectedSiswa ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Siswa'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="Import Data Siswa"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Excel (.xlsx)
            </label>
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
          <a
            href="/template-import-siswa.xlsx"
            download
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            Unduh file template
          </a>
        </div>
      </Modal>

      {/* Modal Hasil Import */}
      <Modal
        isOpen={importResultOpen}
        onClose={() => setImportResultOpen(false)}
        title="Hasil Import Excel"
      >
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
                  <p className="text-yellow-600">Dilewati (data kosong)</p>
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
              <div>
                <p className="font-medium text-gray-700 mb-2">Data yang gagal diimpor:</p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err) => (
                    <li key={err.nis} className="text-red-600 bg-red-50 px-3 py-1.5 rounded">
                      NIS {err.nis} — {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Password default setiap siswa = NIS masing-masing. Username = NIS.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setImportResultOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
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
