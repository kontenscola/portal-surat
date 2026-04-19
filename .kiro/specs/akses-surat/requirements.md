# Dokumen Persyaratan — Menu Akses Surat

## Pendahuluan

Menu Akses Surat adalah fitur pengganti sistem lama (`surat_types` + `surat_access`) yang memperkenalkan pendekatan baru berbasis kategori surat. Admin dapat mengelola kategori surat, mengunggah file surat per siswa (PDF/JPG/PNG, maks 5 MB), dan mengontrol akses unduhan per siswa secara individual. Siswa dapat melihat dan mengunduh file surat miliknya melalui halaman "Surat Saya".

Fitur ini dibangun di atas **Next.js 14 (App Router)**, **Supabase** (PostgreSQL + Storage), dan **Tailwind CSS**. Autentikasi siswa menggunakan JWT custom via cookie `siswa_session`, sedangkan admin menggunakan Supabase Auth.

---

## Glosarium

- **Sistem**: Aplikasi web Portal Surat secara keseluruhan.
- **Admin**: Pengguna dengan peran `admin` yang mengelola kategori, file surat, dan akses unduhan.
- **Siswa**: Pengguna dengan peran `siswa` yang dapat melihat dan mengunduh file surat miliknya.
- **NIS**: Nomor Induk Siswa — identifikasi unik setiap siswa.
- **Kategori_Surat**: Kategori pengelompokan surat, direpresentasikan oleh tabel `surat_kategori` (kolom: `id`, `nama_kategori`, `deskripsi`).
- **Surat_Siswa**: Rekaman file surat milik satu siswa dalam satu kategori, direpresentasikan oleh tabel `surat_siswa` (kolom: `id`, `siswa_id`, `kategori_id`, `file_path`, `file_name`, `akses_download`, `uploaded_by`, `uploaded_at`).
- **akses_download**: Kolom boolean pada tabel `surat_siswa` yang mengontrol apakah siswa diizinkan mengunduh file. Default `false` saat rekaman dibuat.
- **file_path**: Kolom pada tabel `surat_siswa` yang menyimpan path file di Supabase Storage bucket `surat-files`. Bernilai NULL jika file belum diunggah.
- **file_name**: Kolom pada tabel `surat_siswa` yang menyimpan nama file asli. Bernilai NULL jika file belum diunggah.
- **Pengunggah**: Komponen server yang memproses upload file ke Supabase Storage dan memperbarui rekaman `surat_siswa`.
- **Pengunduh**: Komponen server yang menghasilkan URL bertanda tangan (signed URL) untuk unduhan file.
- **Penyimpanan**: Supabase Storage bucket `surat-files` tempat file surat disimpan.
- **Middleware**: Komponen Next.js yang melindungi rute berdasarkan sesi pengguna.
- **RLS**: Row Level Security — kebijakan keamanan tingkat baris di Supabase.
- **Toggle_Akses**: Komponen UI yang mengubah nilai `akses_download` via AJAX tanpa reload halaman.

---

## Persyaratan

### Persyaratan 1: Manajemen Kategori Surat (Admin)

**User Story:** Sebagai admin, saya ingin mengelola kategori surat, sehingga saya bisa mengorganisir jenis-jenis surat yang tersedia.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan halaman Menu Akses Surat dengan grid kartu kategori, di mana setiap kartu menampilkan nama kategori dan deskripsinya.
2. THE Sistem SHALL menampilkan tombol "+ Tambah Kategori" di halaman Menu Akses Surat.
3. WHEN admin mengklik tombol "+ Tambah Kategori", THE Sistem SHALL menampilkan modal form dengan field: Nama Kategori (wajib) dan Deskripsi (opsional).
4. WHEN admin mengirimkan form tambah kategori dengan field Nama Kategori kosong atau hanya berisi whitespace, THE Sistem SHALL menampilkan pesan validasi bahwa Nama Kategori wajib diisi.
5. WHEN admin mengirimkan form tambah kategori dengan Nama Kategori yang sudah digunakan oleh kategori lain, THE Sistem SHALL menampilkan pesan error bahwa nama kategori sudah terdaftar.
6. WHEN admin mengirimkan form tambah kategori dengan data valid, THE Sistem SHALL menyimpan rekaman baru ke tabel `surat_kategori` dan memperbarui tampilan grid tanpa reload halaman penuh.
7. WHEN admin mengklik kartu kategori, THE Sistem SHALL menampilkan halaman listing siswa dalam kategori tersebut.

