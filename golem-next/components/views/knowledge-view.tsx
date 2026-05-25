'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { KnowledgeRow, ProjectRow } from '@/types/entities'

type Form = Partial<Omit<KnowledgeRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function KnowledgeView({
  initialItems,
  projects,
}: {
  initialItems: KnowledgeRow[]
  projects: ProjectRow[]
}) {
  const [items, setItems]           = useState(initialItems)
  const [search, setSearch]         = useState('')
  const [tagFilter, setTagFilter]   = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<KnowledgeRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ tags: tagFilter ?? undefined })
    setDrawerOpen(true)
  }
  const openEdit = (item: KnowledgeRow) => {
    setEditItem(item)
    setForm({
      title:      item.title,
      content:    item.content    ?? undefined,
      tags:       item.tags       ?? undefined,
      source_url: item.source_url ?? undefined,
      project_id: item.project_id ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, title: form.title! }
    if (editItem) {
      const { error } = await sb.from('knowledge_items').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(k => k.id === editItem.id
        ? { ...k, ...payload, updated_at: new Date().toISOString() }
        : k
      ))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('knowledge_items').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Added to knowledge base')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('knowledge_items').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(k => k.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  // All unique tags across all items
  const allTags = useMemo(() => {
    const set = new Set<string>()
    items.forEach(k => {
      k.tags?.split(',').map(t => t.trim()).filter(Boolean).forEach(t => set.add(t))
    })
    return [...set].sort()
  }, [items])

  const filtered = useMemo(() => {
    let out = items
    if (tagFilter) out = out.filter(k =>
      k.tags?.split(',').map(t => t.trim()).includes(tagFilter)
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(k =>
        k.title.toLowerCase().includes(q) ||
        (k.content ?? '').toLowerCase().includes(q) ||
        (k.tags ?? '').toLowerCase().includes(q)
      )
    }
    return out
  }, [items, tagFilter, search])

  const projectName = (id: number | null) =>
    id ? (projects.find(p => p.id === id)?.name ?? null) : null

  const fmt = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Knowledge</h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} items</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> Add Item
        </Button>
      </div>

      {/* Search + tag filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge base…"
            className="w-full pl-8 pr-3 h-8 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  tagFilter === tag
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-transparent'
                    : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => openEdit(item)}
              className={`w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {item.title}
                    </p>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 flex-shrink-0"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {item.content && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                      {item.content}
                    </p>
                  )}
                  {item.tags && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {item.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
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
                  {projectName(item.project_id) && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 truncate max-w-24">
                      {projectName(item.project_id)}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    {fmt(item.updated_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">{search || tagFilter ? 'No items match.' : 'No knowledge items yet.'}</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Item' : 'New Item'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Title"
          value={form.title ?? ''}
          onChange={e => upd('title', e.target.value)}
          placeholder="Item title"
        />
        <Textarea
          label="Content"
          value={form.content ?? ''}
          onChange={e => upd('content', e.target.value || undefined)}
          placeholder="Notes, summary, or full content…"
          rows={6}
        />
        <Input
          label="Tags"
          value={form.tags ?? ''}
          onChange={e => upd('tags', e.target.value || undefined)}
          placeholder="tag1, tag2, tag3"
        />
        <Input
          label="Source URL"
          type="url"
          value={form.source_url ?? ''}
          onChange={e => upd('source_url', e.target.value || undefined)}
          placeholder="https://…"
        />
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              Project
            </label>
            <select
              value={form.project_id?.toString() ?? ''}
              onChange={e => upd('project_id', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-9 px-3 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 text-stone-900 dark:text-stone-100"
            >
              <option value="">— None —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </ItemDrawer>
    </div>
  )
}
