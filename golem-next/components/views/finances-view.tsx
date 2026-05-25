'use client'
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { FinanceRow } from '@/types/entities'

const today = () => new Date().toISOString().slice(0, 10)

const PILLAR_OPTS = [
  { value: 'life',     label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work',     label: 'Work' },
]

type Form = Partial<Omit<FinanceRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function FinancesView({
  initialItems,
  defaultPillar,
}: {
  initialItems: FinanceRow[]
  defaultPillar?: string
}) {
  const [items, setItems]       = useState(initialItems)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState<FinanceRow | null>(null)
  const [form, setForm]         = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? null }))

  const openNew = () => {
    setEditItem(null)
    setForm({ entry_date: today(), pillar: defaultPillar ?? undefined })
    setDrawerOpen(true)
  }

  const openEdit = (item: FinanceRow) => {
    setEditItem(item)
    setForm({
      entry_date: item.entry_date,
      label:      item.label,
      category:   item.category,
      amount:     item.amount,
      pillar:     item.pillar ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.label?.trim()) { toast.error('Label is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const payload: Form = {
      ...form,
      entry_date: form.entry_date || today(),
      amount:     form.amount ?? 0,
      // Always stamp the pillar when defaultPillar is set
      pillar:     defaultPillar ?? form.pillar,
    }

    if (editItem) {
      const { error } = await sb.from('finances').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(f => f.id === editItem.id ? { ...f, ...payload } : f))
      toast.success('Updated')
    } else {
      const { data, error } = await sb
        .from('finances')
        .insert({ ...payload, label: form.label!, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Entry added')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('finances').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(f => f.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  const dynamicCategories = useMemo(() =>
    [...new Set(items.map(f => f.category).filter(Boolean) as string[])].sort(),
    [items]
  )

  const total = useMemo(() =>
    items.reduce((sum, f) => sum + (f.amount ?? 0), 0),
    [items]
  )

  const byMonth = useMemo(() => {
    const map = new Map<string, FinanceRow[]>()
    items.forEach(f => {
      const month = (f.entry_date ?? '').slice(0, 7) || 'Unknown'
      const arr = map.get(month) ?? []
      arr.push(f)
      map.set(month, arr)
    })
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [items])

  const fmt = (n: number | null) =>
    n == null ? '—' : `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const heading = defaultPillar
    ? defaultPillar.charAt(0).toUpperCase() + defaultPillar.slice(1) + ' Finances'
    : 'Finances'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{heading}</h1>
          <p className="text-xs text-stone-400 mt-0.5">Total: {fmt(total)}</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Entry
        </Button>
      </div>

      <div className="space-y-6">
        {byMonth.map(([month, entries]) => (
          <section key={month}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {month}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {entries.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {item.category}{item.entry_date ? ` · ${item.entry_date}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${(item.amount ?? 0) < 0 ? 'text-red-500' : 'text-stone-700 dark:text-stone-300'}`}>
                    {fmt(item.amount)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No entries yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Entry' : 'New Entry'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Label"
          value={form.label ?? ''}
          onChange={e => upd('label', e.target.value)}
          placeholder="Description"
        />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          value={form.amount ?? ''}
          onChange={e => upd('amount', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0.00 (negative = expense)"
        />
        <Input
          label="Date"
          type="date"
          value={form.entry_date ?? ''}
          onChange={e => upd('entry_date', e.target.value || undefined)}
        />
        <Select
          label="Category"
          value={form.category ?? ''}
          onChange={e => upd('category', e.target.value)}
          placeholder="— None —"
          options={dynamicCategories.map(c => ({ value: c, label: c }))}
        />
        {/* Only show pillar picker when not scoped to a specific pillar */}
        {!defaultPillar && (
          <Select
            label="Pillar"
            value={form.pillar ?? ''}
            onChange={e => upd('pillar', e.target.value || undefined)}
            placeholder="— None —"
            options={PILLAR_OPTS}
          />
        )}
      </ItemDrawer>
    </div>
  )
}
