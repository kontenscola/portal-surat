'use client'

import React, { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { uploadSuratFile } from '@/actions/surat-access'

interface UploadSuratModalProps {
  isOpen: boolean
  onClose: () => void
  accessId: string
  currentFileName?: string | null // for "Ganti File" mode
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function UploadSuratModal({
  isOpen,
  onClose,
  accessId,
  currentFileName,
}: UploadSuratModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const title = currentFileName ? 'Ganti File' : 'Upload File'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setValidationError(null)
    setServerError(null)
    setSelectedFile(file)

    if (!file) return

    if (file.type !== 'application/pdf') {
      setValidationError('File harus berformat PDF')
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError('Ukuran file maksimal 10 MB')
      setSelectedFile(null)
      return
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)
    setServerError(null)

    if (!selectedFile) {
      setValidationError('File wajib dipilih')
      return
    }

    // Re-validate before submit (in case state is stale)
    if (selectedFile.type !== 'application/pdf') {
      setValidationError('File harus berformat PDF')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setValidationError('Ukuran file maksimal 10 MB')
      return
    }

    setIsLoading(true)
    try {
      const result = await uploadSuratFile(accessId, selectedFile)
      if (!result.success) {
        setServerError(result.error)
        return
      }
      // Success — reset and close
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
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
          {currentFileName && (
            <p className="text-sm text-gray-500">
              File saat ini:{' '}
              <span className="font-medium text-gray-700">{currentFileName}</span>
            </p>
          )}

          <div>
            <label
              htmlFor="upload-surat-file"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              File PDF
            </label>
            <input
              id="upload-surat-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-700
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby={errorMessage ? 'upload-error' : undefined}
              aria-invalid={!!errorMessage}
            />
          </div>

          {errorMessage && (
            <p
              id="upload-error"
              role="alert"
              className="text-sm text-red-600"
            >
              {errorMessage}
            </p>
          )}

          {selectedFile && !errorMessage && (
            <p className="text-sm text-gray-500">
              File dipilih:{' '}
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Mengunggah...' : title}
          </button>
        </div>
      </form>
    </Modal>
  )
}
