# Dokumen Persyaratan — Portal Surat

## Pendahuluan

Portal Surat adalah aplikasi web untuk mengelola distribusi surat digital kepada siswa SMA. Sistem ini memungkinkan Admin mengunggah file surat, mengatur hak akses unduhan, dan mengelola data siswa. Siswa dapat login dan mengunduh surat yang telah disiapkan oleh Admin.

Aplikasi dibangun di atas Next.js (App Router), Supabase (Auth + Database + Storage), Tailwind CSS, dan di-deploy ke Vercel.

---

## Glosarium

- **Sistem**: Aplikasi web Portal Surat secara keseluruhan.
- **Siswa**: Pengguna dengan peran `siswa` yang dapat login dan mengunduh surat miliknya.
- **Admin**: Pengguna dengan peran `admin` yang dapat mengelola data siswa, jenis surat, dan akses surat.
- **NIS**: Nomor Induk Siswa — identifikasi unik setiap siswa.
- **Jenis_Surat**: Kategori surat yang tersedia (contoh: SKL, SKKB, TRANSKRIP, IJAZAH), direpresentasikan oleh tabel `surat_types`.
- **Akses_Surat**: Rekaman yang menghubungkan satu Siswa dengan satu Jenis_Surat, direpresentasikan oleh tabel `surat_access`. Rekaman ini dapat dibuat tanpa file PDF (kolom `file_url` dan `file_name` bersifat opsional/NULL) untuk mendaftarkan siswa sebagai penerima sebelum file tersedia.
- **file_url**: Kolom pada tabel `surat_access` yang menyimpan URL file PDF di Penyimpanan. Bernilai NULL jika file belum diunggah.
- **file_name**: Kolom pada tabel `surat_access` yang menyimpan nama file PDF. Bernilai NULL jika file belum diunggah.
- **can_download**: Kolom boolean pada tabel `surat_access` yang mengontrol apakah siswa diizinkan mengunduh file. Default `true` saat rekaman dibuat. Dapat diubah oleh Admin kapan saja secara independen dari keberadaan file.
- **Autentikator**: Komponen yang memverifikasi identitas pengguna saat login.
- **Pengunduh**: Komponen yang menghasilkan URL bertanda tangan (signed URL) dan mencatat aktivitas unduhan.
- **Penyimpanan**: Supabase Storage bucket `surat-files` tempat file PDF disimpan.
- **Middleware**: Komponen Next.js yang melindungi rute berdasarkan sesi pengguna.
- **RLS**: Row Level Security — kebijakan keamanan tingkat baris di Supabase.

---

## Persyaratan

### Persyaratan 1: Login Siswa

**User Story:** Sebagai siswa, saya ingin login menggunakan username dan NIS, sehingga saya bisa mengakses surat-surat saya.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan halaman landing dengan form login yang memiliki tab toggle "Siswa" dan "Admin".
2. THE Sistem SHALL menampilkan field Username dan NIS pada tab "Siswa".
3. WHEN siswa mengklik tombol login dengan field Username atau NIS kosong, THE Autentikator SHALL menampilkan pesan validasi bahwa kedua field wajib diisi.
4. WHEN siswa mengirimkan Username dan NIS yang cocok dengan data di database, THE Autentikator SHALL membuat sesi pengguna dan mengarahkan siswa ke halaman `/dashboard`.
5. WHEN siswa mengirimkan Username atau NIS yang tidak cocok dengan data di database, THE Autentikator SHALL menampilkan pesan error "Username atau NIS salah" tanpa mengungkap field mana yang salah.
6. THE Autentikator SHALL menyimpan sesi siswa dalam cookie `httpOnly` dengan masa berlaku 24 jam.
7. WHILE siswa memiliki sesi aktif, THE Middleware SHALL mengizinkan akses ke halaman `/dashboard` dan memblokir akses ke halaman `/admin`.

---

### Persyaratan 2: Login Admin

**User Story:** Sebagai admin, saya ingin login menggunakan username dan password, sehingga saya bisa mengelola portal.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan field Username dan Password pada tab "Admin" di halaman landing.
2. WHEN admin mengklik tombol login dengan field Username atau Password kosong, THE Autentikator SHALL menampilkan pesan validasi bahwa kedua field wajib diisi.
3. WHEN admin mengirimkan Password dengan panjang kurang dari 8 karakter, THE Autentikator SHALL menampilkan pesan validasi bahwa password minimal 8 karakter.
4. WHEN admin mengirimkan Username dan Password yang valid dan cocok, THE Autentikator SHALL membuat sesi admin dan mengarahkan admin ke halaman `/admin`.
5. WHEN admin mengirimkan Username atau Password yang tidak cocok, THE Autentikator SHALL menampilkan pesan error "Username atau password salah".
6. WHEN admin mengklik tombol logout, THE Autentikator SHALL menghapus sesi admin dan mengarahkan admin ke halaman `/`.
7. WHILE pengguna tidak memiliki sesi admin aktif, THE Middleware SHALL memblokir akses ke semua rute `/admin/*` dan mengarahkan ke halaman `/`.

