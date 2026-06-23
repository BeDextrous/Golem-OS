'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { NoteRow } from '@/types/entities'

const PILLAR_OPTS = [
  { value: 'life',      label: 'Life' },
  { value: 'dextrous',  label: 'Dextrous' },
  { value: 'work',      label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#7FA98A', dextrous: '#DA6B51', work: '#5B5F8D',
}

const SAVE_DELAY_MS = 1200

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function NoteEditor({ note: initial }: { note: NoteRow }) {
  const router = useRouter()
  const [note, setNote]             = useState(initial)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showDelete, setShowDelete] = useState(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestNote = useRef(note)
  latestNote.current = note

  // ── Field updater ─────────────────────────────────────────────────────
  const upd = (field: keyof NoteRow, value: unknown) => {
    setNote(prev => ({ ...prev, [field]: value ?? null }))
    setSaveStatus('unsaved')
  }

  // ── Save ──────────────────────────────────────────────────────────────
  const save = useCallback(async (data: NoteRow) => {
    setSaveStatus('saving')
    const sb = createClient()
    const { error } = await sb.from('notes').update({
      title:      data.title   ?? null,
      content:    data.content ?? null,
      pillar:     data.pillar  ?? null,
      tags:       data.tags    ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id)

    if (error) {
      console.error(error)
      setSaveStatus('error')
      toast.error('Save failed')
    } else {
      setSaveStatus('saved')
    }
  }, [])

  // ── Debounced auto-save ───────────────────────────────────────────────
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(latestNote.current), SAVE_DELAY_MS)
    return () => clearTimeout(timerRef.current)
  }, [note, saveStatus, save])

  // ── Flush on page unload ──────────────────────────────────────────────
  useEffect(() => {
    const flush = () => { if (saveStatus === 'unsaved') save(latestNote.current) }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [saveStatus, save])

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const sb = createClient()
    const { error } = await sb.from('notes').delete().eq('id', note.id)
    if (error) { toast.error('Delete failed'); return }
    router.push('/life/notes')
  }

  const pillarColor = note.pillar ? PILLAR_COLORS[note.pillar] : undefined

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">

      {/* ── Top bar ── */}
      <div className="sticky top-12 z-10 flex items-center justify-between px-4 h-11 border-b border-stone-100 dark:border-stone-800 bg-white/90 dark:bg-stone-950/90 backdrop-blur-sm">
        <button
          onClick={() => router.push('/life/notes')}
          className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft size={14} />
          Notes
        </button>

        <span className={`text-xs transition-colors ${
          saveStatus === 'saving'  ? 'text-stone-400' :
          saveStatus === 'error'   ? 'text-red-400' :
          saveStatus === 'unsaved' ? 'text-amber-500' :
          'text-stone-300 dark:text-stone-600'
        }`}>
          {saveStatus === 'saving'  ? 'Saving…' :
           saveStatus === 'error'   ? 'Error saving' :
           saveStatus === 'unsaved' ? 'Unsaved' :
           'Saved'}
        </span>
      </div>

      {/* ── Writing area ── */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-6 pt-8 pb-4 flex flex-col gap-3">
        <input
          value={note.title ?? ''}
          onChange={e => upd('title', e.target.value || null)}
          placeholder="Untitled"
          className="w-full text-2xl font-semibold text-stone-900 dark:text-stone-50 bg-transparent border-none outline-none placeholder:text-stone-300 dark:placeholder:text-stone-700"
        />
        <textarea
          value={note.content ?? ''}
          onChange={e => upd('content', e.target.value || null)}
          placeholder="Write something…"
          className="flex-1 w-full min-h-[55vh] text-sm leading-relaxed text-stone-800 dark:text-stone-200 bg-transparent border-none outline-none resize-none placeholder:text-stone-300 dark:placeholder:text-stone-700"
        />
      </div>

      {/* ── Bottom metadata bar ── */}
      <div className="sticky bottom-0 border-t border-stone-100 dark:border-stone-800 bg-white/90 dark:bg-stone-950/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-2.5 flex items-center gap-4 flex-wrap">

          {/* Pillar */}
          <select
            value={note.pillar ?? ''}
            onChange={e => upd('pillar', e.target.value || null)}
            className="text-xs bg-transparent border-none outline-none cursor-pointer"
            style={{ color: pillarColor ?? '#a8a29e' }}
          >
            <option value="">No pillar</option>
            {PILLAR_OPTS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <span className="text-stone-200 dark:text-stone-700 text-xs">·</span>

          {/* Tags */}
          <input
            value={note.tags ?? ''}
            onChange={e => upd('tags', e.target.value || null)}
            placeholder="tags, comma-separated"
            className="flex-1 min-w-24 text-xs text-stone-500 dark:text-stone-400 bg-transparent border-none outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
          />

          <span className="flex-1" />

          {/* Delete */}
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="text-stone-300 dark:text-stone-700 hover:text-red-400 transition-colors"
              title="Delete note"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">Yes</button>
              <button onClick={() => setShowDelete(false)} className="text-xs text-stone-400 hover:text-stone-600">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
