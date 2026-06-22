'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import type { NoteRow } from '@/types/entities'

const PILLAR_OPTS = [
  { value: 'life',      label: 'Life' },
  { value: 'dextrous',  label: 'Dextrous' },
  { value: 'work',      label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#7FA98A', dextrous: '#DA6B51', work: '#5B5F8D',
}

export function NotesView({
  initialItems,
  defaultPillar,
}: {
  initialItems: NoteRow[]
  defaultPillar?: string
}) {
  const router = useRouter()
  const [items, setItems]               = useState(initialItems)
  const [search, setSearch]             = useState('')
  const [pillarFilter, setPillarFilter] = useState<string | null>(defaultPillar ?? null)
  const [creating, setCreating]         = useState(false)
  const [confirmId, setConfirmId]       = useState<number | null>(null)
  const [deletingIds, setDeletingIds]   = useState<Set<number>>(new Set())

  // ── New note: create blank in DB then navigate to editor ──────────────────
  const openNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { toast.error('Not signed in'); return }
      const { data, error } = await sb
        .from('notes')
        .insert({ user_id: user.id, pillar: pillarFilter ?? null })
        .select()
        .single()
      if (error) throw error
      if (data) {
        setItems(prev => [data, ...prev])
        router.push(`/life/notes/${data.id}`)
      }
    } catch {
      toast.error('Could not create note')
    } finally {
      setCreating(false)
    }
  }

  const deleteNote = async (id: number) => {
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      const sb = createClient()
      const { error } = await sb.from('notes').delete().eq('id', id)
      if (error) throw error
      setItems(prev => prev.filter(n => n.id !== id))
      setConfirmId(null)
      toast.success('Note deleted')
    } catch {
      toast.error('Could not delete note')
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const filtered = useMemo(() => {
    let out = items
    if (pillarFilter) out = out.filter(n => n.pillar === pillarFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(n =>
        (n.title   ?? '').toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q) ||
        (n.tags    ?? '').toLowerCase().includes(q)
      )
    }
    return out
  }, [items, pillarFilter, search])

  const fmt = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Notes</h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} notes</p>
        </div>
        <Button onClick={openNew} size="sm" disabled={creating}>
          <Plus size={14} /> {creating ? 'Creating…' : 'New Note'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-8 pr-3 h-8 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {([null, 'life', 'dextrous', 'work'] as const).map(p => (
            <button
              key={p ?? 'all'}
              onClick={() => setPillarFilter(p)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                pillarFilter === p
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
              }`}
              style={pillarFilter === p
                ? p
                  ? { backgroundColor: PILLAR_COLORS[p], borderColor: PILLAR_COLORS[p] }
                  : { backgroundColor: '#292524', borderColor: '#292524' }
                : undefined}
            >
              {p ? PILLAR_OPTS.find(x => x.value === p)!.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          {filtered.map((note, idx) => (
            <div
              key={note.id}
              className={`group relative flex items-stretch ${
                idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
              }`}
            >
              {confirmId === note.id ? (
                /* ── Inline delete confirmation ── */
                <div className="flex-1 flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950/20">
                  <p className="text-sm text-red-700 dark:text-red-400">Delete &ldquo;{note.title || 'Untitled'}&rdquo;?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1 text-xs rounded-md border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      disabled={deletingIds.has(note.id)}
                      className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deletingIds.has(note.id) ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Navigate button (main row body) ── */}
                  <button
                    onClick={() => router.push(`/life/notes/${note.id}`)}
                    className="flex-1 text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {note.title || <span className="text-stone-400 italic font-normal">Untitled</span>}
                        </p>
                        {note.content && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 whitespace-pre-line">
                            {note.content}
                          </p>
                        )}
                        {note.tags && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {note.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {note.pillar && (
                          <p className="text-xs font-medium" style={{ color: PILLAR_COLORS[note.pillar] }}>
                            {PILLAR_OPTS.find(p => p.value === note.pillar)?.label}
                          </p>
                        )}
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                          {fmt(note.updated_at)}
                        </p>
                        {note.drafts_uuid && (
                          <p className="text-xs text-stone-300 dark:text-stone-600 mt-0.5">Drafts ✓</p>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* ── Delete button (appears on hover) ── */}
                  <button
                    onClick={() => setConfirmId(note.id)}
                    className="px-3 flex items-center text-stone-300 dark:text-stone-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">{search || pillarFilter ? 'No notes match.' : 'No notes yet.'}</p>
        </div>
      )}
    </div>
  )
}