---

### Persyaratan 3: Dashboard Siswa

**User Story:** Sebagai siswa yang sudah login, saya ingin melihat daftar surat yang tersedia, sehingga saya bisa mengunduh surat yang saya butuhkan.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan nama lengkap, kelas, dan NIS siswa di bagian header halaman `/dashboard`.
2. THE Sistem SHALL menampilkan kartu surat dalam tata letak grid untuk setiap Jenis_Surat yang berstatus aktif.
3. THE Sistem SHALL menampilkan ikon, nama surat, dan deskripsi singkat pada setiap kartu surat.
4. WHEN Akses_Surat untuk siswa tersebut tersedia dan kolom `can_download` bernilai `true`, THE Sistem SHALL menampilkan tombol "Unduh PDF" yang aktif pada kartu surat yang bersangkutan.
5. WHEN Akses_Surat untuk siswa tersebut belum ada atau kolom `can_download` bernilai `false`, THE Sistem SHALL menampilkan tombol "Belum tersedia" yang dinonaktifkan (disabled) pada kartu surat yang bersangkutan.
6. WHEN siswa mengklik tombol "Unduh PDF", THE Pengunduh SHALL menghasilkan URL bertanda tangan (signed URL) dengan masa berlaku 60 detik dari Penyimpanan dan memulai unduhan file PDF.
7. WHEN unduhan file berhasil dimulai, THE Pengunduh SHALL mencatat timestamp saat ini ke kolom `downloaded_at` pada rekaman Akses_Surat yang bersangkutan.
8. IF Pengunduh gagal menghasilkan signed URL, THEN THE Sistem SHALL menampilkan pesan error kepada siswa bahwa file tidak dapat diunduh saat ini.

---

### Persyaratan 4: Kelola Siswa (Admin)

**User Story:** Sebagai admin, saya ingin mengelola data siswa, sehingga saya bisa menambah, mengedit, dan menghapus siswa penerima surat.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan tab "Kelola Siswa" di dashboard admin dengan tabel yang memuat kolom: Nama Lengkap, NIS, Kelas, dan Aksi (Edit, Hapus).
2. THE Sistem SHALL menampilkan maksimal 20 baris siswa per halaman dengan kontrol paginasi.
3. WHEN admin memasukkan teks pada search bar, THE Sistem SHALL memfilter daftar siswa yang nama lengkap atau NIS-nya mengandung teks tersebut (case-insensitive).
4. WHEN admin mengklik tombol "+ Tambah Siswa", THE Sistem SHALL menampilkan modal form dengan field: Nama Lengkap, Username, NIS, dan Kelas.
5. WHEN admin mengklik tombol "Edit" pada baris siswa, THE Sistem SHALL menampilkan modal form yang sama dengan data siswa tersebut terisi.
6. WHEN admin mengirimkan form tambah atau edit siswa dengan salah satu field kosong, THE Sistem SHALL menampilkan pesan validasi bahwa semua field wajib diisi.
7. WHEN admin mengirimkan form dengan NIS atau Username yang sudah digunakan oleh siswa lain, THE Sistem SHALL menampilkan pesan error bahwa NIS atau Username sudah terdaftar.
8. WHEN admin mengklik tombol "Hapus" pada baris siswa, THE Sistem SHALL menampilkan dialog konfirmasi sebelum melakukan penghapusan.
9. WHEN admin mengkonfirmasi penghapusan siswa, THE Sistem SHALL menghapus data siswa beserta seluruh rekaman Akses_Surat milik siswa tersebut secara cascade.
10. IF operasi tambah, edit, atau hapus siswa gagal, THEN THE Sistem SHALL menampilkan pesan error yang menjelaskan kegagalan tersebut.

---

### Persyaratan 5: Master Surat (Admin)

