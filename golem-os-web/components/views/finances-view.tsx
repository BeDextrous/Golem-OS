'use client'
import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useCrudDrawer } from '@/lib/use-crud-drawer'
import { Button, Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { FinanceRow } from '@/types/entities'

import { todayStr } from '@/lib/utils'
const today = () => todayStr()

const PILLAR_OPTS = [
  { value: 'life',     label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'palette',  label: 'Palette Media' },
]

type Form = Partial<Omit<FinanceRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function FinancesView({
  initialItems,
  defaultPillar,
}: {
  initialItems: FinanceRow[]
  defaultPillar?: string
}) {
  const {
    items, form, upd, drawerOpen, closeDrawer, editItem,
    openNew, openEdit, save: handleSave, remove: handleDelete,
  } = useCrudDrawer<FinanceRow, Form>({
    table: 'finances',
    initialItems,
    newForm: () => ({ entry_date: today(), pillar: defaultPillar ?? undefined }),
    toForm: item => ({
      entry_date: item.entry_date,
      label:      item.label,
      category:   item.category,
      amount:     item.amount,
      pillar:     item.pillar ?? undefined,
    }),
    validate: f => (f.label?.trim() ? null : 'Label is required'),
    toPayload: f => ({
      ...f,
      entry_date: f.entry_date || today(),
      amount:     f.amount ?? 0,
      // Always stamp the pillar when defaultPillar is set
      pillar:     defaultPillar ?? f.pillar,
    }),
    messages: { created: 'Entry added', updated: 'Updated', deleted: 'Deleted' },
  })

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
          <p className="text-xs text-muted mt-0.5">Total: {fmt(total)}</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Entry
        </Button>
      </div>

      <div className="space-y-6">
        {byMonth.map(([month, entries]) => (
          <section key={month}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">
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
                    <p className="text-xs text-muted">
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
        <div className="text-center py-16 text-muted">
          <p className="text-sm">No entries yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={closeDrawer}
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
