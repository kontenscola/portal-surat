-- ============================================================
-- Portal Surat — Migration 002: Menu Akses Surat
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. TABEL KATEGORI SURAT
CREATE TABLE public.surat_kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kategori TEXT NOT NULL UNIQUE,
  deskripsi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.surat_kategori IS 'Kategori/jenis surat yang tersedia';

-- 2. TABEL SURAT SISWA
CREATE TABLE public.surat_siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL REFERENCES public.surat_kategori(id) ON DELETE RESTRICT,
  file_path TEXT,
  file_name TEXT,
  akses_download BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(siswa_id, kategori_id)
);

CREATE INDEX idx_surat_siswa_siswa ON public.surat_siswa(siswa_id);
CREATE INDEX idx_surat_siswa_kategori ON public.surat_siswa(kategori_id);

COMMENT ON TABLE public.surat_siswa IS 'File surat per siswa per kategori dengan kontrol akses download';
COMMENT ON COLUMN public.surat_siswa.akses_download IS 'Default false — admin buka manual';

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.surat_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_siswa ENABLE ROW LEVEL SECURITY;

-- surat_kategori: admin full access, semua authenticated user bisa baca
CREATE POLICY "Admin full access surat_kategori"
  ON public.surat_kategori FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read surat_kategori"
  ON public.surat_kategori FOR SELECT
  TO authenticated
  USING (true);

-- surat_siswa: admin full access, siswa hanya baca miliknya
CREATE POLICY "Admin full access surat_siswa"
  ON public.surat_siswa FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Siswa can read own surat_siswa"
  ON public.surat_siswa FOR SELECT
  TO authenticated
  USING (siswa_id = public.current_user_id());

-- 4. STORAGE POLICY TAMBAHAN
CREATE POLICY "Admin can update surat files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'surat-files'
    AND public.is_admin()
  );
