'use client'

import React, { useState, useTransition } from 'react'
import Badge from '@/components/ui/Badge'
import Toggle from '@/components/ui/Toggle'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import UploadSuratModal from '@/components/admin/UploadSuratModal'
import { createSuratAccess, toggleCanDownload, deleteSuratAccess } from '@/actions/surat-access'
import type { SuratType } from '@/types/database'

export interface SuratAccessRow {
  id: string
  user_id: string
  surat_type_id: string
  file_url: string | null
  file_name: string | null
  can_download: boolean
  uploaded_at: string
  downloaded_at: string | null
  // joined fields
  user_nama_lengkap: string
  surat_type_nama: string
  surat_type_kode: string
}

interface SiswaOption {
  id: string
  nama_lengkap: string
  nis: string | null
}

interface SuratAccessTableProps {
  initialData: SuratAccessRow[]
  suratTypes: SuratType[]
  siswaList: SiswaOption[]
}

export default function SuratAccessTable({
  initialData,
  suratTypes,
  siswaList,
}: SuratAccessTableProps) {
  const [filterJenis, setFilterJenis] = useState<string>('')
  const [data, setData] = useState<SuratAccessRow[]>(initialData)

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedUploadAccess, setSelectedUploadAccess] = useState<SuratAccessRow | null>(null)

  // Confirm delete dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedDeleteAccess, setSelectedDeleteAccess] = useState<SuratAccessRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  // Tambah Penerima modal state
  const [tambahOpen, setTambahOpen] = useState(false)
  const [tambahUserId, setTambahUserId] = useState('')
  const [tambahSuratTypeId, setTambahSuratTypeId] = useState('')
  const [tambahError, setTambahError] = useState<string | null>(null)
  const [isTambahLoading, startTambahTransition] = useTransition()

  // Toggle loading state per row
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Filtered rows
  const filteredData = filterJenis
    ? data.filter((row) => row.surat_type_id === filterJenis)
    : data

  // --- Handlers ---

  function handleOpenUpload(row: SuratAccessRow) {
    setSelectedUploadAccess(row)
    setUploadModalOpen(true)
  }

  function handleCloseUpload() {
    setUploadModalOpen(false)
    setSelectedUploadAccess(null)
  }

  function handleOpenDelete(row: SuratAccessRow) {
    setSelectedDeleteAccess(row)
    setDeleteError(null)
    setConfirmOpen(true)
  }

  function handleCloseDelete() {
    if (isDeleting) return
    setConfirmOpen(false)
    setSelectedDeleteAccess(null)
    setDeleteError(null)
  }

  function handleConfirmDelete() {
    if (!selectedDeleteAccess) return
    const accessId = selectedDeleteAccess.id
    startDeleteTransition(async () => {
      const result = await deleteSuratAccess(accessId)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      setData((prev) => prev.filter((r) => r.id !== accessId))
      setConfirmOpen(false)
      setSelectedDeleteAccess(null)
    })
  }

  async function handleToggle(row: SuratAccessRow) {
    if (togglingIds.has(row.id)) return
    setTogglingIds((prev) => new Set(prev).add(row.id))
    try {
      const result = await toggleCanDownload(row.id)
      if (result.success) {
        setData((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, can_download: !r.can_download } : r
          )
        )
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  function handleOpenTambah() {
    setTambahUserId('')
    setTambahSuratTypeId('')
    setTambahError(null)
    setTambahOpen(true)
  }

  function handleCloseTambah() {
    if (isTambahLoading) return
    setTambahOpen(false)
    setTambahUserId('')
    setTambahSuratTypeId('')
    setTambahError(null)
  }

  function handleTambahSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTambahError(null)

    if (!tambahUserId || !tambahSuratTypeId) {
      setTambahError('Semua field wajib diisi')
      return
    }

    startTambahTransition(async () => {
      const result = await createSuratAccess({
        user_id: tambahUserId,
        surat_type_id: tambahSuratTypeId,
      })

      if (!result.success) {
        setTambahError(result.error)
        return
      }

      // Optimistically add the new row using joined data from local state
      const siswa = siswaList.find((s) => s.id === tambahUserId)
      const suratType = suratTypes.find((st) => st.id === tambahSuratTypeId)
      if (siswa && suratType && result.data) {
        const newRecord = result.data as {
          id: string
          user_id: string
          surat_type_id: string
          file_url: string | null
          file_name: string | null
          can_download: boolean
          uploaded_at: string
          downloaded_at: string | null
        }
        const newRow: SuratAccessRow = {
          ...newRecord,
          user_nama_lengkap: siswa.nama_lengkap,
          surat_type_nama: suratType.nama_surat,
          surat_type_kode: suratType.kode,
        }
        setData((prev) => [...prev, newRow])
      }

      setTambahOpen(false)
      setTambahUserId('')
      setTambahSuratTypeId('')
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-jenis" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter Jenis:
          </label>
          <select
            id="filter-jenis"
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Jenis</option>
            {suratTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.kode} — {st.nama_surat}
              </option>
            ))}
          </select>
        </div>

        {/* Tambah Penerima button */}
        <button
          type="button"
          onClick={handleOpenTambah}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Tambah Penerima
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nama Siswa
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Jenis Surat
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status File
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Toggle Akses
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {filterJenis
                    ? 'Tidak ada data untuk jenis surat yang dipilih.'
                    : 'Belum ada penerima surat terdaftar.'}
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {/* Nama Siswa */}
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {row.user_nama_lengkap}
                  </td>

                  {/* Jenis Surat */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {row.surat_type_kode}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">{row.surat_type_nama}</span>
                  </td>

                  {/* Status File */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.file_url !== null ? (
                      <Badge variant="uploaded" />
                    ) : (
                      <Badge variant="not-uploaded" />
                    )}
                  </td>

                  {/* Toggle Akses */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={row.can_download}
                        onChange={() => handleToggle(row)}
                        disabled={togglingIds.has(row.id)}
                        label={row.can_download ? 'Aktif' : undefined}
                      />
                      {!row.can_download && <Badge variant="blocked" />}
                    </div>
                  </td>

                  {/* Aksi */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Upload / Ganti File */}
                      <button
                        type="button"
                        onClick={() => handleOpenUpload(row)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                      >
                        {row.file_url === null ? 'Upload File' : 'Ganti File'}
                      </button>

                      {/* Hapus */}
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(row)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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

      {/* Upload / Ganti File Modal */}
      {selectedUploadAccess && (
        <UploadSuratModal
          isOpen={uploadModalOpen}
          onClose={handleCloseUpload}
          accessId={selectedUploadAccess.id}
          currentFileName={selectedUploadAccess.file_name}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Hapus Penerima Surat"
        message={
          selectedDeleteAccess
            ? `Apakah Anda yakin ingin menghapus akses surat "${selectedDeleteAccess.surat_type_kode}" untuk ${selectedDeleteAccess.user_nama_lengkap}?${
                selectedDeleteAccess.file_url
                  ? ' File PDF yang terkait juga akan dihapus dari penyimpanan.'
                  : ''
              }`
            : 'Apakah Anda yakin ingin menghapus rekaman ini?'
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />

      {/* Delete error (shown below dialog if needed) */}
      {deleteError && confirmOpen && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {deleteError}
        </p>
      )}

      {/* Tambah Penerima Modal */}
      <Modal isOpen={tambahOpen} onClose={handleCloseTambah} title="Tambah Penerima Surat">
        <form onSubmit={handleTambahSubmit} noValidate>
          <div className="space-y-4">
            {/* Dropdown Jenis Surat */}
            <div>
              <label
                htmlFor="tambah-surat-type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Jenis Surat <span className="text-red-500">*</span>
              </label>
              <select
                id="tambah-surat-type"
                value={tambahSuratTypeId}
                onChange={(e) => setTambahSuratTypeId(e.target.value)}
                disabled={isTambahLoading}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-required="true"
              >
                <option value="">-- Pilih Jenis Surat --</option>
                {suratTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.kode} — {st.nama_surat}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Siswa */}
            <div>
              <label
                htmlFor="tambah-siswa"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Siswa <span className="text-red-500">*</span>
              </label>
              <select
                id="tambah-siswa"
                value={tambahUserId}
                onChange={(e) => setTambahUserId(e.target.value)}
                disabled={isTambahLoading}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-required="true"
              >
                <option value="">-- Pilih Siswa --</option>
                {siswaList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_lengkap}{s.nis ? ` (${s.nis})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Error message */}
            {tambahError && (
              <p role="alert" className="text-sm text-red-600">
                {tambahError}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseTambah}
              disabled={isTambahLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isTambahLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTambahLoading ? 'Menyimpan...' : 'Tambah Penerima'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
