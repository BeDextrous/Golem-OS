'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectOption { value: string; label: string }
interface OptGroup { label: string; options: SelectOption[] }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: SelectOption[]
  groups?: OptGroup[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, groups, placeholder, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-stone-700 dark:text-stone-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-8 px-3 text-sm rounded-lg border bg-white dark:bg-stone-900',
            'border-stone-300 dark:border-stone-700',
            'text-stone-900 dark:text-stone-50',
            'focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-400',
            className
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder || '— None —'}</option>}
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          {groups?.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
          {children}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
