'use client'

import { useState } from 'react'
import type { SuratKategori } from '@/types/akses-surat'
import KategoriCard from './KategoriCard'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createKategori, deleteKategori } from '@/actions/surat-kategori'

interface KategoriGridProps {
  initialData: SuratKategori[]
}

export default function KategoriGrid({ initialData }: KategoriGridProps) {
  const [data, setData] = useState<SuratKategori[]>(initialData)
  const [modalOpen, setModalOpen] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleOpenModal = () => {
    setFormNama('')
    setFormDeskripsi('')
    setFormError(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSubmitting) return
    setModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formNama.trim()) {
      setFormError('Nama kategori wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createKategori({
        nama_kategori: formNama.trim(),
        deskripsi: formDeskripsi.trim() || undefined,
      })

      if (!result.success) {
        setFormError(result.error)
        return
      }

      // Optimistic update
      setData((prev) => [...prev, result.data as SuratKategori])
      setModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const result = await deleteKategori(deletingId)
      if (!result.success) {
        setDeleteError(result.error)
        setConfirmOpen(false)
        return
      }
      setData((prev) => prev.filter((k) => k.id !== deletingId))
      setConfirmOpen(false)
      setDeletingId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const deletingKategori = data.find((k) => k.id === deletingId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Kategori Surat</h2>
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span aria-hidden="true">+</span>
          Tambah Kategori
        </button>
      </div>

      {/* Error hapus */}
      {deleteError && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          {deleteError}
        </div>
      )}

      {/* Grid */}
      {data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">Belum ada kategori surat.</p>
          <p className="mt-1 text-xs text-gray-400">Klik "+ Tambah Kategori" untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((kategori) => (
            <KategoriCard
              key={kategori.id}
              kategori={kategori}
              onDelete={handleDeleteClick}
              isDeleting={isDeleting && deletingId === kategori.id}
            />
          ))}
        </div>
      )}

      {/* Modal Tambah Kategori */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title="Tambah Kategori Surat">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="kategori-nama" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Kategori <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="kategori-nama"
              type="text"
              value={formNama}
              onChange={(e) => setFormNama(e.target.value)}
              placeholder="Contoh: Ijazah, SKL, Transkrip"
              disabled={isSubmitting}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label htmlFor="kategori-deskripsi" className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="kategori-deskripsi"
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value)}
              rows={3}
              placeholder="Deskripsi singkat kategori ini"
              disabled={isSubmitting}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Menyimpan...' : 'Tambah Kategori'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Hapus */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!isDeleting) { setConfirmOpen(false); setDeletingId(null) } }}
        onConfirm={handleDeleteConfirm}
        title="Hapus Kategori"
        message={
          deletingKategori
            ? `Hapus kategori "${deletingKategori.nama_kategori}"? Kategori yang masih memiliki data surat siswa tidak dapat dihapus.`
            : 'Hapus kategori ini?'
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
