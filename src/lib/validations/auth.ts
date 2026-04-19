import { z } from 'zod'

export const loginSiswaSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
})

export const loginAdminSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})
