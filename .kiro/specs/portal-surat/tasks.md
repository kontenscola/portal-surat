# Rencana Implementasi: Portal Surat

## Ikhtisar

Implementasi Portal Surat secara bertahap: mulai dari fondasi proyek, autentikasi, dashboard siswa, fitur admin (kelola siswa, master surat, akses surat), hingga keamanan dan pengujian akhir. Setiap tahap divalidasi sebelum melanjutkan ke tahap berikutnya.

## Tugas

- [x] 1. Inisialisasi proyek dan konfigurasi fondasi
  - Buat proyek Next.js 14 dengan App Router, TypeScript, dan Tailwind CSS
  - Instal dependensi: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `jose` (untuk JWT custom), `vitest`, `@testing-library/react`, `fast-check`, `msw`
  - Buat file `src/lib/supabase/client.ts`, `server.ts`, dan `admin.ts` sesuai desain
  - Buat file `src/types/database.ts` dengan semua tipe TypeScript (`User`, `SuratType`, `SuratAccess`, `SiswaSession`)
  - Buat file `src/lib/auth/session.ts` dengan helper JWT custom (sign, verify) menggunakan `jose`
  - Konfigurasi environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
  - _Persyaratan: 1.6, 2.4_

- [x] 2. Implementasi skema validasi Zod
  - [x] 2.1 Buat `src/lib/validations/auth.ts` dengan `loginSiswaSchema` dan `loginAdminSchema`
    - `loginSiswaSchema`: username dan nis wajib diisi (min 1)
    - `loginAdminSchema`: username wajib diisi, password minimal 8 karakter
    - _Persyaratan: 1.3, 2.2, 2.3_

  - [ ]* 2.2 Tulis property test untuk `loginSiswaSchema` (Properti 1)
    - **Properti 1: Validasi Input Login Menolak Field Kosong/Whitespace**
    - **Memvalidasi: Persyaratan 1.3**
    - Gunakan `fc.string()` yang difilter hanya whitespace/kosong; pastikan `safeParse` selalu gagal

  - [ ]* 2.3 Tulis property test untuk `loginAdminSchema` (Properti 3)
    - **Properti 3: Validasi Password Admin Menolak Password Pendek**
    - **Memvalidasi: Persyaratan 2.3**
    - Gunakan `fc.string({ maxLength: 7 })` untuk input pendek; `fc.string({ minLength: 8 })` untuk input valid

  - [x] 2.4 Buat `src/lib/validations/siswa.ts` dengan `createSiswaSchema` dan `updateSiswaSchema`
    - Semua field (nama_lengkap, username, nis, kelas) wajib diisi
    - _Persyaratan: 4.6_

  - [ ]* 2.5 Tulis property test untuk `createSiswaSchema` (Properti 10)
    - **Properti 10: Validasi Form Siswa Menolak Field Kosong**
    - **Memvalidasi: Persyaratan 4.6**

  - [x] 2.6 Buat `src/lib/validations/surat-type.ts` dengan `createSuratTypeSchema`
    - `kode` harus uppercase (`/^[A-Z]+$/`)
    - _Persyaratan: 5.3, 5.4_

  - [ ]* 2.7 Tulis property test untuk `createSuratTypeSchema` (Properti 11)
    - **Properti 11: Validasi Kode Surat Menolak Format Non-Uppercase**
    - **Memvalidasi: Persyaratan 5.4**
    - Gunakan `fc.string().filter(s => /[a-z]/.test(s))` untuk input tidak valid

  - [x] 2.8 Buat `src/lib/validations/surat-access.ts` dengan `createSuratAccessSchema` dan `uploadFileSchema`
    - `uploadFileSchema`: tipe MIME `application/pdf`, ukuran maks 10 MB
    - _Persyaratan: 6.6, 6.10_

  - [ ]* 2.9 Tulis property test untuk `uploadFileSchema` (Properti 16)
    - **Properti 16: Validasi File Upload Menolak Non-PDF dan File Terlalu Besar**
    - **Memvalidasi: Persyaratan 6.10**

- [x] 3. Checkpoint — Pastikan semua skema validasi dan property test berjalan
  - Jalankan `vitest --run` dan pastikan semua test lulus. Tanyakan kepada pengguna jika ada pertanyaan.

