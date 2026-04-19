# Portal Surat — Product Requirements Document

## Overview

Portal Surat adalah aplikasi web untuk mengelola distribusi surat digital kepada siswa SMA. Admin dapat mengupload surat, mengatur akses, dan mengelola data siswa. Siswa dapat login dan mengunduh surat yang telah disiapkan.

**Tech Stack:** Next.js (App Router) · Supabase (Auth + Database + Storage) · Tailwind CSS · Vercel

---

## User Stories

### US-1: Login Siswa
**Sebagai** siswa, **saya ingin** login menggunakan username dan NIS, **sehingga** saya bisa mengakses surat-surat saya.

#### Acceptance Criteria
- Landing page menampilkan form login dengan tab toggle "Siswa" dan "Admin"
- Form siswa memiliki field: Username, NIS
- Validasi: kedua field wajib diisi
- Jika username + NIS cocok di database, redirect ke `/dashboard`
- Jika tidak cocok, tampilkan pesan error "Username atau NIS salah"
- Siswa tidak memerlukan password (autentikasi sederhana via NIS)

#### Implementation Notes
- Gunakan Supabase Auth dengan custom sign-in flow atau JWT manual
- Alternatif: gunakan Supabase RPC untuk verifikasi username + NIS, lalu set session cookie
- Session disimpan di cookie httpOnly, expire 24 jam

---

### US-2: Login Admin
**Sebagai** admin, **saya ingin** login menggunakan username dan password, **sehingga** saya bisa mengelola portal.

#### Acceptance Criteria
- Tab "Admin" di landing page menampilkan form: Username, Password
- Validasi: kedua field wajib diisi, password minimal 8 karakter
- Jika cocok, redirect ke `/admin`
- Jika tidak cocok, tampilkan pesan error "Username atau password salah"
- Admin bisa logout dari dashboard

#### Implementation Notes
- Gunakan Supabase Auth `signInWithPassword` untuk admin
- Admin account dibuat via seed script atau Supabase dashboard (bukan self-register)
- Middleware Next.js untuk proteksi route `/admin/*`

---

### US-3: Dashboard Siswa
**Sebagai** siswa yang sudah login, **saya ingin** melihat daftar surat yang tersedia, **sehingga** saya bisa mengunduh surat yang saya butuhkan.

#### Acceptance Criteria
- Halaman menampilkan nama siswa, kelas, dan NIS di header
- Tampilkan grid 2x2 kartu surat berdasarkan jenis surat yang aktif
- Setiap kartu menampilkan: ikon, nama surat, deskripsi singkat
- Jika surat tersedia dan akses diizinkan → tombol "Unduh PDF" aktif (warna)
- Jika surat belum diupload atau akses diblokir → tombol "Belum tersedia" (abu-abu, disabled)
- Klik "Unduh PDF" → download file dari Supabase Storage
- Catat timestamp download di field `downloaded_at`

#### Implementation Notes
- Query: join `surat_access` dengan `surat_types` WHERE `user_id` = current user
- Download via Supabase Storage `createSignedUrl` (expire 60 detik)
- Update `downloaded_at` setelah download berhasil

---

### US-4: Kelola Siswa (Admin)
**Sebagai** admin, **saya ingin** mengelola data siswa, **sehingga** saya bisa menambah, mengedit, dan menghapus siswa penerima surat.

#### Acceptance Criteria
- Tab "Kelola Siswa" di dashboard admin
- Tabel menampilkan: Nama, NIS, Kelas, Aksi (Edit, Hapus)
- Search bar untuk filter siswa berdasarkan nama atau NIS
- Tombol "+ Tambah Siswa" membuka modal form: Nama Lengkap, Username, NIS, Kelas
- Edit membuka modal yang sama dengan data terisi
- Hapus menampilkan konfirmasi dialog sebelum menghapus
- Hapus siswa juga menghapus semua `surat_access` terkait (cascade)
- Validasi: NIS unik, Username unik, semua field wajib

#### Implementation Notes
- CRUD via Supabase client dengan RLS (Row Level Security)
- Pagination: 20 siswa per halaman
- Search: `ilike` query pada kolom `nama_lengkap` dan `nis`

---