---

### Persyaratan 2: Listing Siswa per Kategori (Admin)

**User Story:** Sebagai admin, saya ingin melihat daftar siswa beserta status file dan akses unduhan dalam suatu kategori, sehingga saya bisa mengelola distribusi surat secara efisien.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan tabel listing siswa dalam kategori yang dipilih dengan kolom: NIS, Nama, Kelas, Status File, Toggle Akses Download, dan Aksi (Upload/Ganti/Hapus).
2. THE Sistem SHALL menampilkan kolom Status File dengan nilai "Sudah Upload" jika `file_path` tidak NULL, atau "Belum Upload" jika `file_path` bernilai NULL.
3. THE Sistem SHALL menampilkan Toggle_Akses pada setiap baris yang mencerminkan nilai `akses_download` rekaman `surat_siswa` yang bersangkutan.
4. WHEN rekaman `surat_siswa` untuk siswa tersebut belum ada atau `file_path` bernilai NULL, THE Sistem SHALL menampilkan tombol "Upload" pada kolom Aksi baris tersebut.
5. WHEN rekaman `surat_siswa` untuk siswa tersebut sudah ada dan `file_path` tidak NULL, THE Sistem SHALL menampilkan tombol "Ganti" pada kolom Aksi baris tersebut.
6. THE Sistem SHALL menyediakan filter dropdown Kelas untuk menyaring daftar siswa berdasarkan kelas.
7. THE Sistem SHALL menyediakan filter dropdown Status Upload (Semua / Sudah Upload / Belum Upload) untuk menyaring daftar siswa berdasarkan keberadaan file.
8. THE Sistem SHALL menyediakan filter dropdown Status Akses (Semua / Akses Dibuka / Akses Ditutup) untuk menyaring daftar siswa berdasarkan nilai `akses_download`.
9. WHEN admin memasukkan teks pada search bar, THE Sistem SHALL memfilter daftar siswa yang nama lengkap atau NIS-nya mengandung teks tersebut secara case-insensitive.
10. WHEN admin mengklik tombol "Hapus" pada baris siswa, THE Sistem SHALL menampilkan dialog konfirmasi sebelum melakukan penghapusan rekaman `surat_siswa`.

---

### Persyaratan 3: Upload File Surat per Siswa (Admin)

**User Story:** Sebagai admin, saya ingin mengunggah file surat untuk setiap siswa, sehingga siswa dapat mengunduh surat miliknya.

#### Kriteria Penerimaan

1. WHEN admin mengklik tombol "Upload" atau "Ganti" pada baris siswa, THE Sistem SHALL menampilkan modal form dengan satu field input file.
2. THE Sistem SHALL menampilkan informasi format yang diterima (PDF, JPG, PNG) dan batas ukuran (maks 5 MB) pada modal upload.
3. WHEN admin memilih file dengan tipe selain PDF, JPG, atau PNG, THE Sistem SHALL menolak file tersebut dan menampilkan pesan validasi bahwa format file tidak didukung.
4. WHEN admin memilih file dengan ukuran lebih dari 5 MB, THE Sistem SHALL menolak file tersebut dan menampilkan pesan validasi bahwa ukuran file melebihi batas 5 MB.
5. WHEN admin mengirimkan form upload tanpa memilih file, THE Sistem SHALL menampilkan pesan validasi bahwa file wajib dipilih.
6. WHEN admin mengirimkan form upload dengan file yang valid, THE Pengunggah SHALL mengunggah file ke Penyimpanan dengan path `{kategori_id}/{siswa_id}/{timestamp}_{nama_file_asli}` dan memperbarui kolom `file_path` serta `file_name` pada rekaman `surat_siswa` yang bersangkutan.
7. WHEN admin mengunggah file pengganti (Ganti), THE Pengunggah SHALL menghapus file lama dari Penyimpanan sebelum menyimpan file baru.
8. IF Pengunggah gagal mengunggah file ke Penyimpanan, THEN THE Sistem SHALL menampilkan pesan error kepada admin dan tidak memperbarui rekaman `surat_siswa`.
9. WHEN upload file berhasil, THE Sistem SHALL menutup modal dan memperbarui baris tabel yang bersangkutan tanpa reload halaman penuh.

