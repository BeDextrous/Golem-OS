'use client'
import { cn } from '@/lib/utils'

interface StatusFilterProps {
  statuses: string[]
  active: string[]
  onChange: (active: string[]) => void
  colorMap?: Record<string, string>
}

export function StatusFilter({ statuses, active, onChange, colorMap }: StatusFilterProps) {
  const toggle = (s: string) =>
    onChange(active.includes(s) ? active.filter(x => x !== s) : [...active, s])

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">Show:</span>
      {statuses.map(s => {
        const on = active.includes(s)
        const customColor = on && colorMap?.[s]
        return (
          <button
            key={s}
            onClick={() => toggle(s)}
            className={cn(
              'px-2.5 py-0.5 text-xs font-medium rounded-full transition-all',
              on && !customColor
                ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                : !on
                ? 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400'
                : ''
            )}
            style={customColor ? { backgroundColor: customColor + '22', color: customColor } : undefined}
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}

export function initStatuses(storageKey: string, all: string[], defaultHide: string[]): string[] {
  if (typeof window === 'undefined') return all.filter(s => !defaultHide.includes(s))
  const raw = localStorage.getItem(storageKey)
  if (raw == null) return all.filter(s => !defaultHide.includes(s))
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : all.slice()
  } catch {
    return all.slice()
  }
}

export function saveStatuses(storageKey: string, active: string[]): void {
  localStorage.setItem(storageKey, JSON.stringify(active))
}