### US-5: Master Surat (Admin)
**Sebagai** admin, **saya ingin** mengelola jenis-jenis surat, **sehingga** saya bisa menambah atau menonaktifkan kategori surat.

#### Acceptance Criteria
- Tab "Master Surat" di dashboard admin
- Daftar kartu menampilkan: Nama Surat, Kode, Status (Aktif/Nonaktif)
- Tombol "+ Tambah Jenis" membuka modal: Nama Surat, Kode (uppercase), Deskripsi
- Bisa toggle status aktif/nonaktif per jenis surat
- Jenis surat yang nonaktif tidak muncul di dashboard siswa
- Tidak bisa menghapus jenis surat yang sudah memiliki `surat_access` (soft delete via toggle)

#### Implementation Notes
- Default 4 jenis surat di-seed: SKL, SKKB, TRANSKRIP, IJAZAH
- Kode harus uppercase dan unik
- Toggle update kolom `is_active`

---

### US-6: Akses Surat (Admin)
**Sebagai** admin, **saya ingin** mengupload file surat dan mengatur akses download per siswa, **sehingga** saya bisa mengontrol siapa yang bisa mengunduh surat apa.

#### Acceptance Criteria
- Tab "Akses Surat" di dashboard admin
- Filter: dropdown jenis surat + search siswa
- Tabel menampilkan: Nama Siswa, Jenis Surat (badge), Nama File, Toggle Akses, Aksi (Hapus)
- Tombol "Upload Surat" membuka modal:
  - Pilih siswa (dropdown/search)
  - Pilih jenis surat (dropdown)
  - Upload file PDF (max 10MB)
- Toggle akses: hijau = siswa bisa download, abu-abu = diblokir
- Hapus: konfirmasi dialog, hapus record + file dari storage
- Bulk upload: admin bisa upload surat untuk banyak siswa sekaligus (opsional, fase 2)

#### Implementation Notes
- Upload file ke Supabase Storage bucket `surat-files`
- Path storage: `{surat_type_kode}/{user_id}/{filename}`
- Buat record di `surat_access` dengan `file_url`, `can_download` default true
- Toggle update kolom `can_download`
- RLS: hanya admin yang bisa INSERT/UPDATE/DELETE di `surat_access`

---

## Pages & Routes

| Route | Halaman | Akses |
|-------|---------|-------|
| `/` | Landing page + Login | Public |
| `/dashboard` | Dashboard siswa | Siswa (authenticated) |
| `/admin` | Dashboard admin | Admin (authenticated) |

---

## Data Model

### Tabel: `users`
| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK, default gen_random_uuid() | |
| username | text | UNIQUE, NOT NULL | |
| nis | text | UNIQUE | NULL untuk admin |
| nama_lengkap | text | NOT NULL | |
| kelas | text | | NULL untuk admin |
| role | text | NOT NULL, CHECK ('siswa','admin') | Default 'siswa' |
| created_at | timestamptz | DEFAULT now() | |

### Tabel: `surat_types`
| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK, default gen_random_uuid() | |
| nama_surat | text | NOT NULL | |
| kode | text | UNIQUE, NOT NULL | Uppercase: SKL, SKKB |
| deskripsi | text | | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |

### Tabel: `surat_access`
| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → users.id ON DELETE CASCADE | |
| surat_type_id | uuid | FK → surat_types.id | |
| file_url | text | NOT NULL | Supabase Storage URL |
| file_name | text | NOT NULL | Nama file asli |
| can_download | boolean | DEFAULT true | Toggle akses |
| uploaded_at | timestamptz | DEFAULT now() | |
| downloaded_at | timestamptz | | NULL jika belum |

### Unique Constraint
- `surat_access`: UNIQUE(user_id, surat_type_id) — satu siswa hanya punya satu file per jenis surat

---

## Row Level Security (RLS)

### users
- SELECT: admin bisa lihat semua, siswa hanya lihat diri sendiri
- INSERT/UPDATE/DELETE: hanya admin

### surat_types
- SELECT: semua authenticated user (hanya yang `is_active = true` untuk siswa)
- INSERT/UPDATE/DELETE: hanya admin

