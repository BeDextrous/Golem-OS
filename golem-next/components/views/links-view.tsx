'use client'
import { useState, useMemo } from 'react'
import { Plus, ExternalLink, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { LinkRow } from '@/types/entities'

const PILLAR_OPTS = [
  { value: 'life', label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work', label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#639922', dextrous: '#378ADD', work: '#D85A30',
}

type Form = Partial<Omit<LinkRow,
  'id' | 'user_id' | 'created_at' | 'updated_at' |
  'parent_goal_id' | 'parent_objective_id' | 'parent_task_id'
>>

const today = () => new Date().toISOString().slice(0, 10)

function displayTitle(l: LinkRow): string {
  if (l.title) return l.title
  try { return new URL(l.url).hostname.replace('www.', '') } catch { return l.url }
}

export function LinksView({
  initialItems,
  defaultPillar,
}: {
  initialItems: LinkRow[]
  defaultPillar?: string
}) {
  const [items, setItems]               = useState(initialItems)
  const [pillarFilter, setPillarFilter] = useState<string | null>(defaultPillar ?? null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editItem, setEditItem]         = useState<LinkRow | null>(null)
  const [form, setForm]                 = useState<Form>({})

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
      url:        item.url,
      title:      item.title      ?? undefined,
      website:    item.website    ?? undefined,
      pillar:     item.pillar     ?? undefined,
      date_added: item.date_added ?? undefined,
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

  const dynamicWebsites = useMemo(() =>
    [...new Set(items.map(l => l.website).filter(Boolean) as string[])].sort(),
    [items]
  )

  const filtered = useMemo(() =>
    pillarFilter ? items.filter(l => l.pillar === pillarFilter) : items,
    [items, pillarFilter]
  )

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Links</h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} saved links</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> Save Link
        </Button>
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

      <div className="space-y-6">
        {byWebsite.map(([website, links]) => (
          <section key={website}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {website}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {links.map((link, idx) => (
                <div
                  key={link.id}
                  className={`flex items-center gap-3 px-4 py-3 group ${
                    idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {displayTitle(link)}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {link.pillar && (
                      <span className="text-xs font-medium hidden sm:inline" style={{ color: PILLAR_COLORS[link.pillar] }}>
                        {PILLAR_OPTS.find(p => p.value === link.pillar)?.label}
                      </span>
                    )}
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
                    <button
                      onClick={() => openEdit(link)}
                      className="text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">{pillarFilter ? 'No links for this pillar.' : 'No links saved yet.'}</p>
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
