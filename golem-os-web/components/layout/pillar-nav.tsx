'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PILLARS, type Pillar } from '@/types/pillar'
import { cn } from '@/lib/utils'

export function PillarNav({ pillar }: { pillar: Pillar }) {
  const pathname = usePathname()
  const config = PILLARS[pillar]

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center -mb-px overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {config.routes.subnav.map((item) => {
            const isActive =
              item.href === config.routes.root
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-current'
                    : 'text-stone-500 border-transparent hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
                )}
                style={isActive ? { color: config.color, borderBottomColor: config.color } : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