- [x] 4. Implementasi autentikasi siswa
  - [x] 4.1 Buat `src/app/api/auth/login-siswa/route.ts`
    - Validasi input dengan `loginSiswaSchema`
    - Query `users` WHERE username=? AND nis=? AND role='siswa' menggunakan Supabase admin client
    - Jika cocok: buat JWT custom dengan `session.ts`, set cookie `httpOnly`, redirect ke `/dashboard`
    - Jika tidak cocok: kembalikan 401 "Username atau NIS salah"
    - _Persyaratan: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 4.2 Tulis property test untuk autentikasi siswa (Properti 2)
    - **Properti 2: Autentikasi Siswa Gagal untuk Kredensial Tidak Valid**
    - **Memvalidasi: Persyaratan 1.5**
    - Mock Supabase client; untuk setiap (username, nis) yang tidak ada di DB, pastikan response 401 dan tidak ada cookie sesi

  - [x] 4.3 Buat `src/app/api/auth/login-admin/route.ts`
    - Validasi input dengan `loginAdminSchema`
    - Panggil `supabase.auth.signInWithPassword`; verifikasi role='admin' di tabel `users`
    - Set session cookie, redirect ke `/admin`
    - _Persyaratan: 2.2, 2.3, 2.4, 2.5_

  - [x] 4.4 Buat `src/app/api/auth/logout/route.ts`
    - Hapus cookie sesi (siswa dan admin), redirect ke `/`
    - _Persyaratan: 2.6_

- [x] 5. Implementasi middleware proteksi rute
  - Buat `src/middleware.ts`
  - Verifikasi JWT custom dari cookie untuk rute `/dashboard`
  - Verifikasi sesi Supabase Auth untuk rute `/admin/*`
  - Redirect ke `/` jika sesi tidak valid atau tidak ada
  - Blokir siswa dari mengakses `/admin/*`
  - _Persyaratan: 1.7, 2.7, 7.1_
  - Buat `src/lib/auth/middleware-helpers.ts` dengan fungsi helper verifikasi

- [x] 6. Implementasi halaman login (Landing Page)
  - [x] 6.1 Buat komponen `src/components/auth/LoginForm.tsx`
    - Tab toggle "Siswa" / "Admin"
    - Form siswa: field Username dan NIS
    - Form admin: field Username dan Password
    - State: `activeTab`, `isLoading`, `error`
    - Submit ke API route yang sesuai
    - _Persyaratan: 1.1, 1.2, 2.1_

  - [x] 6.2 Buat `src/app/page.tsx` yang merender `LoginForm`
    - Redirect ke `/dashboard` jika sudah ada sesi siswa
    - Redirect ke `/admin` jika sudah ada sesi admin
    - _Persyaratan: 1.1_

- [x] 7. Implementasi dashboard siswa
  - [x] 7.1 Buat komponen `src/components/siswa/SuratCard.tsx`
    - Terima props `suratType` dan `access` sesuai interface di desain
    - Tampilkan ikon, nama surat, deskripsi
    - Tombol "Unduh PDF" aktif jika `access?.can_download === true`
    - Tombol "Belum tersedia" disabled dalam semua kondisi lain
    - _Persyaratan: 3.3, 3.4, 3.5_

  - [ ]* 7.2 Tulis property test untuk `SuratCard` (Properti 6)
    - **Properti 6: Status Tombol Kartu Surat Sesuai Kondisi Akses**
    - **Memvalidasi: Persyaratan 3.4, 3.5**
    - Gunakan `@testing-library/react`; generate kombinasi (access=null, can_download=true/false) dengan `fast-check`

  - [x] 7.3 Buat komponen `src/components/siswa/SuratGrid.tsx`
    - Terima daftar `surat_types` (hanya yang aktif) dan daftar `surat_access` milik siswa
    - Render `SuratCard` untuk setiap jenis surat aktif
    - _Persyaratan: 3.2_

  - [ ]* 7.4 Tulis property test untuk `SuratGrid` (Properti 5)
    - **Properti 5: Grid Surat Hanya Menampilkan Jenis Surat Aktif**
    - **Memvalidasi: Persyaratan 3.2, 5.7**
    - Pastikan jumlah kartu yang dirender == jumlah `surat_types` dengan `is_active = true`

  - [x] 7.5 Buat `src/app/dashboard/page.tsx` (React Server Component)
    - Ambil data sesi siswa dari cookie
    - Query `surat_types` (aktif) dan `surat_access` milik siswa dari Supabase
    - Tampilkan header dengan nama lengkap, kelas, NIS
    - Render `SuratGrid`
    - _Persyaratan: 3.1, 3.2_

  - [ ]* 7.6 Tulis property test untuk header dashboard (Properti 4)
    - **Properti 4: Header Dashboard Siswa Selalu Menampilkan Data Lengkap**
    - **Memvalidasi: Persyaratan 3.1**
    - Untuk setiap data siswa valid, pastikan nama_lengkap, kelas, dan nis muncul di output render

