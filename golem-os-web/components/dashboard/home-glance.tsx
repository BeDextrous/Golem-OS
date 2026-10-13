import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { PILLARS, type Pillar } from '@/types/pillar'
import { PillarIcon } from '@/components/layout/pillar-icon'
import { cn } from '@/lib/utils'

export type PillarSummary = {
  pillar: Pillar
  /** Short stat lines, most important first. `warn` highlights a number that needs action. */
  stats: { label: string; value: number; warn?: boolean }[]
}

export function GlanceTiles({ overdue, dueToday, open }: { overdue: number; dueToday: number; open: number }) {
  const tiles = [
    { label: 'Overdue', value: overdue, warn: overdue > 0, href: '/focus' },
    { label: 'Due today', value: dueToday, warn: false, href: '/focus' },
    { label: 'Open tasks', value: open, warn: false, href: '/focus' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map(t => (
        <Link
          key={t.label}
          href={t.href}
          className={cn(
            'rounded-lg border p-3 sm:p-4 transition-colors',
            t.warn
              ? 'border-red-300 bg-red-50 hover:border-red-400 dark:border-red-900 dark:bg-red-950/30'
              : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
          )}
        >
          <p className={cn(
            'text-2xl sm:text-3xl font-semibold tabular-nums flex items-center gap-2',
            t.warn ? 'text-red-700 dark:text-red-400' : 'text-stone-900 dark:text-stone-50'
          )}>
            {t.value}
            {t.warn && <AlertTriangle size={16} aria-hidden="true" />}
          </p>
          <p className={cn('text-xs mt-0.5', t.warn ? 'text-red-700 dark:text-red-400' : 'text-muted')}>{t.label}</p>
        </Link>
      ))}
    </div>
  )
}

export function PillarCards({ summaries }: { summaries: PillarSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {summaries.map(({ pillar, stats }) => {
        const p = PILLARS[pillar]
        return (
          <Link
            key={pillar}
            href={p.routes.root}
            className={cn('group rounded-xl border-l-4 border border-transparent p-4 transition-shadow hover:shadow-sm', p.tint)}
            style={{ borderLeftColor: p.color }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center text-white"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              >
                <PillarIcon name={p.icon} size={15} />
              </span>
              <p className={cn('text-sm font-semibold', p.headerText)}>{p.label}</p>
            </div>
            <ul className="space-y-1">
              {stats.map(s => (
                <li key={s.label} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-stone-700 dark:text-stone-300">{s.label}</span>
                  <span className={cn(
                    'tabular-nums font-semibold text-sm',
                    s.warn && s.value > 0 ? 'text-red-700 dark:text-red-400' : 'text-stone-900 dark:text-stone-50'
                  )}>
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
          </Link>
        )
      })}
    </div>
  )
}
