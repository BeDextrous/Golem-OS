'use client'
import { useState, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { NoteRow } from '@/types/entities'

const PILLAR_OPTS = [
  { value: 'life', label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work', label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#639922', dextrous: '#378ADD', work: '#D85A30',
}

type Form = Partial<Omit<NoteRow,
  'id' | 'user_id' | 'created_at' | 'updated_at' |
  'parent_goal_id' | 'parent_objective_id' | 'parent_task_id' | 'drafts_uuid'
>>

export function NotesView({
  initialItems,
  defaultPillar,
}: {
  initialItems: NoteRow[]
  defaultPillar?: string
}) {
  const [items, setItems]           = useState(initialItems)
  const [search, setSearch]         = useState('')
  const [pillarFilter, setPillarFilter] = useState<string | null>(defaultPillar ?? null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<NoteRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ pillar: pillarFilter ?? undefined })
    setDrawerOpen(true)
  }
  const openEdit = (item: NoteRow) => {
    setEditItem(item)
    setForm({
      title:   item.title   ?? undefined,
      content: item.content ?? undefined,
      pillar:  item.pillar  ?? undefined,
      tags:    item.tags    ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form }
    if (editItem) {
      const { error } = await sb.from('notes').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(n => n.id === editItem.id ? { ...n, ...payload, updated_at: new Date().toISOString() } : n))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('notes').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Note added')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('notes').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(n => n.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  const filtered = useMemo(() => {
    let out = items
    if (pillarFilter) out = out.filter(n => n.pillar === pillarFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(n =>
        (n.title ?? '').toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q) ||
        (n.tags ?? '').toLowerCase().includes(q)
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
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Note
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
            <button
              key={note.id}
              onClick={() => openEdit(note)}
              className={`w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
              }`}
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
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">{search || pillarFilter ? 'No notes match.' : 'No notes yet.'}</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Note' : 'New Note'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Title"
          value={form.title ?? ''}
          onChange={e => upd('title', e.target.value || undefined)}
          placeholder="Note title (optional)"
        />
        <Textarea
          label="Content"
          value={form.content ?? ''}
          onChange={e => upd('content', e.target.value || undefined)}
          placeholder="Write your note…"
          rows={8}
        />
        <Input
          label="Tags"
          value={form.tags ?? ''}
          onChange={e => upd('tags', e.target.value || undefined)}
          placeholder="tag1, tag2, tag3"
        />
        <Select
          label="Pillar"
          value={form.pillar ?? ''}
          onChange={e => upd('pillar', e.target.value || undefined)}
          placeholder="— None —"
          options={PILLAR_OPTS}
        />
      </ItemDrawer>
    </div>
  )
}
