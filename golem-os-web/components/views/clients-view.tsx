'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { ClientRow } from '@/types/entities'

const STATUSES = ['Active', 'Prospective', 'Past', 'Archived']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
const STATUS_COLOR: Record<string, string> = {
  'Active':      '#7FA98A',
  'Prospective': '#DA6B51',
  'Past':        '#A8A39A',
  'Archived':    '#A8A39A',
}

type Form = Partial<Omit<ClientRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

function fmt(n: number | null, currency = 'USD') {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function ClientsView({ initialClients }: { initialClients: ClientRow[] }) {
  const [items, setItems]           = useState(initialClients)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<ClientRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ status: 'Prospective', currency: 'USD' })
    setDrawerOpen(true)
  }
  const openEdit = (item: ClientRow) => {
    setEditItem(item)
    setForm({
      name:           item.name,
      company:        item.company        ?? undefined,
      status:         item.status         ?? undefined,
      contract_value: item.contract_value ?? undefined,
      currency:       item.currency       ?? undefined,
      start_date:     item.start_date     ?? undefined,
      end_date:       item.end_date       ?? undefined,
      notes:          item.notes          ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, name: form.name! }
    if (editItem) {
      const { error } = await sb.from('clients').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(c => c.id === editItem.id ? { ...c, ...payload } : c))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('clients').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Client added')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('clients').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(c => c.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  const byStatus = useMemo(() => {
    const order = ['Active', 'Prospective', 'Past', 'Archived']
    const map = new Map<string, ClientRow[]>()
    items.forEach(c => {
      const s = c.status ?? 'Prospective'
      const arr = map.get(s) ?? []
      arr.push(c)
      map.set(s, arr)
    })
    return order.filter(s => map.has(s)).map(s => [s, map.get(s)!] as const)
  }, [items])

  const totalActive = useMemo(() =>
    items
      .filter(c => c.status === 'Active')
      .reduce((s, c) => s + (c.contract_value ?? 0), 0),
    [items]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Clients</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {items.filter(c => c.status === 'Active').length} active
            {totalActive > 0 && ` · ${fmt(totalActive, 'USD')} contracted`}
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Client
        </Button>
      </div>

      <div className="space-y-6">
        {byStatus.map(([status, clients]) => (
          <section key={status}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {status}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {clients.map((client, idx) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                    idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                  }`}
                >
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[client.status ?? 'Prospective'] }}
                  />
                  <Link href={`/dextrous/clients/${client.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      {client.company ?? '—'}
                      {client.start_date && (
                        <span className="ml-1">· since {client.start_date.slice(0, 7)}</span>
                      )}
                    </p>
                  </Link>
                  {client.contract_value != null && (
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 tabular-nums shrink-0">
                      {fmt(client.contract_value, client.currency ?? 'USD')}
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(client)}
                    title="Quick edit"
                    className="p-1.5 rounded-md text-stone-300 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No clients yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Client' : 'New Client'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Name"
          value={form.name ?? ''}
          onChange={e => upd('name', e.target.value)}
          placeholder="Client name"
        />
        <Input
          label="Company"
          value={form.company ?? ''}
          onChange={e => upd('company', e.target.value || undefined)}
          placeholder="Company or org"
        />
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value || undefined)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contract Value"
            type="number"
            step="100"
            value={form.contract_value ?? ''}
            onChange={e => upd('contract_value', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
          <Select
            label="Currency"
            value={form.currency ?? 'USD'}
            onChange={e => upd('currency', e.target.value || undefined)}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date ?? ''}
            onChange={e => upd('start_date', e.target.value || undefined)}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date ?? ''}
            onChange={e => upd('end_date', e.target.value || undefined)}
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => upd('notes', e.target.value || undefined)}
          placeholder="Contract details, context…"
          rows={3}
        />
      </ItemDrawer>
    </div>
  )
}
