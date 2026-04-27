-- ============================================================
-- Portal Surat — Migration 004
-- Menambah kolom is_archived untuk fitur arsip siswa
-- Jalankan di Supabase SQL Editor
-- ============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_archived ON public.users(is_archived) WHERE role = 'siswa';

COMMENT ON COLUMN public.users.is_archived IS 'true = siswa diarsipkan (tidak aktif), false = siswa aktif';
