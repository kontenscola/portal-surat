import { SuratType, SuratAccess } from '@/types/database'
import SuratCard from './SuratCard'

interface SuratGridProps {
  suratTypes: SuratType[]
  suratAccesses: SuratAccess[]
}

export default function SuratGrid({ suratTypes, suratAccesses }: SuratGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {suratTypes.map((suratType) => {
        const access = suratAccesses.find((a) => a.surat_type_id === suratType.id) ?? null
        return (
          <SuratCard
            key={suratType.id}
            suratType={suratType}
            access={access}
          />
        )
      })}
    </div>
  )
}
