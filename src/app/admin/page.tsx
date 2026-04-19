import { createAdminClient } from '@/lib/supabase/admin'
import AdminTabs from '@/components/admin/AdminTabs'
import type { User, SuratType } from '@/types/database'

export default async function AdminPage() {
  const supabase = createAdminClient()

  // Fetch semua siswa
  const { data: siswaList, error: siswaError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'siswa')
    .order('nama_lengkap', { ascending: true })

  if (siswaError) {
    console.error('Error fetching siswa:', siswaError)
  }

  // Fetch semua surat types (untuk tab Master Surat)
  const { data: suratTypes, error: suratTypesError } = await supabase
    .from('surat_types')
    .select('*')
    .order('nama_surat', { ascending: true })

  if (suratTypesError) {
    console.error('Error fetching surat types:', suratTypesError)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">Portal Surat — Manajemen Data</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminTabs
          siswaList={(siswaList ?? []) as User[]}
          suratTypes={(suratTypes ?? []) as SuratType[]}
        />
      </main>
    </div>
  )
}
