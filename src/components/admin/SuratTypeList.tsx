'use client'

import { useState } from 'react'
import type { SuratType } from '@/types/database'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Badge from '@/components/ui/Badge'
import Toggle from '@/components/ui/Toggle'
import {
  createSuratType,
  toggleSuratTypeStatus,
  deleteSuratType,
} from '@/actions/surat-types'

interface SuratTypeListProps {
  initialData: SuratType[]
}

interface FormState {
  nama_surat: string
  kode: string
  deskripsi: string
}

const EMPTY_FORM: FormState = {
  nama_surat: '',
  kode: '',
  deskripsi: '',
}

export default function SuratTypeList({ initialData }: SuratTypeListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  // Delete confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<SuratType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Open modal for create
  const handleAddJenis = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    if (isSubmitting) return
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Client-side: required fields
    if (!form.nama_surat.trim()) {
      setFormError('Nama surat wajib diisi')
      return
    }
    if (!form.kode.trim()) {
      setFormError('Kode wajib diisi')
      return
    }
    if (!/^[A-Z]+$/.test(form.kode.trim())) {
      setFormError('Kode harus huruf kapital semua')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createSuratType({
        nama_surat: form.nama_surat.trim(),
        kode: form.kode.trim(),
        deskripsi: form.deskripsi.trim() || undefined,
      })

      if (!result.success) {
        setFormError(result.error)
        return
      }

      setModalOpen(false)
      setForm(EMPTY_FORM)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (suratType: SuratType) => {
    if (togglingId) return
    setTogglingId(suratType.id)
    try {
      await toggleSuratTypeStatus(suratType.id)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteClick = (suratType: SuratType) => {
    setTypeToDelete(suratType)
    setDeleteError(null)
    setConfirmOpen(true)
  }

  const handleConfirmClose = () => {
    if (isDeleting) return
    setConfirmOpen(false)
    setTypeToDelete(null)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteSuratType(typeToDelete.id)
      if (!result.success) {
        setConfirmOpen(false)
        setTypeToDelete(null)
        setDeleteError(result.error)
        return
      }
      setConfirmOpen(false)
      setTypeToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAddJenis}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <span aria-hidden="true">+</span>
          Tambah Jenis
        </button>
      </div>

      {/* Delete error inline */}
      {deleteError && (
        <div
          role="alert"
          className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md"
        >
          {deleteError}
        </div>
      )}

      {/* Card Grid */}
      {initialData.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Belum ada jenis surat.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialData.map((suratType) => (
            <div
              key={suratType.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-3"
            >
              {/* Header row: nama + status badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {suratType.nama_surat}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono font-medium text-gray-600 bg-gray-100 rounded">
                    {suratType.kode}
                  </span>
                </div>
                <Badge variant={suratType.is_active ? 'active' : 'inactive'} />
              </div>

              {/* Description */}
              {suratType.deskripsi && (
                <p className="text-xs text-gray-500 line-clamp-2">{suratType.deskripsi}</p>
              )}

              {/* Footer row: toggle + delete */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <Toggle
                  checked={suratType.is_active}
                  onChange={() => handleToggle(suratType)}
                  disabled={togglingId === suratType.id}
                  label={suratType.is_active ? 'Aktif' : 'Nonaktif'}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteClick(suratType)}
                  disabled={togglingId === suratType.id}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Hapus jenis surat ${suratType.nama_surat}`}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form: Tambah Jenis Surat */}
      <Modal isOpen={modalOpen} onClose={handleModalClose} title="Tambah Jenis Surat">
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
            <label
              htmlFor="surat-type-nama"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nama Surat <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="surat-type-nama"
              type="text"
              value={form.nama_surat}
              onChange={(e) => handleFormChange('nama_surat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Surat Keterangan Lulus"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label
              htmlFor="surat-type-kode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Kode <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="surat-type-kode"
              type="text"
              value={form.kode}
              onChange={(e) => handleFormChange('kode', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: SKL"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">Harus berupa huruf kapital semua (A–Z).</p>
          </div>

          <div>
            <label
              htmlFor="surat-type-deskripsi"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="surat-type-deskripsi"
              value={form.deskripsi}
              onChange={(e) => handleFormChange('deskripsi', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Deskripsi singkat jenis surat ini"
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
              ) : (
                'Tambah Jenis'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog: Hapus Jenis Surat */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleDeleteConfirm}
        title="Hapus Jenis Surat"
        message={
          typeToDelete
            ? `Apakah Anda yakin ingin menghapus jenis surat "${typeToDelete.nama_surat}" (${typeToDelete.kode})? Jenis surat yang sudah memiliki data akses tidak dapat dihapus.`
            : 'Apakah Anda yakin ingin menghapus jenis surat ini?'
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
