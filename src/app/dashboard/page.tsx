import { redirect } from 'next/navigation'

// Dashboard siswa sekarang menggunakan halaman /surat-saya
export default function DashboardPage() {
  redirect('/surat-saya')
}
