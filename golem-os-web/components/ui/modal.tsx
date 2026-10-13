'use client'
import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDialog } from '@/lib/use-dialog'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialog(open, panelRef, onClose)

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'outline-none bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl',
          'w-full flex flex-col',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
            <h2 id={titleId} className="text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-md text-muted hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