---

### Persyaratan 4: Toggle Akses Download (Admin)

**User Story:** Sebagai admin, saya ingin mengontrol akses unduhan per siswa secara individual, sehingga saya bisa membuka atau menutup akses kapan saja.

#### Kriteria Penerimaan

1. WHEN admin mengklik Toggle_Akses pada baris siswa, THE Sistem SHALL mengirimkan permintaan AJAX ke server untuk memperbarui kolom `akses_download` pada rekaman `surat_siswa` ke nilai yang berlawanan.
2. WHEN permintaan AJAX toggle berhasil, THE Sistem SHALL memperbarui tampilan Toggle_Akses pada baris tersebut secara langsung tanpa reload halaman.
3. WHEN permintaan AJAX toggle gagal, THE Sistem SHALL mengembalikan Toggle_Akses ke posisi semula dan menampilkan pesan error kepada admin.
4. THE Sistem SHALL mengizinkan toggle `akses_download` terlepas dari apakah `file_path` sudah ada atau masih NULL.
5. WHILE rekaman `surat_siswa` memiliki `akses_download` bernilai `false`, THE Sistem SHALL menampilkan Toggle_Akses dalam posisi OFF pada baris tersebut.
6. WHILE rekaman `surat_siswa` memiliki `akses_download` bernilai `true`, THE Sistem SHALL menampilkan Toggle_Akses dalam posisi ON pada baris tersebut.

---

### Persyaratan 5: Halaman "Surat Saya" (Siswa)

**User Story:** Sebagai siswa yang sudah login, saya ingin melihat daftar file surat milik saya, sehingga saya bisa mengunduh surat yang saya butuhkan.

#### Kriteria Penerimaan

1. THE Sistem SHALL menampilkan halaman "Surat Saya" yang dapat diakses oleh siswa yang memiliki sesi aktif.
2. THE Sistem SHALL menampilkan daftar rekaman `surat_siswa` milik siswa yang sedang login, dikelompokkan berdasarkan nama kategori.
3. THE Sistem SHALL menampilkan nama file, nama kategori, dan tanggal upload pada setiap item daftar.
4. WHEN rekaman `surat_siswa` memiliki `akses_download` bernilai `true` dan `file_path` tidak NULL, THE Sistem SHALL menampilkan tombol "Download" yang aktif pada item tersebut.
5. WHEN rekaman `surat_siswa` memiliki `akses_download` bernilai `false` atau `file_path` bernilai NULL, THE Sistem SHALL menampilkan tombol "Download" yang dinonaktifkan (disabled) pada item tersebut.
6. WHEN siswa mengklik tombol "Download" yang aktif, THE Pengunduh SHALL menghasilkan signed URL dengan masa berlaku 60 detik dari Penyimpanan dan memulai unduhan file.
7. IF Pengunduh gagal menghasilkan signed URL, THEN THE Sistem SHALL menampilkan pesan error bahwa file tidak dapat diunduh saat ini.

---

### Persyaratan 6: Migrasi dari Sistem Lama

**User Story:** Sebagai admin, saya ingin sistem baru menggantikan sistem lama secara bersih, sehingga tidak ada data yang hilang dan tidak ada konflik antara sistem lama dan baru.

#### Kriteria Penerimaan

