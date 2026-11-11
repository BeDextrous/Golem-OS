'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target } from 'lucide-react'
import { PILLARS, type PillarConfig } from '@/types/pillar'
import { cn } from '@/lib/utils'
import { PillarIcon } from './pillar-icon'

export function MobileNav() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Home', icon: <Home size={18} aria-hidden="true" />, color: undefined as string | undefined, active: pathname === '/' },
    ...Object.values(PILLARS).map(p => ({
      href: p.routes.root, label: (p as PillarConfig).shortLabel ?? p.label, icon: <PillarIcon name={p.icon} size={18} />, color: p.color,
      active: pathname.startsWith(p.routes.root),
    })),
    { href: '/focus', label: 'Focus', icon: <Target size={18} aria-hidden="true" />, color: undefined, active: pathname.startsWith('/focus') },
  ]

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map(({ href, label, icon, color, active }) => (
          <li key={href} className="flex-1 min-w-0">
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium transition-colors',
                active ? 'text-stone-900 dark:text-stone-50' : 'text-muted'
              )}
              style={active && color ? { color } : undefined}
            >
              {icon}
              <span className="truncate max-w-full px-0.5">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
