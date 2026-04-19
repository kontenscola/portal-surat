import { z } from 'zod'

export const createKategoriSchema = z.object({
  nama_kategori: z.string().min(1, 'Nama kategori wajib diisi').trim(),
  deskripsi: z.string().optional(),
})

export const uploadFileAksesSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (f) => ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type),
      'Format file harus PDF, JPG, atau PNG'
    )
    .refine(
      (f) => f.size <= 5 * 1024 * 1024,
      'Ukuran file maksimal 5 MB'
    ),
})

export type CreateKategoriInput = z.infer<typeof createKategoriSchema>
export type UploadFileAksesInput = z.infer<typeof uploadFileAksesSchema>