**User Story:** Sebagai admin, saya ingin mengelola jenis-jenis surat, sehingga saya bisa menambah atau menonaktifkan kategori surat.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan tab "Master Surat" di dashboard admin dengan daftar kartu yang memuat: Nama Surat, Kode, dan Status (Aktif/Nonaktif).
2. WHEN admin mengklik tombol "+ Tambah Jenis", THE Sistem SHALL menampilkan modal form dengan field: Nama Surat, Kode, dan Deskripsi.
3. WHEN admin mengirimkan form tambah jenis surat dengan field Nama Surat atau Kode kosong, THE Sistem SHALL menampilkan pesan validasi bahwa field tersebut wajib diisi.
4. WHEN admin mengirimkan form dengan Kode yang mengandung huruf kecil, THE Sistem SHALL menolak input dan menampilkan pesan validasi bahwa Kode harus berupa huruf kapital semua (uppercase).
5. WHEN admin mengirimkan form dengan Kode yang sudah digunakan oleh Jenis_Surat lain, THE Sistem SHALL menampilkan pesan error bahwa Kode sudah terdaftar.
6. WHEN admin mengklik toggle status pada kartu Jenis_Surat, THE Sistem SHALL memperbarui kolom `is_active` pada Jenis_Surat tersebut ke nilai yang berlawanan.
7. WHILE Jenis_Surat berstatus nonaktif (`is_active = false`), THE Sistem SHALL tidak menampilkan Jenis_Surat tersebut di dashboard siswa.
8. WHEN admin mencoba menghapus Jenis_Surat yang sudah memiliki rekaman Akses_Surat, THE Sistem SHALL menolak penghapusan dan menampilkan pesan bahwa jenis surat tidak dapat dihapus karena sudah memiliki data akses.

---

### Persyaratan 6: Akses Surat — Daftarkan Penerima, Upload File, dan Kontrol Akses (Admin)

**User Story:** Sebagai admin, saya ingin mendaftarkan siswa sebagai penerima suatu kategori surat, mengunggah file PDF untuk masing-masing siswa, dan mengontrol akses unduhan per siswa, sehingga distribusi surat dapat dikelola secara bertahap dan fleksibel.

#### Kriteria Penerimaan

**Tampilan Tabel Akses Surat**

1. THE Sistem SHALL menampilkan tab "Akses Surat" di dashboard admin dengan tabel yang memuat kolom: Nama Siswa, Jenis Surat (badge), Status File (sudah upload / belum), Toggle Akses (blokir/buka), dan Aksi (Upload File atau Ganti File, Hapus).
2. THE Sistem SHALL menyediakan filter berupa dropdown Jenis_Surat untuk menyaring data pada tabel Akses Surat berdasarkan kategori surat.
3. WHEN rekaman Akses_Surat belum memiliki file (`file_url` bernilai NULL), THE Sistem SHALL menampilkan tombol "Upload File" pada kolom Aksi baris tersebut.
4. WHEN rekaman Akses_Surat sudah memiliki file (`file_url` tidak NULL), THE Sistem SHALL menampilkan tombol "Ganti File" pada kolom Aksi baris tersebut.

**Tahap 1 — Daftarkan Penerima**

5. WHEN admin mengklik tombol "+ Tambah Penerima", THE Sistem SHALL menampilkan modal form dengan dua field: dropdown pilihan Jenis_Surat dan dropdown/search pilihan Siswa penerima.
6. WHEN admin mengirimkan form tambah penerima dengan salah satu field (Jenis_Surat atau Siswa) kosong, THE Sistem SHALL menampilkan pesan validasi bahwa semua field wajib diisi.
7. WHEN admin mengirimkan form tambah penerima dengan semua field valid, THE Sistem SHALL membuat rekaman Akses_Surat baru dengan `file_url` bernilai NULL, `file_name` bernilai NULL, dan `can_download` bernilai `true`.
8. WHEN admin mencoba mendaftarkan kombinasi Siswa dan Jenis_Surat yang sudah memiliki rekaman Akses_Surat, THE Sistem SHALL menampilkan pesan error bahwa siswa tersebut sudah terdaftar sebagai penerima untuk jenis surat tersebut.

**Tahap 2 — Upload File**

9. WHEN admin mengklik tombol "Upload File" atau "Ganti File" pada baris Akses_Surat, THE Sistem SHALL menampilkan modal form dengan satu field input upload file PDF.
10. WHEN admin mengunggah file yang bukan bertipe PDF atau berukuran lebih dari 10 MB, THE Sistem SHALL menolak file tersebut dan menampilkan pesan validasi yang sesuai.
11. WHEN admin mengirimkan form upload file dengan field file PDF kosong, THE Sistem SHALL menampilkan pesan validasi bahwa file wajib dipilih.
12. WHEN admin mengirimkan form upload file dengan file PDF yang valid, THE Sistem SHALL mengunggah file ke Penyimpanan dengan path `{kode_surat}/{user_id}/{nama_file}` dan memperbarui kolom `file_url` serta `file_name` pada rekaman Akses_Surat yang bersangkutan.

