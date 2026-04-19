interface BadgeProps {
  variant: 'active' | 'inactive' | 'uploaded' | 'not-uploaded' | 'blocked'
  label?: string
}

const variantConfig: Record<
  BadgeProps['variant'],
  { className: string; defaultLabel: string }
> = {
  active: {
    className: 'bg-green-100 text-green-800',
    defaultLabel: 'Aktif',
  },
  inactive: {
    className: 'bg-gray-100 text-gray-700',
    defaultLabel: 'Nonaktif',
  },
  uploaded: {
    className: 'bg-blue-100 text-blue-800',
    defaultLabel: 'Sudah Upload',
  },
  'not-uploaded': {
    className: 'bg-amber-100 text-amber-800',
    defaultLabel: 'Belum Upload',
  },
  blocked: {
    className: 'bg-red-100 text-red-800',
    defaultLabel: 'Diblokir',
  },
}

export default function Badge({ variant, label }: BadgeProps) {
  const { className, defaultLabel } = variantConfig[variant]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label ?? defaultLabel}
    </span>
  )
}
