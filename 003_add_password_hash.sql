-- ============================================================
-- Portal Surat — Migration 003
-- Menambah kolom password_hash untuk login siswa berbasis NIS + Password
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Enable pgcrypto untuk bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tambah kolom password_hash (nullable dulu sebelum diisi)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Set default password = hash(NIS) untuk siswa yang sudah ada
-- Password default = NIS masing-masing siswa
UPDATE public.users
SET password_hash = crypt(nis, gen_salt('bf', 10))
WHERE role = 'siswa'
  AND nis IS NOT NULL
  AND password_hash IS NULL;

-- Setelah semua siswa punya hash, tambahkan constraint NOT NULL khusus siswa
-- (admin tidak perlu password_hash karena pakai Supabase Auth)
-- Constraint ini optional; kita biarkan nullable agar admin tidak terpengaruh
-- dan validasi dilakukan di aplikasi.

COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt hash password siswa. Default = hash(NIS). NULL untuk admin (pakai Supabase Auth).';
