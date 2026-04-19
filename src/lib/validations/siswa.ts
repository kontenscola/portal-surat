import { z } from 'zod'

export const createSiswaSchema = z.object({
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  username: z.string().min(1, 'Username wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  kelas: z.string().min(1, 'Kelas wajib diisi'),
})

export const updateSiswaSchema = createSiswaSchema.partial().extend({
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  username: z.string().min(1, 'Username wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  kelas: z.string().min(1, 'Kelas wajib diisi'),
})

export type CreateSiswaInput = z.infer<typeof createSiswaSchema>
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>
