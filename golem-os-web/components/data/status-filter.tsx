'use client'
import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/lib/use-local-storage'

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
      <span className="text-xs text-muted shrink-0">Show:</span>
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
                ? 'bg-stone-100 text-muted dark:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-400'
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

/** Which statuses are on: the stored selection, or everything except `defaultHide` when nothing is stored. */
export function parseStatuses(raw: string | null, all: string[], defaultHide: string[]): string[] {
  if (raw == null) return all.filter(s => !defaultHide.includes(s))
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : all.slice()
  } catch {
    return all.slice()
  }
}

/** Status filter selection persisted in localStorage; hydration-safe (defaults first, stored value after mount). */
export function usePersistedStatuses(storageKey: string, all: string[], defaultHide: string[]) {
  const [raw, setRaw] = useLocalStorage(storageKey)
  const active = useMemo(() => parseStatuses(raw, all, defaultHide), [raw, all, defaultHide])
  const setActive = useCallback((next: string[]) => setRaw(JSON.stringify(next)), [setRaw])
  return [active, setActive] as const
}
