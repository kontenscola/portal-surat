-- ============================================================
-- Portal Surat — Seed Data
-- Jalankan SETELAH migration 001_initial_schema.sql
-- ============================================================

-- 1. SEED: Default Surat Types
-- ============================================================

INSERT INTO public.surat_types (nama_surat, kode, deskripsi, is_active) VALUES
    ('Surat Keterangan Lulus', 'SKL', 'Surat keterangan kelulusan resmi dari sekolah', true),
    ('Surat Keterangan Kelakuan Baik', 'SKKB', 'Surat keterangan berkelakuan baik untuk keperluan pendaftaran', true),
    ('Transkrip Nilai', 'TRANSKRIP', 'Ringkasan nilai raport selama masa studi', true),
    ('Prosedur Pengambilan Ijazah', 'IJAZAH', 'Undangan dan prosedur pengambilan ijazah asli', false)
ON CONFLICT (kode) DO NOTHING;


-- 2. SEED: Admin Account
-- ============================================================
-- PENTING: Buat admin user di Supabase Auth TERLEBIH DAHULU via dashboard:
--   1. Buka Supabase Dashboard > Authentication > Users
--   2. Klik "Add User" > masukkan email: admin@portalsurat.local, password: [password kuat]
--   3. Catat UUID yang dihasilkan
--   4. Ganti 'GANTI_DENGAN_AUTH_USER_ID' di bawah dengan UUID tersebut

-- INSERT INTO public.users (username, nama_lengkap, role, auth_user_id) VALUES
--     ('admin', 'Administrator', 'admin', 'GANTI_DENGAN_AUTH_USER_ID');


-- 3. SEED: Contoh Data Siswa (untuk development)
-- ============================================================
-- Hapus atau komentari bagian ini untuk production

INSERT INTO public.users (username, nis, nama_lengkap, kelas, role) VALUES
    ('ahmad.fauzi', '20240001', 'Ahmad Fauzi', 'XII IPA 1', 'siswa'),
    ('siti.nurhaliza', '20240002', 'Siti Nurhaliza', 'XII IPA 2', 'siswa'),
    ('budi.santoso', '20240003', 'Budi Santoso', 'XII IPS 1', 'siswa'),
    ('dewi.lestari', '20240004', 'Dewi Lestari', 'XII IPS 1', 'siswa'),
    ('rina.wati', '20240005', 'Rina Wati', 'XII IPA 1', 'siswa')
ON CONFLICT (username) DO NOTHING;


-- 4. SEED: Contoh Surat Access (untuk development)
-- ============================================================
-- Contoh: Ahmad Fauzi punya akses ke SKL dan SKKB

-- INSERT INTO public.surat_access (user_id, surat_type_id, file_url, file_name, can_download) VALUES
--     (
--         (SELECT id FROM public.users WHERE nis = '20240001'),
--         (SELECT id FROM public.surat_types WHERE kode = 'SKL'),
--         'SKL/20240001/SKL_Ahmad_Fauzi.pdf',
--         'SKL_Ahmad_Fauzi.pdf',
--         true
--     ),
--     (
--         (SELECT id FROM public.users WHERE nis = '20240001'),
--         (SELECT id FROM public.surat_types WHERE kode = 'SKKB'),
--         'SKKB/20240001/SKKB_Ahmad_Fauzi.pdf',
--         'SKKB_Ahmad_Fauzi.pdf',
--         true
--     );
