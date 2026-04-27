import { z } from 'zod'

export const createSiswaSchema = z.object({
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  username: z.string().min(1, 'Username wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  kelas: z.string().min(1, 'Kelas wajib diisi'),
  password: z.string().optional(),
})

export const updateSiswaSchema = z.object({
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  username: z.string().min(1, 'Username wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  kelas: z.string().min(1, 'Kelas wajib diisi'),
  password: z.string().optional(),
})

export type CreateSiswaInput = z.infer<typeof createSiswaSchema>
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>
