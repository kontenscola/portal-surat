export interface User {
  id: string
  username: string
  nis: string | null
  nama_lengkap: string
  kelas: string | null
  role: 'siswa' | 'admin'
  auth_user_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface SuratType {
  id: string
  nama_surat: string
  kode: string
  deskripsi: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SuratAccess {
  id: string
  user_id: string
  surat_type_id: string
  file_url: string | null
  file_name: string | null
  can_download: boolean
  uploaded_at: string
  downloaded_at: string | null
}

// Tipe sesi untuk siswa (disimpan di JWT custom)
export interface SiswaSession {
  user_id: string
  username: string
  nama_lengkap: string
  nis: string
  kelas: string
  role: 'siswa'
  exp: number
}