**Kontrol Akses (Blokir/Buka)**

13. WHEN admin mengklik toggle akses pada baris Akses_Surat, THE Sistem SHALL memperbarui kolom `can_download` pada rekaman tersebut ke nilai yang berlawanan, terlepas dari apakah file sudah ada atau belum.
14. WHILE rekaman Akses_Surat memiliki `can_download` bernilai `false`, THE Sistem SHALL menampilkan status "Diblokir" pada toggle akses baris tersebut meskipun `file_url` tidak NULL.

**Hapus Penerima**

15. WHEN admin mengklik tombol "Hapus" pada baris Akses_Surat, THE Sistem SHALL menampilkan dialog konfirmasi sebelum melakukan penghapusan.
16. WHEN admin mengkonfirmasi penghapusan Akses_Surat yang memiliki file (`file_url` tidak NULL), THE Sistem SHALL menghapus rekaman dari database dan menghapus file PDF yang bersangkutan dari Penyimpanan.
17. WHEN admin mengkonfirmasi penghapusan Akses_Surat yang belum memiliki file (`file_url` bernilai NULL), THE Sistem SHALL menghapus rekaman dari database tanpa operasi penghapusan file di Penyimpanan.
18. IF penghapusan file dari Penyimpanan gagal, THEN THE Sistem SHALL tetap menghapus rekaman dari database dan mencatat kegagalan penghapusan file di log server.

---

### Persyaratan 7: Keamanan Akses dan RLS

**User Story:** Sebagai admin, saya ingin memastikan data siswa dan file surat terlindungi, sehingga tidak ada pengguna yang dapat mengakses data milik orang lain.

#### Kriteria Penerimaan

1. WHILE pengguna tidak memiliki sesi yang valid, THE Middleware SHALL memblokir akses ke rute `/dashboard` dan `/admin/*` serta mengarahkan ke halaman `/`.
2. WHILE pengguna memiliki sesi dengan peran `siswa`, THE RLS SHALL memastikan query ke tabel `users` hanya mengembalikan data milik siswa tersebut.
3. WHILE pengguna memiliki sesi dengan peran `siswa`, THE RLS SHALL memastikan query ke tabel `surat_access` hanya mengembalikan rekaman milik siswa tersebut.
4. WHILE pengguna memiliki sesi dengan peran `siswa`, THE RLS SHALL memastikan query ke tabel `surat_types` hanya mengembalikan Jenis_Surat yang berstatus aktif.
5. WHILE pengguna memiliki sesi dengan peran `siswa`, THE Penyimpanan SHALL hanya mengizinkan akses unduhan file yang terdaftar dalam Akses_Surat milik siswa tersebut dengan `can_download = true`.
6. WHILE pengguna memiliki sesi dengan peran `admin`, THE RLS SHALL mengizinkan operasi SELECT, INSERT, UPDATE, dan DELETE pada tabel `users`, `surat_types`, dan `surat_access`.
7. THE Sistem SHALL tidak mengizinkan pendaftaran akun baru secara mandiri (self-register) untuk peran apapun melalui antarmuka publik.

---

### Persyaratan 8: Validasi Data dan Integritas

**User Story:** Sebagai admin, saya ingin sistem memvalidasi semua input data, sehingga integritas data di database selalu terjaga.

#### Kriteria Penerimaan

1. THE Sistem SHALL memastikan kolom `username` pada tabel `users` bersifat unik di seluruh data.
2. THE Sistem SHALL memastikan kolom `nis` pada tabel `users` bersifat unik di seluruh data siswa.
3. THE Sistem SHALL memastikan kolom `kode` pada tabel `surat_types` bersifat unik dan selalu dalam format huruf kapital.
4. THE Sistem SHALL memastikan kombinasi `(user_id, surat_type_id)` pada tabel `surat_access` bersifat unik, sehingga satu siswa hanya memiliki satu file per Jenis_Surat.
5. WHEN rekaman siswa dihapus dari tabel `users`, THE Sistem SHALL secara otomatis menghapus seluruh rekaman Akses_Surat yang berelasi melalui constraint `ON DELETE CASCADE`.
6. WHEN admin mencoba menghapus Jenis_Surat yang masih direferensikan oleh rekaman Akses_Surat, THE Sistem SHALL menolak penghapusan melalui constraint `ON DELETE RESTRICT`.
