import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import KategoriGrid from '@/components/akses-surat/KategoriGrid'
import type { SuratKategori } from '@/types/akses-surat'

export default async function AksesSuratPage() {
  const supabase = createAdminClient()

  const { data: kategoriList, error } = await supabase
    .from('surat_kategori')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[AksesSuratPage] Error fetching kategori:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Dashboard Admin
          </Link>
        </div>
        <KategoriGrid initialData={(kategoriList ?? []) as SuratKategori[]} />
      </div>
    </div>
  )
}
