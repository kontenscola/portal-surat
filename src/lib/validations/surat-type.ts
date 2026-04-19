import { z } from 'zod'

export const createSuratTypeSchema = z.object({
  nama_surat: z.string().min(1, 'Nama surat wajib diisi'),
  kode: z.string().min(1, 'Kode wajib diisi').regex(/^[A-Z]+$/, 'Kode harus huruf kapital semua'),
  deskripsi: z.string().optional(),
})

export type CreateSuratTypeInput = z.infer<typeof createSuratTypeSchema>