### surat_access
- SELECT: admin semua, siswa hanya miliknya sendiri
- INSERT/UPDATE/DELETE: hanya admin
- Siswa hanya bisa download jika `can_download = true`

---

## API Endpoints (Next.js API Routes)

### Auth
- `POST /api/auth/login-siswa` — body: { username, nis }
- `POST /api/auth/login-admin` — body: { username, password }
- `POST /api/auth/logout`

### Siswa
- `GET /api/surat` — daftar surat untuk siswa yang login
- `GET /api/surat/download/[id]` — generate signed URL + update downloaded_at

### Admin
- `GET /api/admin/siswa` — list siswa (search, pagination)
- `POST /api/admin/siswa` — tambah siswa
- `PUT /api/admin/siswa/[id]` — edit siswa
- `DELETE /api/admin/siswa/[id]` — hapus siswa
- `GET /api/admin/surat-types` — list jenis surat
- `POST /api/admin/surat-types` — tambah jenis
- `PUT /api/admin/surat-types/[id]` — edit/toggle jenis
- `GET /api/admin/surat-access` — list akses surat (filter, search)
- `POST /api/admin/surat-access` — upload surat + buat record
- `PUT /api/admin/surat-access/[id]` — toggle can_download
- `DELETE /api/admin/surat-access/[id]` — hapus akses + file

---

## UI Components

### Shared
- `LoginForm` — tab toggle siswa/admin, form fields, submit
- `Navbar` — logo, user info, logout button
- `Modal` — reusable modal wrapper
- `ConfirmDialog` — dialog konfirmasi hapus
- `Badge` — pill badge untuk kode surat (warna per jenis)
- `Toggle` — switch on/off untuk akses surat

### Siswa
- `SuratCard` — kartu surat dengan ikon, nama, deskripsi, tombol download
- `SuratGrid` — grid 2x2 dari SuratCard

### Admin
- `AdminTabs` — tab navigation (Kelola Siswa, Master Surat, Akses Surat)
- `SiswaTable` — tabel CRUD siswa dengan search
- `SuratTypeList` — daftar kartu jenis surat
- `SuratAccessTable` — tabel akses surat dengan filter dan toggle
- `UploadSuratModal` — modal upload dengan pilih siswa, jenis, file

---

## Folder Structure

```
portal-surat/
├── app/
│   ├── page.tsx                    # Landing + Login
│   ├── dashboard/
│   │   └── page.tsx                # Dashboard Siswa
│   ├── admin/
│   │   └── page.tsx                # Dashboard Admin
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login-siswa/route.ts
│   │   │   ├── login-admin/route.ts
│   │   │   └── logout/route.ts
│   │   ├── surat/
│   │   │   ├── route.ts
│   │   │   └── download/[id]/route.ts
│   │   └── admin/
│   │       ├── siswa/route.ts
│   │       ├── surat-types/route.ts
│   │       └── surat-access/route.ts
├── components/
│   ├── ui/                         # Shared UI components
│   ├── siswa/                      # Siswa-specific components
│   └── admin/                      # Admin-specific components
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── middleware.ts           # Auth middleware
│   └── utils.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── middleware.ts                    # Route protection
└── tailwind.config.ts
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Deployment

1. Push ke GitHub
2. Connect repo ke Vercel
3. Set environment variables di Vercel dashboard
4. Supabase project sudah running (free tier cukup)
5. Jalankan migration SQL di Supabase SQL Editor
6. Jalankan seed data untuk admin account + default surat types
7. Deploy

---

## Milestones

### Fase 1 — MVP (1-2 minggu)
- [ ] Setup project Next.js + Supabase + Tailwind
- [ ] Database migration + seed
- [ ] Landing page + login (siswa & admin)
- [ ] Dashboard siswa + download surat
- [ ] Dashboard admin: Kelola Siswa
- [ ] Dashboard admin: Master Surat
- [ ] Dashboard admin: Akses Surat (upload + toggle)
- [ ] Deploy ke Vercel

### Fase 2 — Enhancement
- [ ] Bulk upload surat
- [ ] Export data siswa ke CSV
- [ ] Notifikasi siswa (email/WA) saat surat tersedia
- [ ] Riwayat download per siswa
- [ ] Dark mode