- [x] 8. Implementasi API download surat
  - [x] 8.1 Buat `src/app/api/surat/download/[id]/route.ts`
    - Verifikasi sesi siswa dari cookie
    - Query `surat_access` WHERE id=? AND user_id=? AND can_download=true
    - Buat signed URL dengan masa berlaku 60 detik menggunakan Supabase Storage
    - Update `downloaded_at = now()` pada rekaman
    - Redirect ke signed URL
    - Kembalikan 403/404 jika akses ditolak atau file tidak ada
    - _Persyaratan: 3.6, 3.7, 3.8_

  - [ ]* 8.2 Tulis property test untuk pencatatan timestamp download (Properti 7)
    - **Properti 7: Pencatatan Timestamp Download**
    - **Memvalidasi: Persyaratan 3.7**
    - Mock Supabase; pastikan `downloaded_at` selalu non-NULL setelah download berhasil

- [x] 9. Checkpoint — Pastikan alur siswa berjalan end-to-end
  - Jalankan `vitest --run` dan pastikan semua test lulus. Tanyakan kepada pengguna jika ada pertanyaan.

- [x] 10. Implementasi komponen UI umum
  - Buat `src/components/ui/Modal.tsx` — modal dialog generik dengan overlay
  - Buat `src/components/ui/ConfirmDialog.tsx` — dialog konfirmasi dengan tombol Batal/Konfirmasi
  - Buat `src/components/ui/Badge.tsx` — badge status (aktif/nonaktif, sudah upload/belum)
  - Buat `src/components/ui/Toggle.tsx` — toggle switch untuk kontrol akses
  - _Persyaratan: 4.8, 5.6, 6.13, 6.14_

- [x] 11. Implementasi Server Actions dan fitur Kelola Siswa (Admin)
  - [x] 11.1 Buat `src/actions/siswa.ts` dengan `createSiswa`, `updateSiswa`, `deleteSiswa`
    - Validasi input dengan `createSiswaSchema`
    - Gunakan Supabase admin client untuk operasi DB
    - Tangani error duplikat NIS/username dengan pesan spesifik
    - `deleteSiswa` mengandalkan `ON DELETE CASCADE` untuk hapus `surat_access` terkait
    - _Persyaratan: 4.6, 4.7, 4.9, 4.10_

  - [x] 11.2 Buat komponen `src/components/admin/SiswaTable.tsx`
    - Client component dengan state: `search`, `page`, `modalOpen`, `selectedSiswa`
    - Tabel dengan kolom: Nama Lengkap, NIS, Kelas, Aksi (Edit, Hapus)
    - Paginasi 20 baris per halaman
    - Search bar yang memfilter nama atau NIS (case-insensitive)
    - Tombol "+ Tambah Siswa" membuka modal form
    - Tombol "Edit" membuka modal form dengan data terisi
    - Tombol "Hapus" membuka `ConfirmDialog`
    - _Persyaratan: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_

  - [ ]* 11.3 Tulis property test untuk paginasi siswa (Properti 8)
    - **Properti 8: Paginasi Tidak Melebihi Batas Per Halaman**
    - **Memvalidasi: Persyaratan 4.2**
    - Untuk setiap N siswa, pastikan tidak ada halaman yang menampilkan lebih dari 20 baris

  - [ ]* 11.4 Tulis property test untuk pencarian siswa (Properti 9)
    - **Properti 9: Pencarian Siswa Bersifat Case-Insensitive dan Konsisten**
    - **Memvalidasi: Persyaratan 4.3**
    - Buat fungsi `filterSiswa(list, query)` dan uji dengan `fast-check`

