'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-stone-700 dark:text-stone-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'px-3 py-2 text-sm rounded-lg border bg-white dark:bg-stone-900',
            'border-stone-300 dark:border-stone-700',
            'text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-600',
            'focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-y',
            error && 'border-red-500 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
