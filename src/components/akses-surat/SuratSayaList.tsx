import type { SuratSayaItem } from '@/types/akses-surat'

interface SuratSayaListProps {
  items: SuratSayaItem[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function SuratSayaList({ items }: SuratSayaListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-10 w-10 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-3 text-sm text-gray-500">Belum ada surat yang tersedia untuk Anda.</p>
      </div>
    )
  }

  // Kelompokkan per kategori
  const grouped = items.reduce<Record<string, { nama: string; items: SuratSayaItem[] }>>(
    (acc, item) => {
      if (!acc[item.kategori_id]) {
        acc[item.kategori_id] = { nama: item.kategori_nama, items: [] }
      }
      acc[item.kategori_id].items.push(item)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([kategoriId, group]) => (
        <div key={kategoriId}>
          <h2 className="mb-3 text-base font-semibold text-gray-900">{group.nama}</h2>
          <div className="space-y-3">
            {group.items.map((item) => {
              const canDownload = item.akses_download && !!item.file_path
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Ikon file */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.file_name ?? 'File belum tersedia'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Diunggah {formatDate(item.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  {/* Tombol download */}
                  {canDownload ? (
                    <a
                      href={`/api/surat/download/${item.id}`}
                      className="ml-4 flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  ) : (
                    <button
                      disabled
                      className="ml-4 flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Belum tersedia
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
