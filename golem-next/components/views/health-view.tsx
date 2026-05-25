'use client'
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { HealthRow } from '@/types/entities'

const today = () => new Date().toISOString().slice(0, 10)

type Form = Partial<Omit<HealthRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function HealthView({ initialItems }: { initialItems: HealthRow[] }) {
  const [items, setItems]           = useState(initialItems)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<HealthRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ entry_date: today() })
    setDrawerOpen(true)
  }
  const openEdit = (item: HealthRow) => {
    setEditItem(item)
    setForm({
      category:   item.category,
      label:      item.label      ?? undefined,
      value:      item.value      ?? undefined,
      unit:       item.unit       ?? undefined,
      entry_date: item.entry_date,
      notes:      item.notes      ?? undefined,
      source:     item.source     ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.category?.trim()) { toast.error('Category is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, category: form.category!, entry_date: form.entry_date || today() }
    if (editItem) {
      const { error } = await sb.from('health_entries').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(h => h.id === editItem.id ? { ...h, ...payload } : h))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('health_entries').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Entry added')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('health_entries').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(h => h.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  // Dynamic categories
  const categories = useMemo(() =>
    [...new Set(items.map(h => h.category).filter(Boolean))].sort(),
    [items]
  )

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, HealthRow[]>()
    items.forEach(h => {
      const arr = map.get(h.category) ?? []
      arr.push(h)
      map.set(h.category, arr)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const fmtVal = (h: HealthRow) => {
    if (h.value == null) return null
    return `${h.value}${h.unit ? ` ${h.unit}` : ''}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Health</h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} entries</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> Log Entry
        </Button>
      </div>

      <div className="space-y-6">
        {byCategory.map(([category, entries]) => (
          <section key={category}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {category}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {entries.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                    idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {item.label ?? item.category}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {fmtVal(item) && (
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                        {fmtVal(item)}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 dark:text-stone-500">{item.entry_date}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No health entries yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Entry' : 'Log Entry'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Category"
          value={form.category ?? ''}
          onChange={e => upd('category', e.target.value)}
          placeholder="e.g. Sleep, Weight, Exercise, Mood"
          list="health-categories"
        />
        <datalist id="health-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
        <Input
          label="Label"
          value={form.label ?? ''}
          onChange={e => upd('label', e.target.value || undefined)}
          placeholder="e.g. Morning run, Bedtime (optional)"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Value"
            type="number"
            step="any"
            value={form.value ?? ''}
            onChange={e => upd('value', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
          <Input
            label="Unit"
            value={form.unit ?? ''}
            onChange={e => upd('unit', e.target.value || undefined)}
            placeholder="kg, hrs, km…"
          />
        </div>
        <Input
          label="Date"
          type="date"
          value={form.entry_date ?? ''}
          onChange={e => upd('entry_date', e.target.value || undefined)}
        />
        <Input
          label="Source"
          value={form.source ?? ''}
          onChange={e => upd('source', e.target.value || undefined)}
          placeholder="e.g. Apple Health, Manual"
        />
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => upd('notes', e.target.value || undefined)}
          placeholder="Any notes…"
          rows={3}
        />
      </ItemDrawer>
    </div>
  )
}
