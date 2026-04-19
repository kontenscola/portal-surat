-- ============================================================
-- Portal Surat — Supabase Database Schema
-- Migration: 001_initial_schema.sql
-- Jalankan di Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 2. TABLES
-- ============================================================

-- Tabel Users (siswa + admin dalam satu tabel)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    nis TEXT UNIQUE,                                     -- NULL untuk admin
    nama_lengkap TEXT NOT NULL,
    kelas TEXT,                                          -- NULL untuk admin
    role TEXT NOT NULL DEFAULT 'siswa'
        CHECK (role IN ('siswa', 'admin')),
    auth_user_id UUID REFERENCES auth.users(id),         -- Link ke Supabase Auth (untuk admin)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk pencarian
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_nama ON public.users(nama_lengkap);
CREATE INDEX idx_users_nis ON public.users(nis) WHERE nis IS NOT NULL;
CREATE INDEX idx_users_auth ON public.users(auth_user_id) WHERE auth_user_id IS NOT NULL;

COMMENT ON TABLE public.users IS 'Data siswa dan admin portal surat';
COMMENT ON COLUMN public.users.nis IS 'Nomor Induk Siswa - NULL untuk admin';
COMMENT ON COLUMN public.users.auth_user_id IS 'Link ke auth.users untuk admin login';


-- Tabel Surat Types (master jenis surat)
CREATE TABLE public.surat_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_surat TEXT NOT NULL,
    kode TEXT UNIQUE NOT NULL,                           -- SKL, SKKB, TRANSKRIP, IJAZAH
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce uppercase kode
ALTER TABLE public.surat_types
    ADD CONSTRAINT surat_types_kode_upper CHECK (kode = UPPER(kode));

CREATE INDEX idx_surat_types_active ON public.surat_types(is_active);

COMMENT ON TABLE public.surat_types IS 'Master jenis surat yang tersedia';
COMMENT ON COLUMN public.surat_types.kode IS 'Kode unik uppercase, misal: SKL, SKKB';


-- Tabel Surat Access (penghubung: file + akses per siswa)
CREATE TABLE public.surat_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    surat_type_id UUID NOT NULL REFERENCES public.surat_types(id) ON DELETE RESTRICT,
    file_url TEXT,                                       -- Supabase Storage URL/path (NULL jika belum upload)
    file_name TEXT,                                      -- Nama file asli (NULL jika belum upload)
    can_download BOOLEAN NOT NULL DEFAULT true,          -- Toggle akses oleh admin
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    downloaded_at TIMESTAMPTZ,                           -- NULL jika belum pernah diunduh

    -- Satu siswa hanya punya satu file per jenis surat
    UNIQUE(user_id, surat_type_id)
);

CREATE INDEX idx_surat_access_user ON public.surat_access(user_id);
CREATE INDEX idx_surat_access_type ON public.surat_access(surat_type_id);
CREATE INDEX idx_surat_access_download ON public.surat_access(can_download);

COMMENT ON TABLE public.surat_access IS 'File surat per siswa dengan kontrol akses download';
COMMENT ON COLUMN public.surat_access.can_download IS 'Toggle oleh admin: true = siswa bisa download';
COMMENT ON COLUMN public.surat_access.downloaded_at IS 'Timestamp download pertama, NULL jika belum';


-- 3. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_surat_types
    BEFORE UPDATE ON public.surat_types
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_access ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user saat ini adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: ambil user_id dari auth
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- === USERS RLS ===

-- Admin bisa lihat semua user
CREATE POLICY "Admin can view all users"
    ON public.users FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Siswa hanya bisa lihat diri sendiri
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

-- Hanya admin yang bisa CRUD user
CREATE POLICY "Admin can insert users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update users"
    ON public.users FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin can delete users"
    ON public.users FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- === SURAT_TYPES RLS ===

-- Semua authenticated user bisa lihat jenis surat aktif
CREATE POLICY "Anyone can view active surat types"
    ON public.surat_types FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Hanya admin yang bisa CRUD
CREATE POLICY "Admin can insert surat types"
    ON public.surat_types FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update surat types"
    ON public.surat_types FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin can delete surat types"
    ON public.surat_types FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- === SURAT_ACCESS RLS ===

-- Admin bisa lihat semua akses surat
CREATE POLICY "Admin can view all surat access"
    ON public.surat_access FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Siswa hanya bisa lihat surat miliknya
CREATE POLICY "Users can view own surat access"
    ON public.surat_access FOR SELECT
    TO authenticated
    USING (user_id = public.current_user_id());

-- Hanya admin yang bisa CRUD
CREATE POLICY "Admin can insert surat access"
    ON public.surat_access FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update surat access"
    ON public.surat_access FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin can delete surat access"
    ON public.surat_access FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- 5. STORAGE BUCKET
-- ============================================================
-- Jalankan ini di SQL Editor atau buat manual di Supabase Dashboard > Storage

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'surat-files',
    'surat-files',
    false,                                               -- Private bucket
    10485760,                                            -- 10MB max
    ARRAY['application/pdf']                             -- Hanya PDF
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admin bisa upload/delete, siswa bisa download miliknya
CREATE POLICY "Admin can upload surat files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'surat-files'
        AND public.is_admin()
    );

CREATE POLICY "Admin can delete surat files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'surat-files'
        AND public.is_admin()
    );

CREATE POLICY "Users can download own surat files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'surat-files'
        AND (
            public.is_admin()
            OR EXISTS (
                SELECT 1 FROM public.surat_access sa
                WHERE sa.file_url = name
                AND sa.user_id = public.current_user_id()
                AND sa.can_download = true
            )
        )
    );


-- 6. VIEWS (optional, untuk kemudahan query)
-- ============================================================

-- View: daftar surat per siswa (untuk dashboard siswa)
CREATE OR REPLACE VIEW public.v_surat_siswa AS
SELECT
    sa.id AS access_id,
    sa.user_id,
    u.nama_lengkap,
    u.nis,
    u.kelas,
    st.id AS surat_type_id,
    st.nama_surat,
    st.kode AS surat_kode,
    st.deskripsi AS surat_deskripsi,
    sa.file_url,
    sa.file_name,
    sa.can_download,
    sa.uploaded_at,
    sa.downloaded_at
FROM public.surat_access sa
JOIN public.users u ON u.id = sa.user_id
JOIN public.surat_types st ON st.id = sa.surat_type_id
WHERE st.is_active = true;

COMMENT ON VIEW public.v_surat_siswa IS 'View gabungan surat_access + users + surat_types untuk dashboard';


-- View: ringkasan akses surat untuk admin
CREATE OR REPLACE VIEW public.v_admin_surat_access AS
SELECT
    sa.id AS access_id,
    sa.user_id,
    u.nama_lengkap,
    u.nis,
    u.kelas,
    st.nama_surat,
    st.kode AS surat_kode,
    sa.file_name,
    sa.file_url,
    sa.can_download,
    sa.uploaded_at,
    sa.downloaded_at,
    CASE WHEN sa.downloaded_at IS NOT NULL THEN true ELSE false END AS sudah_diunduh
FROM public.surat_access sa
JOIN public.users u ON u.id = sa.user_id
JOIN public.surat_types st ON st.id = sa.surat_type_id
ORDER BY u.nama_lengkap, st.kode;

COMMENT ON VIEW public.v_admin_surat_access IS 'View lengkap untuk halaman Akses Surat admin';

