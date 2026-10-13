import { PILLARS, type Pillar } from '@/types/pillar'
import { PillarIcon } from './pillar-icon'
import { cn } from '@/lib/utils'

/** Page header tinted with the pillar's colour so you can always tell where you are. */
export function PillarHeader({ pillar, subtitle, children, className }: {
  pillar: Pillar
  subtitle?: string
  children?: React.ReactNode
  className?: string
}) {
  const p = PILLARS[pillar]
  return (
    <header
      className={cn('flex items-center justify-between gap-4 rounded-xl border-l-4 px-4 py-3.5', p.tint, className)}
      style={{ borderLeftColor: p.color }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: p.color }}
          aria-hidden="true"
        >
          <PillarIcon name={p.icon} size={18} />
        </span>
        <div className="min-w-0">
          <h1 className={cn('text-xl font-semibold leading-tight', p.headerText)}>{p.label}</h1>
          {subtitle && <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </header>
  )
}
