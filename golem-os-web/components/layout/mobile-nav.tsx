'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, Briefcase, Flame, Layers, Scale, Target, Home, type LucideIcon } from 'lucide-react'
import { PILLARS } from '@/types/pillar'
import { cn } from '@/lib/utils'

// Pillar icon names are strings in PILLARS; unknown names fall back to Layers
const ICONS: Record<string, LucideIcon> = { Leaf, Briefcase, Flame, Layers, Scale, Target }

export function MobileNav() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Home', Icon: Home, color: undefined as string | undefined, active: pathname === '/' },
    ...Object.values(PILLARS).map(p => ({
      href: p.routes.root, label: p.label, Icon: ICONS[p.icon] ?? Layers, color: p.color,
      active: pathname.startsWith(p.routes.root),
    })),
    { href: '/focus', label: 'Focus', Icon: Target, color: undefined, active: pathname.startsWith('/focus') },
  ]

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map(({ href, label, Icon, color, active }) => (
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
              <Icon size={18} aria-hidden="true" />
              <span className="truncate max-w-full px-0.5">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