- [x] 12. Implementasi Server Actions dan fitur Master Surat (Admin)
  - [x] 12.1 Buat `src/actions/surat-types.ts` dengan `createSuratType`, `toggleSuratTypeStatus`, `deleteSuratType`
    - `createSuratType`: validasi dengan `createSuratTypeSchema`, tangani error kode duplikat
    - `toggleSuratTypeStatus`: UPDATE `is_active = NOT is_active`
    - `deleteSuratType`: tangani error `ON DELETE RESTRICT` dengan pesan yang sesuai
    - _Persyaratan: 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ]* 12.2 Tulis property test untuk toggle status jenis surat (Properti 12)
    - **Properti 12: Toggle Status Jenis Surat Bersifat Reversibel**
    - **Memvalidasi: Persyaratan 5.6**
    - Mock Supabase; panggil `toggleSuratTypeStatus` dua kali, pastikan nilai kembali ke semula

  - [x] 12.3 Buat komponen `src/components/admin/SuratTypeList.tsx`
    - Daftar kartu dengan: Nama Surat, Kode, Status (Badge aktif/nonaktif)
    - Toggle status menggunakan komponen `Toggle`
    - Tombol "+ Tambah Jenis" membuka modal form
    - _Persyaratan: 5.1, 5.2, 5.6_

- [x] 13. Implementasi Server Actions dan fitur Akses Surat (Admin)
  - [x] 13.1 Buat `src/actions/surat-access.ts` dengan semua action akses surat
    - `createSuratAccess`: buat rekaman baru dengan `file_url=NULL`, `file_name=NULL`, `can_download=true`
    - `uploadSuratFile`: upload ke Storage path `{kode_surat}/{user_id}/{nama_file}`, update `file_url` dan `file_name`
    - `toggleCanDownload`: UPDATE `can_download = NOT can_download`
    - `deleteSuratAccess`: hapus rekaman DB; jika `file_url` tidak NULL, hapus file dari Storage; log jika Storage gagal
    - _Persyaratan: 6.7, 6.8, 6.12, 6.13, 6.16, 6.17, 6.18_

  - [ ]* 13.2 Tulis property test untuk rekaman baru akses surat (Properti 15)
    - **Properti 15: Rekaman Baru Akses Surat Dibuat dengan State Awal yang Benar**
    - **Memvalidasi: Persyaratan 6.7**
    - Mock Supabase insert; pastikan `file_url=NULL`, `file_name=NULL`, `can_download=true` pada setiap rekaman baru

  - [ ]* 13.3 Tulis property test untuk toggle akses download (Properti 18)
    - **Properti 18: Toggle Akses Download Bersifat Reversibel**
    - **Memvalidasi: Persyaratan 6.13**
    - Panggil `toggleCanDownload` dua kali; pastikan nilai kembali ke semula

  - [x] 13.4 Buat fungsi helper `buildStoragePath(kodeSurat, userId, namaFile): string`
    - Kembalikan string `{kode_surat}/{user_id}/{nama_file}`
    - _Persyaratan: 6.12_

  - [ ]* 13.5 Tulis property test untuk `buildStoragePath` (Properti 17)
    - **Properti 17: Path Storage Mengikuti Format yang Ditentukan**
    - **Memvalidasi: Persyaratan 6.12**
    - Untuk setiap (kode, userId, namaFile), pastikan output == `{kode}/{userId}/{namaFile}`

  - [x] 13.6 Buat komponen `src/components/admin/UploadSuratModal.tsx`
    - Modal dengan input file PDF
    - Validasi tipe MIME dan ukuran di sisi klien sebelum submit
    - Tampilkan pesan error validasi inline
    - _Persyaratan: 6.9, 6.10, 6.11_

  - [x] 13.7 Buat komponen `src/components/admin/SuratAccessTable.tsx`
    - Client component dengan state: `filterJenis`, `modalOpen`, `selectedAccess`
    - Tabel dengan kolom: Nama Siswa, Jenis Surat (Badge), Status File, Toggle Akses, Aksi
    - Dropdown filter berdasarkan `surat_type_id`
    - Tombol "Upload File" jika `file_url=NULL`, "Ganti File" jika tidak NULL
    - Toggle akses menggunakan komponen `Toggle`
    - Tombol "Hapus" membuka `ConfirmDialog`
    - _Persyaratan: 6.1, 6.2, 6.3, 6.4, 6.14, 6.15_

  - [ ]* 13.8 Tulis property test untuk filter tabel akses surat (Properti 13)
    - **Properti 13: Filter Tabel Akses Surat Konsisten dengan Jenis Surat**
    - **Memvalidasi: Persyaratan 6.2**
    - Untuk setiap filter `surat_type_id`, semua rekaman yang ditampilkan harus memiliki `surat_type_id` yang sama

  - [ ]* 13.9 Tulis property test untuk tampilan tombol aksi (Properti 14)
    - **Properti 14: Tampilan Tombol Aksi Sesuai Keberadaan File**
    - **Memvalidasi: Persyaratan 6.3, 6.4**
    - `file_url=NULL` → tombol "Upload File"; `file_url` tidak NULL → tombol "Ganti File"

