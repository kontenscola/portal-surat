import { z } from 'zod'

export const createSuratAccessSchema = z.object({
  user_id: z.string().uuid('Siswa wajib dipilih'),
  surat_type_id: z.string().uuid('Jenis surat wajib dipilih'),
})

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.type === 'application/pdf', 'File harus berformat PDF')
    .refine((f) => f.size <= 10 * 1024 * 1024, 'Ukuran file maksimal 10 MB'),
})

export type CreateSuratAccessInput = z.infer<typeof createSuratAccessSchema>
export type UploadFileInput = z.infer<typeof uploadFileSchema>
