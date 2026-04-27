'use client'

import { useState, useMemo } from 'react'
import type { User } from '@/types/database'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createSiswa, updateSiswa, deleteSiswa } from '@/actions/siswa'

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
        <button
          type="button"
          onClick={handleAddSiswa}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <span aria-hidden="true">+</span>
          Tambah Siswa
        </button>
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
