'use client'
import { useState, useMemo, useCallback } from 'react'
import { Plus, ExternalLink, Pencil, Check, Trash2, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { LinkRow, NoteRow, TaskRow } from '@/types/entities'

const PILLAR_OPTS = [
  { value: 'life', label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work', label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#639922', dextrous: '#378ADD', work: '#D85A30',
}

type Form = Partial<Omit<LinkRow,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>>

const today = () => new Date().toISOString().slice(0, 10)

function displayTitle(l: LinkRow): string {
  if (l.title) return l.title
  try { return new URL(l.url).hostname.replace('www.', '') } catch { return l.url }
}

export function LinksView({
  initialItems,
  initialNotes = [],
  initialTasks = [],
  defaultPillar,
}: {
  initialItems: LinkRow[]
  initialNotes?: NoteRow[]
  initialTasks?: TaskRow[]
  defaultPillar?: string
}) {
  const [items, setItems]               = useState(initialItems)
  const [pillarFilter, setPillarFilter] = useState<string | null>(defaultPillar ?? null)
  const [showRead, setShowRead]         = useState(false)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editItem, setEditItem]         = useState<LinkRow | null>(null)
  const [form, setForm]                 = useState<Form>({})

  // Multi-select state
  const [selectMode, setSelectMode]     = useState(false)
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkPillar, setBulkPillar]     = useState('')

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ date_added: today(), pillar: pillarFilter ?? undefined })
    setDrawerOpen(true)
  }
  const openEdit = (item: LinkRow) => {
    setEditItem(item)
    setForm({
      url:            item.url,
      title:          item.title          ?? undefined,
      website:        item.website        ?? undefined,
      pillar:         item.pillar         ?? undefined,
      date_added:     item.date_added     ?? undefined,
      parent_task_id: item.parent_task_id ?? undefined,
      parent_note_id: item.parent_note_id ?? undefined,
      read_at:        item.read_at        ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.url?.trim()) { toast.error('URL is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, url: form.url! }
    if (editItem) {
      const { error } = await sb.from('links').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(l => l.id === editItem.id ? { ...l, ...payload } : l))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('links').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Link saved')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('links').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(l => l.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  // Inline delete (without opening drawer)
  const handleInlineDelete = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this link?')) return
    const sb = createClient()
    const { error } = await sb.from('links').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    setItems(prev => prev.filter(l => l.id !== id))
    toast.success('Deleted')
  }, [])

  // Mark read / unread
  const handleToggleRead = useCallback(async (link: LinkRow, e: React.MouseEvent) => {
    e.stopPropagation()
    const sb = createClient()
    const read_at = link.read_at ? null : new Date().toISOString()
    const { error } = await sb.from('links').update({ read_at }).eq('id', link.id)
    if (error) { toast.error('Update failed'); return }
    setItems(prev => prev.map(l => l.id === link.id ? { ...l, read_at } : l))
  }, [])

  // Multi-select
  const toggleSelect = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleBulkApply = async () => {
    if (!selected.size) return
    if (!bulkCategory && !bulkPillar) { toast.error('Set a category or pillar to apply'); return }
    const sb = createClient()
    const payload: Partial<LinkRow> = {}
    if (bulkCategory) payload.website = bulkCategory
    if (bulkPillar)   payload.pillar  = bulkPillar
    const ids = [...selected]
    const { error } = await sb.from('links').update(payload).in('id', ids)
    if (error) { toast.error('Bulk update failed'); return }
    setItems(prev => prev.map(l => ids.includes(l.id) ? { ...l, ...payload } : l))
    toast.success(`Updated ${ids.length} link${ids.length > 1 ? 's' : ''}`)
    setSelected(new Set())
    setBulkCategory('')
    setBulkPillar('')
    setSelectMode(false)
  }

  const dynamicWebsites = useMemo(() =>
    [...new Set(items.map(l => l.website).filter(Boolean) as string[])].sort(),
    [items]
  )

  const filtered = useMemo(() => {
    let list = pillarFilter ? items.filter(l => l.pillar === pillarFilter) : items
    if (!showRead) list = list.filter(l => !l.read_at)
    return list
  }, [items, pillarFilter, showRead])

  const byWebsite = useMemo(() => {
    const map = new Map<string, LinkRow[]>()
    filtered.forEach(l => {
      const key = l.website ?? 'Uncategorized'
      const arr = map.get(key) ?? []
      arr.push(l)
      map.set(key, arr)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const readCount = useMemo(() => items.filter(l => l.read_at).length, [items])

  // Note / task options for the drawer
  const noteOpts = useMemo(() =>
    initialNotes.map(n => ({ value: String(n.id), label: n.title ?? `Note #${n.id}` })),
    [initialNotes]
  )
  const taskOpts = useMemo(() =>
    initialTasks.map(t => ({ value: String(t.id), label: t.name })),
    [initialTasks]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Links</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {filtered.length} link{filtered.length !== 1 ? 's' : ''}
            {readCount > 0 && !showRead && ` · ${readCount} read hidden`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {readCount > 0 && (
            <button
              onClick={() => setShowRead(v => !v)}
              className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2"
            >
              {showRead ? 'Hide read' : 'Show read'}
            </button>
          )}
          <button
            onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              selectMode
                ? 'bg-stone-800 text-white border-stone-800 dark:bg-stone-200 dark:text-stone-900'
                : 'text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
            }`}
          >
            <Tag size={12} className="inline mr-1" />
            Select
          </button>
          <Button onClick={openNew} size="sm">
            <Plus size={14} /> Save Link
          </Button>
        </div>
      </div>

      {/* Pillar filter */}
      <div className="flex gap-1">
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

      {/* Bulk action bar */}
      {selectMode && (
        <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
          <span className="text-xs text-stone-500 shrink-0">
            {selected.size} selected
          </span>
          <input
            className="flex-1 text-xs border border-stone-200 dark:border-stone-700 rounded px-2 py-1 bg-white dark:bg-stone-900 min-w-0"
            placeholder="Category…"
            value={bulkCategory}
            onChange={e => setBulkCategory(e.target.value)}
            list="bulk-websites"
          />
          <datalist id="bulk-websites">
            {dynamicWebsites.map(w => <option key={w} value={w} />)}
          </datalist>
          <select
            className="text-xs border border-stone-200 dark:border-stone-700 rounded px-2 py-1 bg-white dark:bg-stone-900"
            value={bulkPillar}
            onChange={e => setBulkPillar(e.target.value)}
          >
            <option value="">Pillar…</option>
            {PILLAR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button size="sm" onClick={handleBulkApply} disabled={!selected.size}>Apply</Button>
          <button
            onClick={() => { setSelectMode(false); setSelected(new Set()) }}
            className="text-stone-400 hover:text-stone-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {byWebsite.map(([website, links]) => (
          <section key={website}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {website}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {links.map((link, idx) => {
                const isRead     = Boolean(link.read_at)
                const isSelected = selected.has(link.id)
                return (
                  <div
                    key={link.id}
                    onClick={() => selectMode ? toggleSelect(link.id) : undefined}
                    className={`flex items-center gap-3 px-4 py-3 group transition-colors ${
                      idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                    } ${selectMode ? 'cursor-pointer' : ''} ${
                      isSelected ? 'bg-stone-50 dark:bg-stone-800' : ''
                    }`}
                  >
                    {/* Checkbox (select mode) or read indicator */}
                    <div className="shrink-0 w-5 flex items-center justify-center">
                      {selectMode ? (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-stone-800 border-stone-800 dark:bg-stone-200 dark:border-stone-200'
                            : 'border-stone-300 dark:border-stone-600'
                        }`}>
                          {isSelected && <Check size={10} className="text-white dark:text-stone-900" />}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isRead
                          ? 'text-stone-400 dark:text-stone-500 line-through'
                          : 'text-stone-900 dark:text-stone-100'
                      }`}>
                        {displayTitle(link)}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{link.url}</p>
                      {(link.parent_task_id || link.parent_note_id) && (
                        <p className="text-xs text-stone-300 dark:text-stone-600 truncate mt-0.5">
                          {link.parent_task_id && `→ task #${link.parent_task_id}`}
                          {link.parent_note_id && `→ note #${link.parent_note_id}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {link.pillar && (
                        <span className="text-xs font-medium hidden sm:inline" style={{ color: PILLAR_COLORS[link.pillar] }}>
                          {PILLAR_OPTS.find(p => p.value === link.pillar)?.label}
                        </span>
                      )}
                      {!selectMode && (
                        <>
                          {/* Mark read toggle */}
                          <button
                            onClick={e => handleToggleRead(link, e)}
                            title={isRead ? 'Mark unread' : 'Mark as read'}
                            className={`p-1 rounded transition-colors ${
                              isRead
                                ? 'text-green-500 hover:text-green-700'
                                : 'text-stone-300 hover:text-green-500 dark:text-stone-600 dark:hover:text-green-500 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          {/* Open link */}
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1"
                            aria-label="Open link"
                          >
                            <ExternalLink size={14} />
                          </a>
                          {/* Inline delete */}
                          <button
                            onClick={e => handleInlineDelete(link.id, e)}
                            title="Delete"
                            className="text-stone-300 hover:text-red-400 dark:text-stone-600 dark:hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(link)}
                            className="text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">
            {pillarFilter ? 'No links for this pillar.' : showRead ? 'No links saved yet.' : 'No unread links.'}
          </p>
          {!showRead && readCount > 0 && (
            <button
              onClick={() => setShowRead(true)}
              className="text-xs mt-1 underline underline-offset-2 hover:text-stone-600"
            >
              Show {readCount} read link{readCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Link' : 'Save Link'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="URL"
          type="url"
          value={form.url ?? ''}
          onChange={e => upd('url', e.target.value)}
          placeholder="https://…"
        />
        <Input
          label="Title"
          value={form.title ?? ''}
          onChange={e => upd('title', e.target.value || undefined)}
          placeholder="Link title (optional)"
        />
        <Input
          label="Category"
          value={form.website ?? ''}
          onChange={e => upd('website', e.target.value || undefined)}
          placeholder="e.g. Career, Health, Learning"
          list="link-websites"
        />
        <datalist id="link-websites">
          {dynamicWebsites.map(w => <option key={w} value={w} />)}
        </datalist>
        <Select
          label="Pillar"
          value={form.pillar ?? ''}
          onChange={e => upd('pillar', e.target.value || undefined)}
          placeholder="— None —"
          options={PILLAR_OPTS}
        />
        {taskOpts.length > 0 && (
          <Select
            label="Associated Task"
            value={form.parent_task_id ? String(form.parent_task_id) : ''}
            onChange={e => upd('parent_task_id', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="— None —"
            options={taskOpts}
          />
        )}
        {noteOpts.length > 0 && (
          <Select
            label="Associated Note"
            value={form.parent_note_id ? String(form.parent_note_id) : ''}
            onChange={e => upd('parent_note_id', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="— None —"
            options={noteOpts}
          />
        )}
        <Input
          label="Date Saved"
          type="date"
          value={form.date_added ?? ''}
          onChange={e => upd('date_added', e.target.value || undefined)}
        />
      </ItemDrawer>
    </div>
  )
}
