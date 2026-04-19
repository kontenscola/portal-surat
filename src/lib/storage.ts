/**
 * Membangun path storage untuk file surat.
 * Format: {kode_surat}/{user_id}/{nama_file}
 */
export function buildStoragePath(kodeSurat: string, userId: string, namaFile: string): string {
  return `${kodeSurat}/${userId}/${namaFile}`
}