- [x] 14. Implementasi dashboard admin
  - Buat komponen `src/components/admin/AdminTabs.tsx` dengan tiga tab: Kelola Siswa, Master Surat, Akses Surat
  - Buat `src/app/admin/page.tsx` (React Server Component)
    - Ambil data awal: daftar siswa, jenis surat, akses surat dari Supabase
    - Render `AdminTabs` dengan data awal sebagai props
    - Tombol logout yang memanggil `/api/auth/logout`
    - _Persyaratan: 4.1, 5.1, 6.1_

- [x] 15. Checkpoint — Pastikan semua fitur admin berjalan
  - Jalankan `vitest --run` dan pastikan semua test lulus. Tanyakan kepada pengguna jika ada pertanyaan.

- [x] 16. Implementasi keamanan dan isolasi data
  - [x] 16.1 Verifikasi RLS di layer aplikasi
    - Pastikan semua query dari sesi siswa menggunakan Supabase client dengan cookie sesi (bukan service role)
    - Pastikan Server Actions admin menggunakan service role client
    - _Persyaratan: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 16.2 Tulis property test untuk isolasi data antar siswa (Properti 19)
    - **Properti 19: Isolasi Data Antar Siswa (RLS)**
    - **Memvalidasi: Persyaratan 7.3**
    - Mock Supabase RLS; untuk setiap pasangan (siswa_A, siswa_B), pastikan query dengan sesi siswa_A tidak mengembalikan rekaman milik siswa_B

  - [x] 16.3 Tambahkan smoke test untuk endpoint publik
    - Verifikasi tidak ada endpoint self-register yang dapat diakses tanpa autentikasi
    - Verifikasi middleware memblokir `/dashboard` dan `/admin/*` tanpa sesi
    - _Persyaratan: 7.1, 7.7_

- [x] 17. Penanganan error dan error boundary
  - Tambahkan `error.tsx` di `src/app/dashboard/` dan `src/app/admin/` sebagai error boundary
  - Pastikan semua Server Actions mengembalikan `ActionResult` dengan pesan error yang tidak mengungkap detail internal
  - Pastikan API routes mengembalikan HTTP status code yang sesuai (401, 403, 404)
  - _Persyaratan: 3.8, 4.10, 5.8, 6.18_

- [x] 18. Checkpoint akhir — Pastikan semua test lulus dan integrasi berjalan
  - Jalankan `vitest --run` dan pastikan semua test lulus.
  - Verifikasi alur lengkap: login siswa → dashboard → unduh surat.
  - Verifikasi alur lengkap: login admin → kelola siswa → master surat → akses surat → logout.
  - Tanyakan kepada pengguna jika ada pertanyaan.

## Catatan

- Tugas bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap tugas mereferensikan persyaratan spesifik untuk keterlacakan
- Property test menggunakan `fast-check` dengan minimum 100 iterasi (`{ numRuns: 100 }`)
- Setiap property test diberi komentar tag: `// Feature: portal-surat, Properti N: ...`
- Siswa menggunakan JWT custom (bukan Supabase Auth); admin menggunakan Supabase Auth
- Semua mutasi data melalui Server Actions; download melalui API Route
