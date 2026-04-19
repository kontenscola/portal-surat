'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { uploadFileSurat, gantiFileSurat } from '@/actions/surat-siswa'
import type { SuratSiswa } from '@/types/akses-surat'

interface UploadFileModalProps {
  isOpen: boolean
  onClose: () => void
  siswaId: string
  kategoriId: string
  existingRecord?: SuratSiswa | null
  onSuccess?: (updated: SuratSiswa) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export default function UploadFileModal({
  isOpen,
  onClose,
  siswaId,
  kategoriId,
  existingRecord,
  onSuccess,
}: UploadFileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isGanti = !!existingRecord?.file_path
  const title = isGanti ? 'Ganti File' : 'Upload File'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setValidationError(null)
    setServerError(null)
    setSelectedFile(file)

    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('Format file harus PDF, JPG, atau PNG')
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_SIZE) {
      setValidationError('Ukuran file maksimal 5 MB')
      setSelectedFile(null)
      return
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setServerError(null)

    if (!selectedFile) {
      setValidationError('File wajib dipilih')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      let result
      if (isGanti && existingRecord) {
        result = await gantiFileSurat(existingRecord.id, formData)
      } else {
        result = await uploadFileSurat(siswaId, kategoriId, formData)
      }

      if (!result.success) {
        setServerError(result.error)
        return
      }

      onSuccess?.(result.data as SuratSiswa)
      handleClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setSelectedFile(null)
    setValidationError(null)
    setServerError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const errorMessage = validationError ?? serverError

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          {isGanti && existingRecord?.file_name && (
            <p className="text-sm text-gray-500">
              File saat ini:{' '}
              <span className="font-medium text-gray-700">{existingRecord.file_name}</span>
            </p>
          )}

          <div>
            <label htmlFor="upload-file-akses" className="block text-sm font-medium text-gray-700 mb-1">
              Pilih File
            </label>
            <input
              id="upload-file-akses"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="upload-hint"
            />
            <p id="upload-hint" className="mt-1 text-xs text-gray-500">
              Format: PDF, JPG, PNG — Maks. 5 MB
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          {selectedFile && !errorMessage && (
            <p className="text-sm text-gray-500">
              Dipilih:{' '}
              <span className="font-medium text-gray-700">{selectedFile.name}</span>
              {' '}({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Mengunggah...' : title}
          </button>
        </div>
      </form>
    </Modal>
  )
}
