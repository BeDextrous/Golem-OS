'use client'
import { useState, useEffect, useId, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useDialog } from '@/lib/use-dialog'
import { Button } from '@/components/ui'

interface ItemDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  onSave: () => Promise<void>
  onDelete?: () => Promise<void>
  children: React.ReactNode
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return fallback
}

export function ItemDrawer({ open, onClose, title, onSave, onDelete, children }: ItemDrawerProps) {
  const [saving, setSaving] = useState(false)
  const [deleteStep, setDeleteStep] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) { setDeleteStep(false) }
  }, [open])

  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialog(open, panelRef, onClose)

  const handleSave = async () => {
    setSaving(true)
    try { await onSave() }
    catch (err) { toast.error(errorMessage(err, 'Save failed')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!deleteStep) { setDeleteStep(true); return }
    setDeleting(true)
    try { await onDelete() }
    catch (err) { toast.error(errorMessage(err, 'Delete failed')) }
    finally { setDeleting(false); setDeleteStep(false) }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        className={cn(
          'outline-none',
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:max-w-md',
          'bg-white dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800 shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <h2 id={titleId} className="text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
          <div className="flex items-center gap-1.5">
            {onDelete && (
              deleteStep ? (
                <>
                  <span className="text-xs text-red-500 mr-1">Sure?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteStep(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <button
                  onClick={handleDelete}
                  aria-label="Delete"
                  className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-md text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-md text-muted hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
          <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
            Save Changes
          </Button>
        </div>
      </div>
    </>
  )
}
