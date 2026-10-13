'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'

export function AccountMenu({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const initial = (email?.trim()[0] ?? 'G').toUpperCase()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Account menu"
        className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
      >
        {initial}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-56 z-50 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg overflow-hidden"
        >
          {email && <p className="px-3 py-2 text-xs text-muted truncate border-b border-stone-100 dark:border-stone-800">{email}</p>}
          <button
            role="menuitem"
            autoFocus
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
