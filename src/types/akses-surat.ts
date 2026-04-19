export interface SuratKategori {
  id: string
  nama_kategori: string
  deskripsi: string | null
  created_at: string
}

export interface SuratSiswa {
  id: string
  siswa_id: string
  kategori_id: string
  file_path: string | null
  file_name: string | null
  akses_download: boolean
  uploaded_by: string | null
  uploaded_at: string
}

// Row gabungan untuk tabel admin (join dengan users)
export interface SuratSiswaRow extends SuratSiswa {
  siswa_nis: string | null
  siswa_nama: string
  siswa_kelas: string | null
}

// Item untuk halaman "Surat Saya" siswa (join dengan surat_kategori)
export interface SuratSayaItem {
  id: string
  kategori_id: string
  kategori_nama: string
  file_name: string | null
  file_path: string | null
  akses_download: boolean
  uploaded_at: string
}