1. THE Sistem SHALL membuat tabel `surat_kategori` dengan kolom: `id` (UUID, PK), `nama_kategori` (TEXT, NOT NULL, UNIQUE), `deskripsi` (TEXT, nullable), `created_at` (TIMESTAMPTZ).
2. THE Sistem SHALL membuat tabel `surat_siswa` dengan kolom: `id` (UUID, PK), `siswa_id` (UUID, FK ke `users.id`, ON DELETE CASCADE), `kategori_id` (UUID, FK ke `surat_kategori.id`, ON DELETE RESTRICT), `file_path` (TEXT, nullable), `file_name` (TEXT, nullable), `akses_download` (BOOLEAN, NOT NULL, DEFAULT false), `uploaded_by` (UUID, FK ke `users.id`, nullable), `uploaded_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()).
3. THE Sistem SHALL memastikan kombinasi `(siswa_id, kategori_id)` pada tabel `surat_siswa` bersifat unik, sehingga satu siswa hanya memiliki satu file per kategori.
4. THE Sistem SHALL menonaktifkan atau menghapus rute, komponen, dan Server Actions yang berkaitan dengan sistem lama (`surat_types`, `surat_access`) setelah sistem baru aktif.
5. WHEN rekaman siswa dihapus dari tabel `users`, THE Sistem SHALL secara otomatis menghapus seluruh rekaman `surat_siswa` milik siswa tersebut melalui constraint `ON DELETE CASCADE`.
6. WHEN admin mencoba menghapus kategori yang masih direferensikan oleh rekaman `surat_siswa`, THE Sistem SHALL menolak penghapusan melalui constraint `ON DELETE RESTRICT`.

---

### Persyaratan 7: Keamanan dan Isolasi Data

**User Story:** Sebagai admin, saya ingin memastikan data surat dan file terlindungi, sehingga siswa hanya dapat mengakses data dan file miliknya sendiri.

#### Kriteria Penerimaan

1. WHILE pengguna tidak memiliki sesi yang valid, THE Middleware SHALL memblokir akses ke rute `/dashboard`, `/surat-saya`, dan `/admin/*` serta mengarahkan ke halaman login.
2. WHILE pengguna memiliki sesi dengan peran `siswa`, THE RLS SHALL memastikan query ke tabel `surat_siswa` hanya mengembalikan rekaman di mana `siswa_id` sama dengan ID siswa yang sedang login.
3. WHILE pengguna memiliki sesi dengan peran `siswa`, THE Penyimpanan SHALL hanya mengizinkan akses unduhan file yang terdaftar dalam rekaman `surat_siswa` milik siswa tersebut dengan `akses_download = true`.
4. WHILE pengguna memiliki sesi dengan peran `admin`, THE RLS SHALL mengizinkan operasi SELECT, INSERT, UPDATE, dan DELETE pada tabel `surat_kategori` dan `surat_siswa`.
5. THE Sistem SHALL memvalidasi kepemilikan rekaman `surat_siswa` di sisi server sebelum menghasilkan signed URL unduhan, terlepas dari kebijakan RLS.
6. THE Sistem SHALL tidak mengizinkan siswa mengakses endpoint toggle `akses_download` — endpoint tersebut hanya dapat dipanggil oleh sesi admin yang valid.

---

### Persyaratan 8: Validasi Data dan Integritas

**User Story:** Sebagai admin, saya ingin sistem memvalidasi semua input, sehingga integritas data di database selalu terjaga.

#### Kriteria Penerimaan

1. THE Sistem SHALL memastikan kolom `nama_kategori` pada tabel `surat_kategori` bersifat unik di seluruh data.
2. THE Sistem SHALL memastikan kombinasi `(siswa_id, kategori_id)` pada tabel `surat_siswa` bersifat unik.
3. WHEN file diunggah, THE Pengunggah SHALL memvalidasi tipe MIME file (harus `application/pdf`, `image/jpeg`, atau `image/png`) dan ukuran file (maksimal 5 MB) di sisi server sebelum meneruskan ke Penyimpanan.
4. WHEN toggle `akses_download` dipanggil, THE Sistem SHALL memvalidasi bahwa rekaman `surat_siswa` dengan ID yang diberikan benar-benar ada sebelum melakukan pembaruan.
5. IF operasi database gagal karena constraint violation, THEN THE Sistem SHALL mengembalikan pesan error yang deskriptif kepada admin tanpa mengungkap detail teknis internal.
