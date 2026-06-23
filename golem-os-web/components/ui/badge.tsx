import { cn } from '@/lib/utils'
import { PILLARS, type Pillar } from '@/types/pillar'

type Variant = 'default' | 'outline' | Pillar

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

const variants: Record<string, string> = {
  default: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  outline: 'border border-stone-300 text-stone-700 dark:border-stone-700 dark:text-stone-300',
  life: PILLARS.life.badge,
  dextrous: PILLARS.dextrous.badge,
  work: PILLARS.work.badge,
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
